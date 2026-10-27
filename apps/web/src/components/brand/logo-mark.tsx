import { cn } from '@/lib/utils';

/**
 * The Mersal mark: a lowercase m drawn as a two-leg route ending at a destination point.
 * Colours come from theme tokens so it follows the active brand theme.
 */
export function LogoMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn('shrink-0', className)}>
      <path
        d="M8 36V20a8 8 0 0 1 16 0v16M24 20a8 8 0 0 1 16 0v8"
        pathLength={1}
        className="[stroke-dasharray:1] group-hover/logo:[animation:draw_0.9s_var(--ease-out-expo)]"
        fill="none"
        stroke={mono ? 'currentColor' : 'var(--brand-primary)'}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="40"
        cy="36"
        r="3.5"
        fill={mono ? 'currentColor' : 'var(--brand-accent)'}
        className="origin-center [transform-box:fill-box] group-hover/logo:[animation:check-in_0.5s_var(--ease-spring)_0.55s_both]"
      />
    </svg>
  );
}
