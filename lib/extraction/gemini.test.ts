import { describe, expect, it } from "vitest";
import { buildRequestBody, parseGeminiResponse } from "./gemini";
import { ExtractionError } from "./types";

function response(fields: Record<string, unknown>) {
  return {
    candidates: [
      { content: { parts: [{ text: JSON.stringify(fields) }] } },
    ],
  };
}

describe("buildRequestBody", () => {
  it("sends the image inline alongside the prompt", () => {
    const body = buildRequestBody("Ym9keQ==", "image/jpeg");
    const parts = body.contents[0].parts;

    expect(parts[0]).toHaveProperty("text");
    expect(parts[1]).toEqual({
      inline_data: { mime_type: "image/jpeg", data: "Ym9keQ==" },
    });
  });

  it("pins temperature to zero and requests structured JSON", () => {
    const body = buildRequestBody("Ym9keQ==", "image/png");

    expect(body.generationConfig.temperature).toBe(0);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema.required).toContain(
      "governmentWarning",
    );
  });
});

describe("parseGeminiResponse", () => {
  it("maps a complete response onto the extraction shape", () => {
    const result = parseGeminiResponse(
      response({
        brandName: "OLD TOM DISTILLERY",
        classType: "Kentucky Straight Bourbon Whiskey",
        alcoholContent: "45% Alc./Vol. (90 Proof)",
        netContents: "750 mL",
        governmentWarning: "GOVERNMENT WARNING: (1) According to...",
        headingBold: true,
        remainderBold: false,
      }),
    );

    expect(result.source).toBe("vision");
    expect(result.fields.brandName).toBe("OLD TOM DISTILLERY");
    expect(result.warningFormatting).toEqual({
      headingBold: true,
      remainderBold: false,
    });
  });

  it("treats absent and blank fields as unread", () => {
    const result = parseGeminiResponse(
      response({
        brandName: "OLD TOM",
        classType: null,
        alcoholContent: "   ",
        netContents: null,
        governmentWarning: null,
      }),
    );

    expect(result.fields.classType).toBeNull();
    expect(result.fields.alcoholContent).toBeNull();
  });

  it("omits formatting entirely when the model could not tell", () => {
    const result = parseGeminiResponse(
      response({
        brandName: "OLD TOM",
        classType: null,
        alcoholContent: null,
        netContents: null,
        governmentWarning: null,
      }),
    );

    expect(result.warningFormatting).toBeUndefined();
  });

  it("rejects an empty response", () => {
    expect(() => parseGeminiResponse({ candidates: [] })).toThrow(
      ExtractionError,
    );
  });

  it("rejects a response that is not valid JSON", () => {
    const malformed = {
      candidates: [{ content: { parts: [{ text: "not json" }] } }],
    };

    expect(() => parseGeminiResponse(malformed)).toThrow(ExtractionError);
  });
});
