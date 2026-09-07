import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createWorker, type Worker } from "tesseract.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_LABELS } from "@/lib/samples";
import { verify } from "@/lib/verification/verify";
import { configureWorker } from "./ocr";
import { extractFieldsFromOcr, type OcrLine } from "./parse-ocr";

const SAMPLES = join(process.cwd(), "public", "samples");

let worker: Worker;

async function read(file: string) {
  const image = await readFile(join(SAMPLES, file));
  const { data } = await worker.recognize(image, {}, { text: true, blocks: true });

  const lines: OcrLine[] = (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({
        text: line.text.trim(),
        height: line.bbox.y1 - line.bbox.y0,
      })),
    ),
  );

  return extractFieldsFromOcr(data.text ?? "", lines);
}

/** Each sample carries its own application record, so pair them by filename. */
async function check(file: string) {
  const sample = SAMPLE_LABELS.find((entry) => entry.file === file);
  if (!sample) throw new Error(`No sample is registered for ${file}`);

  return verify(sample.application, await read(file));
}

describe("OCR over the sample labels", () => {
  beforeAll(async () => {
    worker = await createWorker("eng");
    await configureWorker(worker);
  }, 120_000);

  afterAll(async () => {
    await worker?.terminate();
  });

  it("passes a fully compliant label", async () => {
    const report = await check("compliant.png");

    expect(
      report.checks.map((check) => `${check.fieldId}:${check.status}`),
    ).toEqual([
      "brandName:match",
      "classType:match",
      "alcoholContent:match",
      "netContents:match",
      "governmentWarning:match",
    ]);
    expect(report.verdict).toBe("pass");
  }, 60_000);

  it("catches a title-case warning heading", async () => {
    const report = await check("warning-title-case.png");
    const warning = report.checks.at(-1)!;

    expect(warning.status).toBe("mismatch");
    expect(warning.citation).toBe("27 CFR 16.22(a)(2)");
  }, 60_000);

  it("accepts a label in litres against a record in millilitres", async () => {
    const report = await check("warning-title-case.png");

    expect(
      report.checks.find((check) => check.fieldId === "netContents")?.status,
    ).toBe("match");
  }, 60_000);

  it("catches an alcohol content that differs from the application", async () => {
    const report = await check("alcohol-mismatch.png");

    expect(report.verdict).toBe("fail");
    expect(
      report.checks.find((check) => check.fieldId === "alcoholContent")?.status,
    ).toBe("mismatch");
  }, 60_000);

  it("catches a label whose proof contradicts its percentage", async () => {
    const report = await check("proof-contradiction.png");
    const alcohol = report.checks.find(
      (check) => check.fieldId === "alcoholContent",
    )!;

    expect(alcohol.status).toBe("mismatch");
    expect(alcohol.detail).toContain("contradicts itself");
  }, 60_000);

  it("reports a label with no warning at all", async () => {
    const report = await check("missing-warning.png");

    expect(report.checks.at(-1)!.status).toBe("missing");
  }, 60_000);

  it("passes a brand that differs only in capitalization", async () => {
    const report = await check("brand-case.png");

    expect(
      report.checks.find((check) => check.fieldId === "brandName")?.status,
    ).toBe("match");
  }, 60_000);
});
