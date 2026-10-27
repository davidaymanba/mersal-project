'use client';

import { ImagePlus, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

const MAX = 4;

/** Up to four images with thumbnails; files stay local until the shipment is created. */
export function PhotoPicker({
  files,
  onChange,
  addLabel,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  addLabel: string;
}) {
  const id = useId();
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  return (
    <div className="flex flex-wrap gap-3">
      {urls.map((url, index) => (
        <div key={url} className="relative size-24 overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img src={url} alt="" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(files.filter((_, i) => i !== index))}
            className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink"
            aria-label="Remove"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
      {files.length < MAX && (
        <label
          htmlFor={id}
          className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary"
        >
          <ImagePlus className="size-5" aria-hidden="true" />
          {addLabel}
        </label>
      )}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          onChange([...files, ...picked].slice(0, MAX));
          e.target.value = '';
        }}
      />
    </div>
  );
}
