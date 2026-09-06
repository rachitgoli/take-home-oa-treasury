"use client";

import type { ExtractionSource } from "@/lib/extraction/types";
import type {
  CheckStatus,
  FieldCheck,
  VerificationReport,
} from "@/lib/verification/types";

const VERDICT = {
  pass: {
    title: "Label matches the application",
    body: "Every field agrees. No action needed.",
    className: "border-green-600 bg-green-50 text-green-900",
  },
  review: {
    title: "Needs your review",
    body: "Some fields could not be confirmed automatically.",
    className: "border-amber-600 bg-amber-50 text-amber-900",
  },
  fail: {
    title: "Discrepancies found",
    body: "One or more fields do not match the application.",
    className: "border-red-600 bg-red-50 text-red-900",
  },
} as const;

const STATUS: Record<CheckStatus, { label: string; className: string }> = {
  match: { label: "Match", className: "bg-green-100 text-green-900" },
  review: { label: "Review", className: "bg-amber-100 text-amber-900" },
  mismatch: { label: "Mismatch", className: "bg-red-100 text-red-900" },
  missing: { label: "Not read", className: "bg-zinc-200 text-zinc-800" },
};

function Value({ label, text }: { label: string; text: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 break-words text-zinc-900">
        {text ?? <span className="text-zinc-400">Not found</span>}
      </div>
    </div>
  );
}

function CheckCard({ check }: { check: FieldCheck }) {
  const status = STATUS[check.status];

  return (
    <li className="rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-medium text-zinc-900">{check.label}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <p className="mt-2 text-zinc-700">{check.detail}</p>

      {check.citation && (
        <p className="mt-1 text-sm text-zinc-500">{check.citation}</p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Value label="Application" text={check.expected} />
        <Value label="Label" text={check.found} />
      </div>
    </li>
  );
}

interface Props {
  report: VerificationReport;
  source: ExtractionSource;
}

export function ReportView({ report, source }: Props) {
  const verdict = VERDICT[report.verdict];

  return (
    <section className="space-y-4">
      <div className={`rounded-lg border-l-4 p-4 ${verdict.className}`}>
        <h2 className="text-xl font-semibold">{verdict.title}</h2>
        <p className="mt-1">{verdict.body}</p>
      </div>

      <ul className="space-y-3">
        {report.checks.map((check) => (
          <CheckCard key={check.fieldId} check={check} />
        ))}
      </ul>

      <p className="text-sm text-zinc-500">
        {source === "vision"
          ? "Label read using the vision model."
          : "Label read using in-browser text recognition. Brand and class/type are identified by layout, so confirm them by eye."}
      </p>
    </section>
  );
}
