'use client';

import { brands, type BrandId } from '@mersal/brand';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import { useBrand } from './brand-provider';

export function BrandSwitcher() {
  const active = useBrand();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(id: BrandId) {
    document.cookie = `brand=${id}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap gap-3" aria-busy={pending}>
      {Object.values(brands).map((brand) => {
        const [ink, primary, , accent] = brand.colors;
        return (
          <button
            key={brand.id}
            type="button"
            onClick={() => select(brand.id)}
            aria-pressed={active.id === brand.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 text-start transition-colors',
              active.id === brand.id
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:bg-muted',
            )}
          >
            <span className="flex -space-x-1.5 rtl:space-x-reverse">
              {[ink, primary, accent].map((c) => (
                <span
                  key={c?.hex}
                  className="size-5 rounded-full border-2 border-white"
                  style={{ background: c?.hex }}
                />
              ))}
            </span>
            <span className="font-medium text-ink">{brand.name}</span>
          </button>
        );
      })}
    </div>
  );
}
