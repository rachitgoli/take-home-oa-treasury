import type { LabelExtraction } from "@/lib/verification/types";

export interface OcrLine {
  text: string;
  /** Glyph height in pixels; used to find the most prominent text. */
  height: number;
}

const WARNING_START = /government\s*warning/i;

const ALCOHOL_LINE =
  /\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*proof|alc\.?\s*\/?\s*vol|alcohol\s+by\s+volume|\babv\b/i;

const VOLUME_LINE =
  /\d+(?:\.\d+)?\s*(?:ml\b|milliliters?\b|millilitres?\b|cl\b|centiliters?\b|centilitres?\b|l\b|liters?\b|litres?\b|fl\.?\s*oz\b|fluid\s*ounces?\b)/i;

const CLASS_KEYWORDS = [
  "whiskey", "whisky", "bourbon", "rye", "scotch", "vodka", "gin", "rum",
  "tequila", "mezcal", "brandy", "cognac", "liqueur", "cordial", "wine",
  "chardonnay", "cabernet", "merlot", "pinot", "riesling", "sauvignon",
  "zinfandel", "champagne", "prosecco", "port", "sherry", "vermouth", "beer",
  "ale", "lager", "stout", "porter", "pilsner", "ipa", "cider", "mead",
  "sake", "spirits", "malt",
];

function looksLikeClassType(text: string): boolean {
  const lower = text.toLowerCase();
  return CLASS_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Splits raw OCR output into TTB fields.
 *
 * The warning is found by its heading and taken verbatim, since the compliance
 * check depends on its exact casing. Alcohol content and net contents are found
 * by pattern. Brand and class/type have no distinguishing pattern, so they fall
 * back to layout: the tallest remaining line is treated as the brand.
 */
export function extractFieldsFromOcr(
  rawText: string,
  lines?: OcrLine[],
): LabelExtraction {
  const warningMatch = rawText.match(WARNING_START);
  const governmentWarning = warningMatch
    ? rawText.slice(warningMatch.index!).trim()
    : null;

  const bodyText = warningMatch
    ? rawText.slice(0, warningMatch.index!)
    : rawText;

  const bodyLines = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const alcoholContent = bodyLines.find((line) => ALCOHOL_LINE.test(line));
  const netContents = bodyLines.find(
    (line) => line !== alcoholContent && VOLUME_LINE.test(line),
  );

  const remaining = bodyLines.filter(
    (line) => line !== alcoholContent && line !== netContents,
  );

  const heights = new Map(
    (lines ?? []).map((line) => [line.text.trim(), line.height]),
  );
  const heightOf = (text: string) => heights.get(text) ?? 0;

  const byProminence = [...remaining].sort(
    (a, b) => heightOf(b) - heightOf(a),
  );
  const brandName = byProminence[0] ?? null;

  const others = remaining.filter((line) => line !== brandName);
  const classType =
    others.find((line) => looksLikeClassType(line)) ?? others[0] ?? null;

  return {
    brandName,
    classType,
    alcoholContent: alcoholContent ?? null,
    netContents: netContents ?? null,
    governmentWarning,
  };
}
