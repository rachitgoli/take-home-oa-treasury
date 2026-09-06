import { describe, expect, it } from "vitest";
import { GOVERNMENT_WARNING_TEXT } from "@/lib/verification/government-warning";
import { extractFieldsFromOcr } from "./parse-ocr";

const label = [
  "OLD TOM DISTILLERY",
  "Kentucky Straight Bourbon Whiskey",
  "45% Alc./Vol. (90 Proof)",
  "750 mL",
  GOVERNMENT_WARNING_TEXT,
].join("\n");

describe("extractFieldsFromOcr", () => {
  it("pulls each field out of a well-formed label", () => {
    const fields = extractFieldsFromOcr(label);

    expect(fields.brandName).toBe("OLD TOM DISTILLERY");
    expect(fields.classType).toBe("Kentucky Straight Bourbon Whiskey");
    expect(fields.alcoholContent).toBe("45% Alc./Vol. (90 Proof)");
    expect(fields.netContents).toBe("750 mL");
    expect(fields.governmentWarning).toBe(GOVERNMENT_WARNING_TEXT);
  });

  it("keeps the warning's original casing so the caps rule can be checked", () => {
    const miscased = label.replace("GOVERNMENT WARNING", "Government Warning");
    const fields = extractFieldsFromOcr(miscased);

    expect(fields.governmentWarning?.startsWith("Government Warning")).toBe(
      true,
    );
  });

  it("uses the tallest line as the brand when layout is available", () => {
    const reordered = [
      "Kentucky Straight Bourbon Whiskey",
      "OLD TOM DISTILLERY",
      "45% Alc./Vol.",
      "750 mL",
    ].join("\n");

    const fields = extractFieldsFromOcr(reordered, [
      { text: "Kentucky Straight Bourbon Whiskey", height: 14 },
      { text: "OLD TOM DISTILLERY", height: 48 },
    ]);

    expect(fields.brandName).toBe("OLD TOM DISTILLERY");
    expect(fields.classType).toBe("Kentucky Straight Bourbon Whiskey");
  });

  it("prefers a beverage class keyword over reading order", () => {
    const fields = extractFieldsFromOcr(
      ["RIVERBEND", "Est. 1904", "Straight Rye Whiskey", "40% Alc./Vol."].join(
        "\n",
      ),
    );

    expect(fields.classType).toBe("Straight Rye Whiskey");
  });

  it("reads proof-only alcohol statements", () => {
    const fields = extractFieldsFromOcr(
      ["OLD TOM", "Bourbon", "90 Proof", "750 mL"].join("\n"),
    );

    expect(fields.alcoholContent).toBe("90 Proof");
  });

  it("does not mistake the alcohol line for net contents", () => {
    const fields = extractFieldsFromOcr(
      ["OLD TOM", "Bourbon", "45% Alc./Vol.", "1 L"].join("\n"),
    );

    expect(fields.alcoholContent).toBe("45% Alc./Vol.");
    expect(fields.netContents).toBe("1 L");
  });

  it("returns nulls rather than guesses when the warning is absent", () => {
    const fields = extractFieldsFromOcr(["OLD TOM DISTILLERY"].join("\n"));

    expect(fields.governmentWarning).toBeNull();
    expect(fields.netContents).toBeNull();
    expect(fields.alcoholContent).toBeNull();
  });

  it("handles an empty read", () => {
    const fields = extractFieldsFromOcr("");

    expect(fields).toEqual({
      brandName: null,
      classType: null,
      alcoholContent: null,
      netContents: null,
      governmentWarning: null,
    });
  });
});
