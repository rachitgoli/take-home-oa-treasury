"use client";

import { useEffect, useRef, useState } from "react";
import { ApplicationForm } from "@/components/application-form";
import { ImageDrop } from "@/components/image-drop";
import { ReportView } from "@/components/report-view";
import { SamplePicker } from "@/components/sample-picker";
import { extractLabel, type ExtractionStage } from "@/lib/extraction/client";
import { warmUpOcr } from "@/lib/extraction/ocr";
import { ExtractionError, type ExtractionSource } from "@/lib/extraction/types";
import { SAMPLE_APPLICATION } from "@/lib/samples";
import type { ApplicationData, VerificationReport } from "@/lib/verification/types";
import { verify } from "@/lib/verification/verify";

const EMPTY: ApplicationData = {
  brandName: "",
  classType: "",
  alcoholContent: "",
  netContents: "",
};

const STAGE_TEXT: Record<ExtractionStage, string> = {
  preparing: "Preparing the image",
  reading: "Reading the label",
  comparing: "Comparing with the application",
};

const VERDICT_SUMMARY: Record<VerificationReport["verdict"], string> = {
  pass: "Label matches the application",
  review: "Needs your review",
  fail: "Discrepancies found",
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
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(warmUpOcr, []);

  // Move focus to the outcome so it is not missed by anyone using a screen
  // reader or working below the fold.
  useEffect(() => {
    if (outcome || error) resultRef.current?.focus();
  }, [outcome, error]);

  const busy = stage !== null;
  const hasApplicationData = Object.values(application).some(Boolean);
  const ready = file !== null && hasApplicationData;

  const blocker = !file
    ? hasApplicationData
      ? "Add a label image to begin."
      : "Add a label image and the application data to begin."
    : !hasApplicationData
      ? "Now enter the application data to compare the label against."
      : null;

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

  function chooseSample(sample: File) {
    setFile(sample);
    setApplication(SAMPLE_APPLICATION);
    setOutcome(null);
    setError(null);
  }

  function reset() {
    setFile(null);
    setApplication(EMPTY);
    setOutcome(null);
    setError(null);
  }

  const announcement = outcome
    ? `Check complete. ${VERDICT_SUMMARY[outcome.report.verdict]}. ${
        outcome.report.checks.filter((check) => check.status === "match").length
      } of ${outcome.report.checks.length} fields match.`
    : error
      ? `The label could not be read. ${error}`
      : "";

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              1. Label image
            </h2>
            <p className="mb-3 mt-1 text-zinc-600">
              The artwork submitted with the application.
            </p>
            <ImageDrop file={file} onSelect={setFile} disabled={busy} />
          </div>

          {!file && <SamplePicker onChoose={chooseSample} disabled={busy} />}
        </section>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              2. Application data
            </h2>
            <button
              type="button"
              onClick={() => setApplication(SAMPLE_APPLICATION)}
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

        {stage ? (
          <p className="text-zinc-600">{STAGE_TEXT[stage]}…</p>
        ) : (
          blocker && <p className="text-zinc-600">{blocker}</p>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {stage ? `${STAGE_TEXT[stage]}.` : announcement}
      </p>

      <div ref={resultRef} tabIndex={-1} className="focus:outline-none">
        {error && (
          <div className="rounded-lg border-l-4 border-red-600 bg-red-50 p-4 text-red-900">
            <h2 className="text-lg font-semibold">Could not read the label</h2>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {outcome && (
          <ReportView report={outcome.report} source={outcome.source} />
        )}
      </div>
    </div>
  );
}
