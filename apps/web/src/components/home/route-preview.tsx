import { BadgeCheck, Check, MapPin, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    <div className="relative">
      <div
        className="absolute -inset-3 -z-10 rounded-[2rem] bg-sand sm:-inset-6"
        aria-hidden="true"
      />
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_60px_-28px_rgb(11_46_51/0.35)]">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('label')}
          </span>
          <Badge tone="info">{t('status')}</Badge>
        </div>
        <p className="mt-4 font-mono text-sm text-muted-foreground" dir="ltr">
          MRS-7K3D-29QX
        </p>
        <p className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <MapPin className="size-5 text-accent" aria-hidden="true" />
          {t('route')}
        </p>

        <ol className="mt-6 space-y-4">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  step.done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground',
                )}
              >
                {step.done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn('text-sm', step.done ? 'text-ink' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex items-center gap-3 rounded-xl bg-muted p-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-tint font-display font-semibold text-primary">
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
    </div>
  );
}
