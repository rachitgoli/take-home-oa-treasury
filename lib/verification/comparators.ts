import {
  collapseWhitespace,
  normalizeForComparison,
  normalizeNumeric,
  similarity,
} from "./normalize";
import type { FieldCheck, FieldId } from "./types";

/**
 * Above this similarity a difference is treated as probably cosmetic — OCR
 * noise or a spelling variant such as whisky/whiskey — and routed to an agent
 * rather than decided by the tool.
 */
const REVIEW_THRESHOLD = 0.85;

/** Millilitres per supported unit of measure. */
const VOLUME_UNITS: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  millilitre: 1,
  cl: 10,
  centiliter: 10,
  centilitre: 10,
  l: 1000,
  liter: 1000,
  litre: 1000,
  floz: 29.5735,
  fluidounce: 29.5735,
};

function build(
  fieldId: FieldId,
  label: string,
  status: FieldCheck["status"],
  expected: string | null,
  found: string | null,
  detail: string,
  citation?: string,
): FieldCheck {
  return { fieldId, label, status, expected, found, detail, citation };
}

function blank(value: string | null | undefined): boolean {
  return !value || collapseWhitespace(value).length === 0;
}

/**
 * Compares free text by meaning rather than by characters: values equal after
 * normalization pass outright, close values are flagged for review, and the
 * rest are mismatches.
 */
export function compareText(
  fieldId: FieldId,
  label: string,
  expected: string | null,
  found: string | null,
): FieldCheck {
  if (blank(expected)) {
    return build(
      fieldId,
      label,
      "missing",
      null,
      found ?? null,
      `No ${label.toLowerCase()} was recorded in the application, so there is nothing to compare against.`,
    );
  }

  if (blank(found)) {
    return build(
      fieldId,
      label,
      "missing",
      expected!,
      null,
      `No ${label.toLowerCase()} could be read from the label.`,
    );
  }

  const normalizedExpected = normalizeForComparison(expected!);
  const normalizedFound = normalizeForComparison(found!);

  if (normalizedExpected === normalizedFound) {
    const detail =
      collapseWhitespace(expected!) === collapseWhitespace(found!)
        ? "Matches the application exactly."
        : "Matches the application, differing only in capitalization or punctuation.";
    return build(fieldId, label, "match", expected!, found!, detail);
  }

  const score = similarity(normalizedExpected, normalizedFound);

  if (score >= REVIEW_THRESHOLD) {
    return build(
      fieldId,
      label,
      "review",
      expected!,
      found!,
      `Close but not identical (${Math.round(score * 100)}% similar). Confirm whether this is the same ${label.toLowerCase()}.`,
    );
  }

  return build(
    fieldId,
    label,
    "mismatch",
    expected!,
    found!,
    `Does not match the application (${Math.round(score * 100)}% similar).`,
  );
}

export interface ParsedAlcoholContent {
  percent: number | null;
  proof: number | null;
}

export function parseAlcoholContent(value: string): ParsedAlcoholContent {
  const normalized = normalizeNumeric(value);
  const proofMatch = normalized.match(/(\d+(?:\.\d+)?)\s*proof/);
  const percentMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%/);

  let percent = percentMatch ? Number(percentMatch[1]) : null;
  const proof = proofMatch ? Number(proofMatch[1]) : null;

  if (percent === null && proof === null) {
    const bare = normalized.match(/(\d+(?:\.\d+)?)/);
    percent = bare ? Number(bare[1]) : null;
  }

  return { percent, proof };
}

/**
 * Compares the alcohol figure numerically, so "45% Alc./Vol. (90 Proof)" and a
 * recorded "45" are recognized as the same value, and additionally checks that
 * a stated proof agrees with the stated percentage.
 */
export function compareAlcoholContent(
  expected: string | null,
  found: string | null,
): FieldCheck {
  const label = "Alcohol content";
  const fieldId: FieldId = "alcoholContent";

  if (blank(expected)) {
    return build(
      fieldId,
      label,
      "missing",
      null,
      found ?? null,
      "No alcohol content was recorded in the application, so there is nothing to compare against.",
    );
  }

  if (blank(found)) {
    return build(
      fieldId,
      label,
      "missing",
      expected!,
      null,
      "No alcohol content could be read from the label.",
    );
  }

  const expectedParsed = parseAlcoholContent(expected!);
  const foundParsed = parseAlcoholContent(found!);
  const expectedPercent =
    expectedParsed.percent ??
    (expectedParsed.proof !== null ? expectedParsed.proof / 2 : null);
  const foundPercent =
    foundParsed.percent ??
    (foundParsed.proof !== null ? foundParsed.proof / 2 : null);

  if (expectedPercent === null || foundPercent === null) {
    return build(
      fieldId,
      label,
      "review",
      expected!,
      found!,
      "Could not read a numeric alcohol content from one of these values. Compare them by eye.",
    );
  }

  if (
    foundParsed.percent !== null &&
    foundParsed.proof !== null &&
    Math.abs(foundParsed.proof - foundParsed.percent * 2) > 0.1
  ) {
    return build(
      fieldId,
      label,
      "mismatch",
      expected!,
      found!,
      `The label contradicts itself: ${foundParsed.percent}% alcohol by volume is ${foundParsed.percent * 2} proof, but the label states ${foundParsed.proof} proof.`,
    );
  }

  if (Math.abs(expectedPercent - foundPercent) > 0.05) {
    return build(
      fieldId,
      label,
      "mismatch",
      expected!,
      found!,
      `The label states ${foundPercent}% alcohol by volume but the application records ${expectedPercent}%.`,
    );
  }

  return build(
    fieldId,
    label,
    "match",
    expected!,
    found!,
    `Both state ${expectedPercent}% alcohol by volume.`,
  );
}

export function parseNetContents(value: string): number | null {
  const normalized = normalizeNumeric(value).replace(/\.(?!\d)/g, "");
  const match = normalized.match(
    /(\d+(?:\.\d+)?)\s*(ml|milliliters?|millilitres?|cl|centiliters?|centilitres?|l|liters?|litres?|fl\s*oz|fluid\s*ounces?)\b/,
  );

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].replace(/\s+/g, "").replace(/s$/, "");
  const factor = VOLUME_UNITS[unit];

  return factor === undefined ? null : amount * factor;
}

/**
 * Compares net contents by volume so equivalent expressions in different units
 * — "1 L" and "1000 mL" — are treated as equal.
 */
export function compareNetContents(
  expected: string | null,
  found: string | null,
): FieldCheck {
  const label = "Net contents";
  const fieldId: FieldId = "netContents";

  if (blank(expected)) {
    return build(
      fieldId,
      label,
      "missing",
      null,
      found ?? null,
      "No net contents were recorded in the application, so there is nothing to compare against.",
    );
  }

  if (blank(found)) {
    return build(
      fieldId,
      label,
      "missing",
      expected!,
      null,
      "No net contents could be read from the label.",
    );
  }

  const expectedMl = parseNetContents(expected!);
  const foundMl = parseNetContents(found!);

  if (expectedMl === null || foundMl === null) {
    return compareText(fieldId, label, expected, found);
  }

  if (Math.abs(expectedMl - foundMl) > 0.5) {
    return build(
      fieldId,
      label,
      "mismatch",
      expected!,
      found!,
      `The label states ${found} but the application records ${expected}.`,
    );
  }

  const sameWording =
    normalizeForComparison(expected!) === normalizeForComparison(found!);

  return build(
    fieldId,
    label,
    "match",
    expected!,
    found!,
    sameWording
      ? "Matches the application exactly."
      : `Matches the application: both are ${expectedMl} mL, expressed in different units.`,
  );
}
