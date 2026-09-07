"use client";

import { SAMPLE_APPLICATION } from "@/lib/samples";
import type { ApplicationData } from "@/lib/verification/types";

interface Props {
  value: ApplicationData;
  onChange: (value: ApplicationData) => void;
  disabled?: boolean;
}

const FIELDS: { key: keyof ApplicationData; label: string }[] = [
  { key: "brandName", label: "Brand name" },
  { key: "classType", label: "Class / type" },
  { key: "alcoholContent", label: "Alcohol content" },
  { key: "netContents", label: "Net contents" },
];

export function ApplicationForm({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-4">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label
            htmlFor={field.key}
            className="block text-base font-medium text-zinc-900"
          >
            {field.label}
          </label>
          <input
            id={field.key}
            type="text"
            value={value[field.key]}
            placeholder={SAMPLE_APPLICATION[field.key]}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, [field.key]: event.target.value })
            }
            className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-zinc-100"
          />
        </div>
      ))}
    </div>
  );
}
