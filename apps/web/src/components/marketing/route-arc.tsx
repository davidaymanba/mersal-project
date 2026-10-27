import { cn } from '@/lib/utils';

/**
 * The brand's route motif: a dotted arc between two points that draws itself. It echoes the
 * logo mark and is used as decoration on hero, auth and closing sections. Each instance
 * needs its own `id` for the mask. `trigger="reveal"` waits for the nearest data-reveal
 * ancestor to scroll into view instead of drawing on page load.
 */
export function RouteArc({
  id,
  className,
  tone = 'light',
  delay = 0.2,
  trigger = 'load',
}: {
  id: string;
  className?: string;
  tone?: 'light' | 'dark';
  delay?: number;
  trigger?: 'load' | 'reveal';
}) {
  const onReveal = trigger === 'reveal';
  const path = 'M20 260C180 20 520 -10 780 150';
  const dots = tone === 'dark' ? 'rgb(255 255 255 / 0.28)' : 'var(--brand-primary)';

  return (
    <svg
      viewBox="0 0 800 280"
      fill="none"
      aria-hidden="true"
      className={cn('pointer-events-none rtl:-scale-x-100', className)}
    >
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse">
          <path
            d={path}
            pathLength={1}
            stroke="white"
            strokeWidth={14}
            strokeLinecap="round"
            className={
              onReveal
                ? 'reveal-draw [transition-duration:2.4s]'
                : 'animate-draw [stroke-dasharray:1] [animation-duration:2.4s]'
            }
            style={onReveal ? { transitionDelay: `${delay}s` } : { animationDelay: `${delay}s` }}
          />
        </mask>
      </defs>
      <path
        d={path}
        stroke={dots}
        strokeOpacity={tone === 'dark' ? 1 : 0.35}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="0.5 12"
        mask={`url(#${id})`}
      />
      <circle cx="20" cy="260" r="6" fill={tone === 'dark' ? 'white' : 'var(--brand-primary)'} />
      <circle
        cx="780"
        cy="150"
        r="9"
        fill="var(--brand-accent)"
        className={cn(
          'origin-center [transform-box:fill-box]',
          onReveal ? 'reveal-pop' : 'animate-check',
        )}
        style={
          onReveal ? { transitionDelay: `${delay + 1.6}s` } : { animationDelay: `${delay + 1.6}s` }
        }
      />
    </svg>
  );
}
