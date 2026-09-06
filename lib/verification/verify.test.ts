import { describe, expect, it } from "vitest";
import { GOVERNMENT_WARNING_TEXT } from "./government-warning";
import type { ApplicationData, LabelExtraction } from "./types";
import { verify } from "./verify";

const application: ApplicationData = {
  brandName: "OLD TOM DISTILLERY",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
};

const cleanLabel: LabelExtraction = {
  brandName: "OLD TOM DISTILLERY",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  governmentWarning: GOVERNMENT_WARNING_TEXT,
};

describe("verify", () => {
  it("passes a label that agrees with the application", () => {
    const report = verify(application, cleanLabel);

    expect(report.verdict).toBe("pass");
    expect(report.checks).toHaveLength(5);
    expect(report.checks.every((check) => check.status === "match")).toBe(true);
  });

  it("fails on a single definite discrepancy", () => {
    const report = verify(application, {
      ...cleanLabel,
      alcoholContent: "40% Alc./Vol. (80 Proof)",
    });

    expect(report.verdict).toBe("fail");
  });

  it("asks for review rather than failing on a near miss", () => {
    const report = verify(application, {
      ...cleanLabel,
      brandName: "OLD TOM DISTILLERY CO.",
    });

    expect(report.verdict).toBe("review");
  });

  it("asks for review when a field could not be read", () => {
    const report = verify(application, { ...cleanLabel, netContents: null });

    expect(report.verdict).toBe("review");
  });

  it("fails a label missing the government warning", () => {
    const report = verify(application, {
      ...cleanLabel,
      governmentWarning: null,
    });

    expect(report.verdict).toBe("review");
    expect(
      report.checks.find((check) => check.fieldId === "governmentWarning")
        ?.status,
    ).toBe("missing");
  });

  it("reports every field independently rather than stopping at the first problem", () => {
    const report = verify(application, {
      brandName: "RIVERBEND SPIRITS",
      classType: null,
      alcoholContent: "40%",
      netContents: "700 mL",
      governmentWarning: GOVERNMENT_WARNING_TEXT.replace(
        "GOVERNMENT WARNING",
        "Government Warning",
      ),
    });

    expect(report.verdict).toBe("fail");
    expect(report.checks.map((check) => check.status)).toEqual([
      "mismatch",
      "missing",
      "mismatch",
      "mismatch",
      "mismatch",
    ]);
  });
});
