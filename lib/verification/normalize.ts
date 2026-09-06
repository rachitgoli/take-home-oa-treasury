const SMART_QUOTES = /[\u2018\u2019\u201A\u201B\u2032]/g;
const SMART_DOUBLE_QUOTES = /[\u201C\u201D\u201E\u201F\u2033]/g;
const DASHES = /[\u2010-\u2015\u2212]/g;

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function fold(value: string): string {
  return value
    .replace(SMART_QUOTES, "'")
    .replace(SMART_DOUBLE_QUOTES, '"')
    .replace(DASHES, "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Folds away differences that carry no compliance meaning: character variants
 * a vision model may return in place of ASCII, diacritics, casing, and
 * punctuation. Applied to both sides of a comparison so that, for example,
 * "STONE'S THROW" and "Stone's Throw" reduce to the same string.
 */
export function normalizeForComparison(value: string): string {
  return collapseWhitespace(fold(value).replace(/[^a-z0-9\s]/g, " "));
}

/**
 * As `normalizeForComparison`, but retains the characters that carry numeric
 * meaning, so decimal points and percent signs survive for parsing.
 */
export function normalizeNumeric(value: string): string {
  return collapseWhitespace(fold(value).replace(/[^a-z0-9%.\s]/g, " "));
}

/** Standardizes character variants and whitespace but preserves case and wording. */
export function normalizePreservingCase(value: string): string {
  return collapseWhitespace(
    value
      .replace(SMART_QUOTES, "'")
      .replace(SMART_DOUBLE_QUOTES, '"')
      .replace(DASHES, "-"),
  );
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
    }
    [previous, current] = [current, previous];
  }

  return previous[b.length];
}

/** Edit distance as a 0–1 score, where 1 is identical. */
export function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const longest = Math.max(a.length, b.length);
  return (longest - levenshtein(a, b)) / longest;
}

/**
 * Locates the first word-level divergence between two strings, so a mismatch
 * can be reported as the specific wording that differs rather than as two
 * paragraphs the agent has to compare by eye.
 */
export function firstWordDifference(
  expected: string,
  actual: string,
): { index: number; expected: string | null; actual: string | null } | null {
  const expectedWords = collapseWhitespace(expected).split(" ");
  const actualWords = collapseWhitespace(actual).split(" ");
  const length = Math.max(expectedWords.length, actualWords.length);

  for (let i = 0; i < length; i++) {
    if (expectedWords[i] !== actualWords[i]) {
      return {
        index: i,
        expected: expectedWords[i] ?? null,
        actual: actualWords[i] ?? null,
      };
    }
  }

  return null;
}
