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

      <section className="rounded-2xl border border-border bg-surface p-6">
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
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((steps.length - remaining) / steps.length) * 100}%` }}
          />
        </div>
        <ul className="mt-6 divide-y divide-border">
          {steps.map(({ key, done, href, icon: Icon }) => (
            <li key={key} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  done ? 'bg-success-tint text-success' : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? (
                  <Check className="size-5" aria-hidden="true" />
                ) : (
                  <Icon className="size-5" aria-hidden="true" />
                )}
              </span>
              <div className="flex-1">
                <p
                  className={cn(
                    'font-medium',
                    done ? 'text-muted-foreground line-through' : 'text-ink',
                  )}
                >
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

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
          <PackagePlus className="size-7 text-accent" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-ink">{t('overview.sendTitle')}</h2>
          <p className="mt-2 flex-1 text-muted-foreground">{t('overview.sendBody')}</p>
          <Button className="mt-6 self-start" asChild>
            <Link href="/pricing">
              {t('overview.sendAction')}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col rounded-2xl bg-ink p-6 text-white">
          <Plane className="size-7 text-accent" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold">{t('overview.travelTitle')}</h2>
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
