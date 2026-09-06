import { extractWithGemini, isGeminiConfigured } from "@/lib/extraction/gemini";
import { ExtractionError } from "@/lib/extraction/types";

const MAX_BYTES = 4 * 1024 * 1024;

const STATUS_BY_CODE: Record<ExtractionError["code"], number> = {
  unreadable: 422,
  quota: 429,
  unavailable: 503,
  timeout: 504,
  unsupported: 415,
};

export async function GET() {
  return Response.json({ available: isGeminiConfigured() });
}

export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return Response.json(
      {
        code: "unavailable",
        message: "No vision provider is configured on the server.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const image = form.get("image");

  if (!(image instanceof File)) {
    return Response.json(
      { code: "unsupported", message: "No image was included in the request." },
      { status: 400 },
    );
  }

  if (!image.type.startsWith("image/")) {
    return Response.json(
      { code: "unsupported", message: "That file is not an image." },
      { status: 415 },
    );
  }

  if (image.size > MAX_BYTES) {
    return Response.json(
      { code: "unsupported", message: "That image is too large to process." },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    return Response.json(await extractWithGemini(buffer, image.type));
  } catch (error) {
    if (error instanceof ExtractionError) {
      return Response.json(
        { code: error.code, message: error.message },
        { status: STATUS_BY_CODE[error.code] },
      );
    }

    return Response.json(
      { code: "unavailable", message: "The label could not be read." },
      { status: 500 },
    );
  }
}
