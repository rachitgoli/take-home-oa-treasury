import {
  compareAlcoholContent,
  compareNetContents,
  compareText,
} from "./comparators";
import {
  checkGovernmentWarning,
  type WarningFormatting,
} from "./government-warning";
import type {
  ApplicationData,
  LabelExtraction,
  VerificationReport,
  Verdict,
} from "./types";

/**
 * Only a definite discrepancy fails. Unreadable or close values go to an agent:
 * the tool narrows what a human looks at rather than rejecting on its own.
 */
function deriveVerdict(statuses: string[]): Verdict {
  if (statuses.includes("mismatch")) return "fail";
  if (statuses.includes("review") || statuses.includes("missing")) {
    return "review";
  }
  return "pass";
}

export function verify(
  application: ApplicationData,
  extraction: LabelExtraction,
  warningFormatting?: WarningFormatting,
): VerificationReport {
  const checks = [
    compareText(
      "brandName",
      "Brand name",
      application.brandName,
      extraction.brandName,
    ),
    compareText(
      "classType",
      "Class/type",
      application.classType,
      extraction.classType,
    ),
    compareAlcoholContent(
      application.alcoholContent,
      extraction.alcoholContent,
    ),
    compareNetContents(application.netContents, extraction.netContents),
    checkGovernmentWarning(extraction.governmentWarning, warningFormatting),
  ];

  return {
    verdict: deriveVerdict(checks.map((check) => check.status)),
    checks,
  };
}
