import { describe, expect, it } from "vitest";
import {
  compareAlcoholContent,
  compareNetContents,
  compareText,
  parseAlcoholContent,
  parseNetContents,
} from "./comparators";

const brand = (expected: string | null, found: string | null) =>
  compareText("brandName", "Brand name", expected, found);

describe("compareText", () => {
  it("matches a brand differing only in capitalization", () => {
    const result = brand("Stone's Throw", "STONE'S THROW");

    expect(result.status).toBe("match");
    expect(result.detail).toContain("capitalization");
  });

  it("matches across a typographic apostrophe", () => {
    expect(brand("Stone's Throw", "STONE\u2019S THROW").status).toBe("match");
  });

  it("matches across accented characters", () => {
    expect(brand("Chateau Margaux", "Ch\u00e2teau Margaux").status).toBe(
      "match",
    );
  });

  it("flags a near miss for review rather than deciding it", () => {
    const result = brand("Old Tom Distillery", "Old Tom Distillery Co.");
    expect(result.status).toBe("review");
  });

  it("flags a whisky/whiskey spelling variant for review", () => {
    const result = compareText(
      "classType",
      "Class/type",
      "Kentucky Straight Bourbon Whiskey",
      "Kentucky Straight Bourbon Whisky",
    );
    expect(result.status).toBe("review");
  });

  it("rejects an unrelated brand", () => {
    expect(brand("Old Tom Distillery", "Riverbend Spirits").status).toBe(
      "mismatch",
    );
  });

  it("reports an unreadable label field as missing", () => {
    const result = brand("Old Tom Distillery", null);

    expect(result.status).toBe("missing");
    expect(result.expected).toBe("Old Tom Distillery");
  });

  it("reports an empty application field as missing", () => {
    expect(brand("", "Old Tom Distillery").status).toBe("missing");
  });
});

describe("parseAlcoholContent", () => {
  it("reads percentage and proof from a full label statement", () => {
    expect(parseAlcoholContent("45% Alc./Vol. (90 Proof)")).toEqual({
      percent: 45,
      proof: 90,
    });
  });

  it("treats a bare number as a percentage", () => {
    expect(parseAlcoholContent("45")).toEqual({ percent: 45, proof: null });
  });

  it("reads proof stated on its own", () => {
    expect(parseAlcoholContent("90 proof")).toEqual({
      percent: null,
      proof: 90,
    });
  });
});

describe("compareAlcoholContent", () => {
  it("matches a bare application figure against a full label statement", () => {
    const result = compareAlcoholContent("45", "45% Alc./Vol. (90 Proof)");
    expect(result.status).toBe("match");
  });

  it("derives percentage from proof when only proof is on the label", () => {
    expect(compareAlcoholContent("45%", "90 Proof").status).toBe("match");
  });

  it("catches a label whose proof contradicts its percentage", () => {
    const result = compareAlcoholContent("45%", "45% Alc./Vol. (80 Proof)");

    expect(result.status).toBe("mismatch");
    expect(result.detail).toContain("contradicts itself");
  });

  it("rejects a differing alcohol content", () => {
    expect(compareAlcoholContent("45%", "40% Alc./Vol.").status).toBe(
      "mismatch",
    );
  });

  it("handles fractional percentages", () => {
    expect(compareAlcoholContent("12.5%", "12.5% Alc./Vol.").status).toBe(
      "match",
    );
    expect(compareAlcoholContent("12.5%", "13.5% Alc./Vol.").status).toBe(
      "mismatch",
    );
  });

  it("asks for review when no number can be read", () => {
    expect(compareAlcoholContent("45%", "illegible").status).toBe("review");
  });
});

describe("parseNetContents", () => {
  it("converts supported units to millilitres", () => {
    expect(parseNetContents("750 mL")).toBe(750);
    expect(parseNetContents("750ml")).toBe(750);
    expect(parseNetContents("1 L")).toBe(1000);
    expect(parseNetContents("75 cl")).toBe(750);
  });

  it("preserves decimals while tolerating abbreviation dots", () => {
    expect(parseNetContents("1.75 L")).toBe(1750);
    expect(parseNetContents("12 fl. oz.")).toBeCloseTo(354.88, 1);
  });

  it("returns null when no volume is present", () => {
    expect(parseNetContents("illegible")).toBeNull();
  });
});

describe("compareNetContents", () => {
  it("matches the same volume written differently", () => {
    expect(compareNetContents("750 mL", "750ml").status).toBe("match");
  });

  it("matches equivalent volumes in different units", () => {
    const result = compareNetContents("1 L", "1000 mL");

    expect(result.status).toBe("match");
    expect(result.detail).toContain("different units");
  });

  it("rejects a differing volume", () => {
    expect(compareNetContents("750 mL", "700 mL").status).toBe("mismatch");
  });

  it("falls back to text comparison when no volume can be parsed", () => {
    expect(compareNetContents("750 mL", "illegible").status).toBe("mismatch");
  });
});
