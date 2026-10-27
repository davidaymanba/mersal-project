import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-4 animate-spin', className)} aria-hidden="true" />;
}

/** Full-area loader: the logo's route drawing itself, then the parcel landing. */
export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-busy="true">
      <svg viewBox="0 0 48 48" className="size-12" aria-hidden="true">
        <path
          d="M8 36V20a8 8 0 0 1 16 0v16M24 20a8 8 0 0 1 16 0v8"
          fill="none"
          stroke="var(--border)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 36V20a8 8 0 0 1 16 0v16M24 20a8 8 0 0 1 16 0v8"
          pathLength={1}
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="[stroke-dasharray:1] [animation:route-loop_1.6s_var(--ease-out-quart)_infinite] motion-reduce:animate-none"
        />
        <circle
          cx="40"
          cy="36"
          r="3.5"
          fill="var(--brand-accent)"
          className="origin-[40px_36px] [animation:parcel-land_1.6s_var(--ease-out-quart)_infinite] motion-reduce:animate-none"
        />
      </svg>
    </div>
  );
}

/** Placeholder block with a shimmer, for lists and cards while their data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4', className)} aria-hidden="true" />;
}
