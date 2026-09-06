import {
  collapseWhitespace,
  firstWordDifference,
  normalizePreservingCase,
} from "./normalize";
import type { FieldCheck } from "./types";

/** Verbatim text mandated by 27 CFR 16.21. */
export const GOVERNMENT_WARNING_TEXT =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not " +
  "drink alcoholic beverages during pregnancy because of the risk of birth " +
  "defects. (2) Consumption of alcoholic beverages impairs your ability to " +
  "drive a car or operate machinery, and may cause health problems.";

const REQUIRED_HEADING = "GOVERNMENT WARNING";

/**
 * Typography that 27 CFR 16.22(a)(2) governs but plain text cannot express.
 * Supplied by the extraction stage when it can report on rendering.
 */
export interface WarningFormatting {
  headingBold?: boolean;
  remainderBold?: boolean;
}

function stripPunctuation(value: string): string {
  return collapseWhitespace(value.replace(/[^\p{L}\p{N}\s]/gu, " "));
}

function check(
  status: FieldCheck["status"],
  detail: string,
  found: string | null,
  citation?: string,
): FieldCheck {
  return {
    fieldId: "governmentWarning",
    label: "Government warning",
    status,
    expected: GOVERNMENT_WARNING_TEXT,
    found,
    detail,
    citation,
  };
}

/**
 * Held to the statutory text rather than to a similarity threshold. Altered
 * wording, a re-cased heading, or a missing statement are each independently
 * grounds for rejection, so this check reports the specific defect instead of
 * a score.
 *
 * Case is enforced only on the heading: 27 CFR 16.22(a)(2) mandates capitals
 * for the first two words and says nothing about the case of the remainder.
 */
export function checkGovernmentWarning(
  found: string | null,
  formatting?: WarningFormatting,
): FieldCheck {
  if (!found || collapseWhitespace(found).length === 0) {
    return check(
      "missing",
      "No government warning was found on the label. The statement is mandatory on all alcohol beverages.",
      null,
      "27 CFR 16.21",
    );
  }

  const text = normalizePreservingCase(found);
  const heading = text.match(/government\s+warning/i);

  if (!heading) {
    return check(
      "mismatch",
      `The required "${REQUIRED_HEADING}" heading does not appear in the warning text.`,
      text,
      "27 CFR 16.21",
    );
  }

  if (collapseWhitespace(heading[0]) !== REQUIRED_HEADING) {
    return check(
      "mismatch",
      `The heading reads "${collapseWhitespace(heading[0])}" but must appear in capital letters as "${REQUIRED_HEADING}".`,
      text,
      "27 CFR 16.22(a)(2)",
    );
  }

  const canonical = GOVERNMENT_WARNING_TEXT.toLowerCase();
  const candidate = text.toLowerCase();

  if (candidate !== canonical) {
    const strippedCanonical = stripPunctuation(canonical);
    const strippedCandidate = stripPunctuation(candidate);

    if (strippedCandidate !== strippedCanonical) {
      const difference = firstWordDifference(
        strippedCanonical,
        strippedCandidate,
      );
      const detail = difference
        ? difference.actual === null
          ? `The warning text is cut short. It should continue "${difference.expected}" at word ${difference.index + 1}.`
          : `The warning wording differs from the statutory text. At word ${difference.index + 1} the label reads "${difference.actual}" where the statute requires "${difference.expected}".`
        : "The warning wording differs from the statutory text.";

      return check("mismatch", detail, text, "27 CFR 16.21");
    }

    return check(
      "review",
      "The wording matches the statutory text but the punctuation differs. This may be an artifact of reading the image rather than a defect on the label.",
      text,
      "27 CFR 16.21",
    );
  }

  if (formatting?.headingBold === false) {
    return check(
      "mismatch",
      `The "${REQUIRED_HEADING}" heading must appear in bold type.`,
      text,
      "27 CFR 16.22(a)(2)",
    );
  }

  if (formatting?.remainderBold === true) {
    return check(
      "mismatch",
      "Only the heading may be bold; the remainder of the warning must not appear in bold type.",
      text,
      "27 CFR 16.22(a)(2)",
    );
  }

  return check(
    "match",
    "The warning matches the statutory text exactly.",
    text,
    "27 CFR 16.21",
  );
}
