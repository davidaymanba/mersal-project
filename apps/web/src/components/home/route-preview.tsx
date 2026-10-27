import { BadgeCheck, Check, ShieldCheck, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ROUTE = 'M12 70C90 4 230 4 308 70';
/** Share of the route already travelled; the sample parcel is in transit. */
const PROGRESS = 0.62;
/** Point on ROUTE at PROGRESS of its length, for the static (reduced motion) marker. */
const MARKER = { x: 198.1, y: 23.2 };
/** Seconds after load when each part of the sequence starts. */
const T = { route: 0.5, steps: 1.1, traveller: 2.1 };

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

/** Illustrative tracking card for the landing page (static sample, not live data). */
export async function RoutePreview() {
  const t = await getTranslations('home.preview');
  const steps = [
    { label: t('paid'), done: true },
    { label: t('matched'), done: true },
    { label: t('pickedUp'), done: true },
    { label: t('delivery'), done: false },
  ];

  return (
    <div
      data-tilt
      className="relative mx-auto w-full max-w-md animate-fade-up lg:me-0"
      style={delay(0.15)}
    >
      {/* Stacked sheet behind the card for depth */}
      <div
        className="absolute inset-x-6 -bottom-3 top-6 -z-10 rounded-3xl border border-border/70 bg-surface/70 shadow-md"
        aria-hidden="true"
      />

      <div className="relative rounded-3xl border border-border/80 bg-surface p-6 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-muted-foreground">{t('label')}</span>
          <Badge tone="info" live>
            {t('status')}
          </Badge>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground/80" dir="ltr">
          MRS-7K3D-29QX
        </p>

        {/* The route: drawn on load, with the parcel stopping where it is now */}
        <div className="relative mt-5">
          <svg viewBox="0 0 320 84" className="w-full overflow-visible rtl:-scale-x-100">
            <path
              d={ROUTE}
              fill="none"
              stroke="var(--border)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="0.5 7"
            />
            <path
              d={ROUTE}
              pathLength={1}
              fill="none"
              stroke="var(--brand-primary)"
              strokeWidth={3}
              strokeLinecap="round"
              className="[animation:route-progress_1.9s_var(--ease-out-expo)_both]"
              style={
                {
                  '--route-progress': PROGRESS,
                  strokeDasharray: `${PROGRESS} 1`,
                  ...delay(T.route),
                } as CSSProperties
              }
            />
            <circle cx="12" cy="70" r="5" fill="var(--brand-primary)" />
            <circle
              cx="308"
              cy="70"
              r="5"
              fill="var(--surface)"
              stroke="var(--brand-primary)"
              strokeWidth={2.5}
            />

            <g className="motion-only">
              <animateMotion
                path={ROUTE}
                dur="2.4s"
                fill="freeze"
                calcMode="spline"
                keyPoints={`0;0;${PROGRESS}`}
                keyTimes="0;0.21;1"
                keySplines="0 0 1 1;0.16 1 0.3 1"
              />
              <ParcelMarker />
            </g>
            <g
              className="hidden motion-reduce:block"
              transform={`translate(${MARKER.x} ${MARKER.y})`}
            >
              <ParcelMarker />
            </g>
          </svg>
          <div className="mt-1 flex items-center justify-between font-display text-lg font-semibold text-ink">
            <span>{t('from')}</span>
            <span className="text-muted-foreground">{t('to')}</span>
          </div>
        </div>

        <ol className="mt-6 space-y-3.5">
          {steps.map((step, i) => {
            const at = T.steps + i * 0.18;
            return (
              <li
                key={step.label}
                className="relative flex animate-fade-up items-center gap-3"
                style={delay(at)}
              >
                {i < steps.length - 1 && (
                  <span
                    className={cn(
                      'absolute start-[0.8125rem] top-7 h-3.5 w-0.5 origin-top rounded-full',
                      steps[i + 1]!.done
                        ? 'animate-[grow-y_0.5s_ease-out_both] bg-primary'
                        : 'bg-border',
                    )}
                    style={delay(at + 0.2)}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    'relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    step.done
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'border-2 border-primary/40 bg-surface text-primary',
                  )}
                >
                  {step.done ? (
                    <Check
                      className="size-4 animate-check"
                      style={delay(at + 0.1)}
                      aria-hidden="true"
                    />
                  ) : (
                    <>
                      <span
                        className="absolute inset-0 animate-ping-soft rounded-full border-2 border-primary/50"
                        style={delay(at + 0.4)}
                        aria-hidden="true"
                      />
                      {i + 1}
                    </>
                  )}
                </span>
                <span
                  className={cn('text-sm', step.done ? 'text-ink' : 'font-medium text-primary')}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div
          className="mt-6 flex animate-fade-up items-center gap-3 rounded-2xl border border-border/70 bg-muted/60 p-3"
          style={delay(T.traveller)}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-tint to-[color-mix(in_oklab,var(--brand-primary)_25%,var(--surface))] font-display font-semibold text-primary ring-2 ring-surface">
            Y
          </span>
          <div className="text-sm">
            <p className="flex items-center gap-1 font-medium text-ink">
              {t('traveller')}
              <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
            </p>
            <p className="flex items-center gap-1 text-muted-foreground">
              <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
              {t('rating')}
            </p>
          </div>
        </div>
      </div>

      {/* Floating note about where the money is */}
      <div
        className="absolute -end-4 -top-5 hidden animate-fade-up sm:block"
        style={delay(T.traveller + 0.3)}
      >
        <div className="flex animate-float items-center gap-2 rounded-2xl border border-border/80 bg-surface/95 px-3.5 py-2.5 text-sm font-medium text-ink shadow-md backdrop-blur">
          <span className="flex size-7 items-center justify-center rounded-lg bg-success-tint text-success">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>
          {t('protected')}
        </div>
      </div>
    </div>
  );
}

function ParcelMarker() {
  return (
    <>
      <circle
        r="9"
        fill="var(--brand-accent)"
        opacity="0.35"
        className="origin-center animate-ping-soft [transform-box:fill-box]"
      />
      <circle r="6.5" fill="var(--brand-accent)" stroke="var(--surface)" strokeWidth={2.5} />
    </>
  );
}
