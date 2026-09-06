import { ExtractionError, type ExtractionResult } from "./types";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Transcription, not interpretation. The compliance checks depend on the label's
 * exact wording and casing, so the model is told not to tidy either.
 */
const PROMPT = `You are reading a photograph of an alcohol beverage label for a regulatory check.

Transcribe these fields exactly as printed:
- brandName: the brand or producer name, usually the most prominent text
- classType: the class or type designation, e.g. "Kentucky Straight Bourbon Whiskey"
- alcoholContent: the alcohol statement as printed, e.g. "45% Alc./Vol. (90 Proof)"
- netContents: the volume as printed, e.g. "750 mL"
- governmentWarning: the full health warning paragraph

Rules:
- Reproduce text character for character. Preserve capitalization exactly.
- Do not correct spelling, punctuation, grammar or capitalization, even if wrong.
- Use null for any field that is not present or not legible. Never guess.
- For the warning, also report whether the words "GOVERNMENT WARNING" are bold,
  and whether the text after them is bold. Use null if you cannot tell.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    brandName: { type: "STRING", nullable: true },
    classType: { type: "STRING", nullable: true },
    alcoholContent: { type: "STRING", nullable: true },
    netContents: { type: "STRING", nullable: true },
    governmentWarning: { type: "STRING", nullable: true },
    headingBold: { type: "BOOLEAN", nullable: true },
    remainderBold: { type: "BOOLEAN", nullable: true },
  },
  required: [
    "brandName",
    "classType",
    "alcoholContent",
    "netContents",
    "governmentWarning",
  ],
};

export function buildRequestBody(base64Image: string, mimeType: string) {
  return {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Image } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function nullableBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function parseGeminiResponse(payload: unknown): ExtractionResult {
  const text = (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new ExtractionError(
      "The label reader returned an empty response.",
      "unreadable",
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ExtractionError(
      "The label reader returned a response that could not be understood.",
      "unreadable",
    );
  }

  const headingBold = nullableBoolean(parsed.headingBold);
  const remainderBold = nullableBoolean(parsed.remainderBold);
  const warningFormatting =
    headingBold === undefined && remainderBold === undefined
      ? undefined
      : { headingBold, remainderBold };

  return {
    fields: {
      brandName: nullableString(parsed.brandName),
      classType: nullableString(parsed.classType),
      alcoholContent: nullableString(parsed.alcoholContent),
      netContents: nullableString(parsed.netContents),
      governmentWarning: nullableString(parsed.governmentWarning),
    },
    source: "vision",
    rawText: text,
    confidence: null,
    warningFormatting,
  };
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function extractWithGemini(
  image: Buffer,
  mimeType: string,
  timeoutMs = 20_000,
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ExtractionError("No label reader is configured.", "unavailable");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  let response: Response;

  try {
    response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(buildRequestBody(image.toString("base64"), mimeType)),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ExtractionError("The label reader timed out.", "timeout");
    }
    throw new ExtractionError("Could not reach the label reader.", "unavailable");
  }

  if (response.status === 429) {
    throw new ExtractionError(
      "The label reader has reached its daily request limit.",
      "quota",
    );
  }

  if (!response.ok) {
    throw new ExtractionError(
      `The label reader refused the request (${response.status}).`,
      "unavailable",
    );
  }

  return parseGeminiResponse(await response.json());
}
