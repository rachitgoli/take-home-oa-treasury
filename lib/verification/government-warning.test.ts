import { describe, expect, it } from "vitest";
import {
  GOVERNMENT_WARNING_TEXT,
  checkGovernmentWarning,
} from "./government-warning";

describe("checkGovernmentWarning", () => {
  it("accepts the statutory text verbatim", () => {
    const result = checkGovernmentWarning(GOVERNMENT_WARNING_TEXT);
    expect(result.status).toBe("match");
  });

  it("accepts the text when line breaks split it across the label", () => {
    const wrapped = GOVERNMENT_WARNING_TEXT.replace(" (2)", "\n\n(2)");
    expect(checkGovernmentWarning(wrapped).status).toBe("match");
  });

  it("accepts irregular spacing from reading the image", () => {
    const spaced = `  ${GOVERNMENT_WARNING_TEXT.replace(/ /g, "  ")}  `;
    expect(checkGovernmentWarning(spaced).status).toBe("match");
  });

  it("rejects a title-case heading", () => {
    const titleCase = GOVERNMENT_WARNING_TEXT.replace(
      "GOVERNMENT WARNING",
      "Government Warning",
    );
    const result = checkGovernmentWarning(titleCase);

    expect(result.status).toBe("mismatch");
    expect(result.citation).toBe("27 CFR 16.22(a)(2)");
    expect(result.detail).toContain("capital letters");
  });

  it("allows the remainder in any case, since only the heading is mandated", () => {
    const lowerBody = GOVERNMENT_WARNING_TEXT.replace(
      "According to the Surgeon General",
      "ACCORDING TO THE SURGEON GENERAL",
    );
    expect(checkGovernmentWarning(lowerBody).status).toBe("match");
  });

  it("reports the specific word when the wording is altered", () => {
    const altered = GOVERNMENT_WARNING_TEXT.replace(
      "health problems",
      "health issues",
    );
    const result = checkGovernmentWarning(altered);

    expect(result.status).toBe("mismatch");
    expect(result.detail).toContain("issues");
    expect(result.detail).toContain("problems");
  });

  it("flags a warning that omits the second clause", () => {
    const firstClauseOnly = GOVERNMENT_WARNING_TEXT.split(" (2)")[0];
    const result = checkGovernmentWarning(firstClauseOnly);

    expect(result.status).toBe("mismatch");
    expect(result.detail).toContain("cut short");
  });

  it("flags wording cut off mid-sentence", () => {
    const result = checkGovernmentWarning(
      GOVERNMENT_WARNING_TEXT.slice(0, 120),
    );
    expect(result.status).toBe("mismatch");
  });

  it("treats a punctuation-only difference as needing review", () => {
    const noComma = GOVERNMENT_WARNING_TEXT.replace(
      "Surgeon General,",
      "Surgeon General",
    );
    const result = checkGovernmentWarning(noComma);

    expect(result.status).toBe("review");
    expect(result.detail).toContain("punctuation");
  });

  it("reports a missing warning as missing rather than as a mismatch", () => {
    expect(checkGovernmentWarning(null).status).toBe("missing");
    expect(checkGovernmentWarning("   ").status).toBe("missing");
  });

  it("rejects text with no heading at all", () => {
    const headless = GOVERNMENT_WARNING_TEXT.replace(
      "GOVERNMENT WARNING: ",
      "",
    );
    const result = checkGovernmentWarning(headless);

    expect(result.status).toBe("mismatch");
    expect(result.detail).toContain("heading");
  });

  it("rejects a heading that is not bold when formatting is known", () => {
    const result = checkGovernmentWarning(GOVERNMENT_WARNING_TEXT, {
      headingBold: false,
    });

    expect(result.status).toBe("mismatch");
    expect(result.detail).toContain("bold");
    expect(result.citation).toBe("27 CFR 16.22(a)(2)");
  });

  it("rejects a bold remainder when formatting is known", () => {
    const result = checkGovernmentWarning(GOVERNMENT_WARNING_TEXT, {
      headingBold: true,
      remainderBold: true,
    });

    expect(result.status).toBe("mismatch");
    expect(result.detail).toContain("must not appear in bold");
  });

  it("passes when formatting is unknown, rather than assuming a defect", () => {
    expect(checkGovernmentWarning(GOVERNMENT_WARNING_TEXT, {}).status).toBe(
      "match",
    );
  });
});
