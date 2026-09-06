"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
}

export function ImageDrop({ file, onSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function accept(candidate: File | undefined) {
    if (!candidate) return;

    if (!candidate.type.startsWith("image/")) {
      setError("That file is not an image. Choose a JPG, PNG, or WEBP.");
      return;
    }

    setError(null);
    onSelect(candidate);
  }

  if (preview) {
    return (
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Label artwork to be verified"
          className="w-full rounded-lg border border-zinc-300 bg-zinc-50 object-contain"
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate text-zinc-600">{file?.name}</span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            disabled={disabled}
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
          >
            Choose a different image
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files[0]);
        }}
        disabled={disabled}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors disabled:opacity-50 ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100"
        }`}
      >
        <span className="text-lg font-medium text-zinc-900">
          Add the label image
        </span>
        <span className="text-zinc-600">
          Drag a file here, or click to browse
        </span>
        <span className="text-sm text-zinc-500">JPG, PNG, or WEBP</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => accept(event.target.files?.[0])}
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
