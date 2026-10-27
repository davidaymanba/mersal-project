'use client';

import { FileText, Upload } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';

interface FileInputProps {
  label: string;
  hint?: string;
  chooseLabel: string;
  replaceLabel: string;
  accept?: string;
  capture?: 'user' | 'environment';
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

/** File picker with an image preview, used for identity documents and parcel photos. */
export function FileInput({
  label,
  hint,
  chooseLabel,
  replaceLabel,
  accept,
  capture,
  value,
  onChange,
  error,
}: FileInputProps) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !value.type.startsWith('image/')) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <label
        htmlFor={id}
        className={cn(
          'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 p-4 text-center transition-colors hover:border-primary hover:bg-tint/40',
          error ? 'border-danger' : 'border-border',
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
          <img src={preview} alt="" className="max-h-40 rounded-lg object-contain" />
        ) : value ? (
          <FileText className="size-8 text-primary" aria-hidden="true" />
        ) : (
          <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-primary">
          {value ? replaceLabel : chooseLabel}
        </span>
        {value && (
          <span className="max-w-full truncate text-xs text-muted-foreground">{value.name}</span>
        )}
      </label>
      <input
        id={id}
        type="file"
        className="sr-only"
        accept={accept}
        capture={capture}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
