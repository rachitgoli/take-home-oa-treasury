"use client";

import { useEffect, useState } from "react";
import { ApplicationForm } from "@/components/application-form";
import { ImageDrop } from "@/components/image-drop";
import { ReportView } from "@/components/report-view";
import { extractLabel, type ExtractionStage } from "@/lib/extraction/client";
import { warmUpOcr } from "@/lib/extraction/ocr";
import { ExtractionError, type ExtractionSource } from "@/lib/extraction/types";
import type { ApplicationData, VerificationReport } from "@/lib/verification/types";
import { verify } from "@/lib/verification/verify";

const EMPTY: ApplicationData = {
  brandName: "",
  classType: "",
  alcoholContent: "",
  netContents: "",
};

const SAMPLE: ApplicationData = {
  brandName: "OLD TOM DISTILLERY",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
};

const STAGE_TEXT: Record<ExtractionStage, string> = {
  preparing: "Preparing the image",
  reading: "Reading the label",
  comparing: "Comparing with the application",
};

interface Outcome {
  report: VerificationReport;
  source: ExtractionSource;
}

export function LabelVerifier() {
  const [file, setFile] = useState<File | null>(null);
  const [application, setApplication] = useState<ApplicationData>(EMPTY);
  const [stage, setStage] = useState<ExtractionStage | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(warmUpOcr, []);

  const busy = stage !== null;
  const ready = file !== null && Object.values(application).some(Boolean);

  async function run() {
    if (!file) return;

    setError(null);
    setOutcome(null);

    try {
      const extraction = await extractLabel(file, setStage);
      setStage("comparing");

      setOutcome({
        report: verify(
          application,
          extraction.fields,
          extraction.warningFormatting,
        ),
        source: extraction.source,
      });
    } catch (caught) {
      setError(
        caught instanceof ExtractionError
          ? caught.message
          : "Something went wrong while reading the label. Try again with a clearer image.",
      );
    } finally {
      setStage(null);
    }
  }

  function reset() {
    setFile(null);
    setApplication(EMPTY);
    setOutcome(null);
    setError(null);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold text-zinc-900">
            1. Label image
          </h2>
          <p className="mb-3 mt-1 text-zinc-600">
            The artwork submitted with the application.
          </p>
          <ImageDrop file={file} onSelect={setFile} disabled={busy} />
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              2. Application data
            </h2>
            <button
              type="button"
              onClick={() => setApplication(SAMPLE)}
              disabled={busy}
              className="text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 disabled:opacity-50"
            >
              Fill with sample values
            </button>
          </div>
          <p className="mb-3 mt-1 text-zinc-600">
            What the applicant recorded on the form.
          </p>
          <ApplicationForm
            value={application}
            onChange={setApplication}
            disabled={busy}
          />
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-6">
        <button
          type="button"
          onClick={run}
          disabled={!ready || busy}
          className="rounded-md bg-blue-700 px-6 py-3 text-lg font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
        >
          {busy ? "Checking…" : "Check this label"}
        </button>

        {(outcome || error) && !busy && (
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-zinc-300 px-4 py-3 font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Start over
          </button>
        )}

        {stage && (
          <p aria-live="polite" className="text-zinc-600">
            {STAGE_TEXT[stage]}…
          </p>
        )}

        {!file && (
          <p className="text-zinc-500">Add a label image to begin.</p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border-l-4 border-red-600 bg-red-50 p-4 text-red-900"
        >
          <h2 className="text-lg font-semibold">Could not read the label</h2>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {outcome && (
        <ReportView report={outcome.report} source={outcome.source} />
      )}
    </div>
  );
}
