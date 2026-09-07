"use client";

import { useState } from "react";
import { SAMPLE_LABELS, type SampleLabel } from "@/lib/samples";

interface Props {
  onChoose: (sample: SampleLabel, file: File) => void;
  disabled?: boolean;
}

export function SamplePicker({ onChoose, disabled }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(sample: SampleLabel) {
    setLoading(sample.file);
    setError(null);

    try {
      const response = await fetch(`/samples/${sample.file}`);
      if (!response.ok) throw new Error(String(response.status));

      const blob = await response.blob();
      onChoose(sample, new File([blob], sample.file, { type: "image/png" }));
    } catch {
      setError("That sample could not be loaded. Try uploading an image instead.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <h3 className="text-base font-medium text-zinc-900">
        No label to hand? Try one of these
      </h3>
      <p className="mt-1 text-sm text-zinc-600">
        Six different applications, each with its own product. Choosing one
        loads its application data too, so you can check it straight away.
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SAMPLE_LABELS.map((sample) => (
          <li key={sample.file}>
            <button
              type="button"
              data-sample={sample.file}
              onClick={() => choose(sample)}
              disabled={disabled || loading !== null}
              className="flex h-full w-full flex-col items-start gap-1 rounded-md border border-zinc-300 p-2.5 text-left hover:border-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
            >
              <span className="text-sm font-medium text-zinc-900">
                {loading === sample.file ? "Loading…" : sample.scenario}
              </span>
              <span className="text-xs text-zinc-600">{sample.product}</span>
              <span className="mt-auto pt-1 text-xs font-medium text-zinc-500">
                {sample.expect}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
