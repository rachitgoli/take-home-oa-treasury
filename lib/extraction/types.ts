import type { WarningFormatting } from "@/lib/verification/government-warning";
import type { LabelExtraction } from "@/lib/verification/types";

export type ExtractionSource = "vision" | "ocr";

export interface ExtractionResult {
  fields: LabelExtraction;
  source: ExtractionSource;
  rawText: string;
  /** 0-100 where reported, null when the provider gives no score. */
  confidence: number | null;
  warningFormatting?: WarningFormatting;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "unreadable"
      | "quota"
      | "unavailable"
      | "timeout"
      | "unsupported",
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}
