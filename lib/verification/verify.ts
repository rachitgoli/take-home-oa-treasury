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
 * A mismatch is a definite discrepancy, so it fails the application outright.
 * Anything unreadable or merely close is routed to an agent instead: the tool
 * exists to narrow what a human looks at, not to reject on its own authority.
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
