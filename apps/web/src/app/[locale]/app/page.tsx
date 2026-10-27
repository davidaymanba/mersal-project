'use client';

import { ArrowRight, BadgeCheck, Check, Mail, PackagePlus, Phone, Plane } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { useMe } from '@/lib/session';
import { cn } from '@/lib/utils';

const STATUS_TONE = {
  NOT_STARTED: 'neutral',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
} as const;

export default function OverviewPage() {
  const t = useTranslations('app');
  const { data: me } = useMe();
  if (!me) return <PageSpinner />;

  const steps = [
    { key: 'email', done: me.emailVerified, href: '/verify-email?next=/app', icon: Mail },
    { key: 'phone', done: me.phoneVerified, href: '/app/settings#phone', icon: Phone },
    {
      key: 'traveller',
      done: me.travellerStatus === 'APPROVED',
      href: '/app/verification',
      icon: BadgeCheck,
    },
  ] as const;
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <>
      <PageHeader
        title={t('overview.greeting', { name: me.firstName })}
        description={t('overview.subtitle')}
        actions={
          <Badge tone={STATUS_TONE[me.travellerStatus]}>
            {t(`travellerStatus.${me.travellerStatus}`)}
          </Badge>
        }
      />

      <section className="animate-fade-up rounded-2xl border border-border bg-surface p-6 shadow-xs [animation-delay:0.08s]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">
            {remaining ? t('overview.checklistTitle') : t('overview.checklistDone')}
          </h2>
          <span
            className="font-display text-sm font-semibold text-muted-foreground tabular-nums"
            dir="ltr"
          >
            {steps.length - remaining}/{steps.length}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full origin-left animate-grow-x rounded-full bg-gradient-to-r from-primary to-[color-mix(in_oklab,var(--brand-primary)_55%,var(--surface))] transition-[width] duration-700 [animation-delay:0.3s] rtl:origin-right rtl:bg-gradient-to-l"
            style={{ width: `${((steps.length - remaining) / steps.length) * 100}%` }}
          />
        </div>
        <ul className="mt-6 divide-y divide-border">
          {steps.map(({ key, done, href, icon: Icon }, index) => (
            <li
              key={key}
              className="flex animate-fade-up items-center gap-4 py-4 first:pt-0 last:pb-0"
              style={{ animationDelay: `${0.2 + index * 0.08}s` }}
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  done
                    ? 'bg-success text-surface shadow-[0_6px_14px_-6px_var(--success)]'
                    : 'bg-tint text-primary ring-1 ring-primary/15',
                )}
              >
                {done ? (
                  <Check
                    className="size-5 animate-check"
                    style={{ animationDelay: `${0.4 + index * 0.08}s` }}
                    aria-hidden="true"
                  />
                ) : (
                  <Icon className="size-5" aria-hidden="true" />
                )}
              </span>
              <div className="flex-1">
                <p className={cn('font-medium', done ? 'text-muted-foreground' : 'text-ink')}>
                  {t(`overview.steps.${key}.title`)}
                </p>
                <p className="text-sm text-muted-foreground">{t(`overview.steps.${key}.body`)}</p>
              </div>
              {!done && (
                <Button variant="secondary" size="sm" asChild>
                  <Link href={href}>{t(`overview.steps.${key}.action`)}</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 grid animate-fade-up gap-6 [animation-delay:0.25s] md:grid-cols-2">
        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-xs transition-shadow duration-300 hover:shadow-md">
          <div
            className="bg-dot-grid absolute inset-y-0 end-0 w-1/2 [mask-image:linear-gradient(to_left,black,transparent)] opacity-50 rtl:[mask-image:linear-gradient(to_right,black,transparent)]"
            aria-hidden="true"
          />
          <span className="relative flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-105">
            <PackagePlus className="size-6" aria-hidden="true" />
          </span>
          <h2 className="relative mt-5 text-lg font-semibold text-ink">
            {t('overview.sendTitle')}
          </h2>
          <p className="relative mt-2 flex-1 text-muted-foreground">{t('overview.sendBody')}</p>
          <Button className="relative mt-6 self-start" asChild>
            <Link href="/pricing">
              {t('overview.sendAction')}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="group relative isolate flex flex-col overflow-hidden rounded-2xl bg-deep-glow p-6 text-white shadow-md">
          <div
            className="absolute -end-20 -top-24 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-primary)_70%,transparent),transparent)] opacity-70"
            aria-hidden="true"
          />
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-accent ring-1 ring-white/15 transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-105">
            <Plane className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">{t('overview.travelTitle')}</h2>
          <p className="mt-2 flex-1 text-white/70">{t('overview.travelBody')}</p>
          <Button variant="inverse" className="mt-6 self-start" asChild>
            <Link href="/app/verification">
              {t('overview.travelAction')}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
