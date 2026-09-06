import { downscaleImage } from "./downscale";
import { extractWithOcr } from "./ocr";
import { ExtractionError, type ExtractionResult } from "./types";

export type ExtractionStage = "preparing" | "reading" | "comparing";

let visionAvailable: Promise<boolean> | null = null;

function checkVisionAvailability(): Promise<boolean> {
  visionAvailable ??= fetch("/api/extract")
    .then((response) => (response.ok ? response.json() : { available: false }))
    .then((body: { available?: boolean }) => Boolean(body.available))
    .catch(() => false);

  return visionAvailable;
}

async function extractWithVision(image: Blob): Promise<ExtractionResult> {
  const form = new FormData();
  form.append("image", image, "label.jpg");

  const response = await fetch("/api/extract", { method: "POST", body: form });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: ExtractionError["code"];
      message?: string;
    } | null;

    throw new ExtractionError(
      body?.message ?? "The label could not be read.",
      body?.code ?? "unavailable",
    );
  }

  return response.json();
}

/**
 * Prefers the server-side vision model and falls back to in-browser OCR, so the
 * app keeps working when no key is configured or the daily quota is spent.
 */
export async function extractLabel(
  file: File,
  onStage?: (stage: ExtractionStage) => void,
): Promise<ExtractionResult> {
  onStage?.("preparing");
  const image = await downscaleImage(file);

  onStage?.("reading");

  if (await checkVisionAvailability()) {
    try {
      return await extractWithVision(image);
    } catch (error) {
      const recoverable =
        error instanceof ExtractionError &&
        (error.code === "quota" ||
          error.code === "unavailable" ||
          error.code === "timeout");

      if (!recoverable) throw error;
    }
  }

  return extractWithOcr(image);
}
