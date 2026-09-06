import { createWorker, PSM, type Worker } from "tesseract.js";
import { extractFieldsFromOcr, type OcrLine } from "./parse-ocr";
import { ExtractionError, type ExtractionResult } from "./types";

/** Loading the worker costs several seconds, so it is created once and reused. */
let workerPromise: Promise<Worker> | null = null;

/**
 * Labels are laid out as separate regions, not one block of prose. Without
 * automatic segmentation Tesseract skips the large display type entirely,
 * which on a label is the brand name.
 */
export async function configureWorker(worker: Worker): Promise<void> {
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
}

function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker("eng").then(async (worker) => {
    await configureWorker(worker);
    return worker;
  });
  return workerPromise;
}

export function warmUpOcr(): void {
  void getWorker().catch(() => {
    workerPromise = null;
  });
}

export async function extractWithOcr(
  image: Blob,
): Promise<ExtractionResult> {
  let worker: Worker;

  try {
    worker = await getWorker();
  } catch {
    workerPromise = null;
    throw new ExtractionError(
      "Could not start the text recognizer in this browser.",
      "unavailable",
    );
  }

  const { data } = await worker.recognize(image, {}, { text: true, blocks: true });
  const rawText = data.text ?? "";

  if (rawText.trim().length === 0) {
    throw new ExtractionError(
      "No text could be read from this image. It may be too blurry, too dark, or cropped too tightly.",
      "unreadable",
    );
  }

  const lines: OcrLine[] = (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({
        text: line.text.trim(),
        height: line.bbox.y1 - line.bbox.y0,
      })),
    ),
  );

  return {
    fields: extractFieldsFromOcr(rawText, lines),
    source: "ocr",
    rawText,
    confidence: data.confidence ?? null,
  };
}
