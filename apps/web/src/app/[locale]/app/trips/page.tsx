'use client';

import type { TripView } from '@mersal/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, Plane } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { gramsToKgText, useLocalized } from '@/lib/catalog';
import { useMe } from '@/lib/session';

const STATUS_TONE = {
  PUBLISHED: 'primary',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
} as const;

export default function TripsPage() {
  const t = useTranslations('trips');
  const localized = useLocalized();
  const format = useFormatter();
  const { data: me } = useMe();
  const isTraveller = me?.travellerStatus === 'APPROVED';
  const trips = useQuery({
    queryKey: ['trips'],
    queryFn: () => api<TripView[]>('/trips'),
    enabled: isTraveller,
  });

  if (!me) return <PageSpinner />;

  if (!isTraveller) {
    return (
      <>
        <PageHeader title={t('title')} description={t('subtitle')} />
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-ink p-8 text-white">
          <BadgeCheck className="size-8 text-accent" aria-hidden="true" />
          <p className="max-w-lg text-lg">{t('verifyFirst')}</p>
          <Button variant="inverse" asChild>
            <Link href="/app/verification">{t('verifyAction')}</Link>
          </Button>
        </div>
      </>
    );
  }

  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00`), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button asChild>
            <Link href="/app/trips/new">
              <Plane aria-hidden="true" />
              {t('newAction')}
            </Link>
          </Button>
        }
      />
      {!trips.data ? (
        <PageSpinner />
      ) : trips.data.length === 0 ? (
        <EmptyState title={t('empty')}>
          <Button asChild>
            <Link href="/app/trips/new">{t('newAction')}</Link>
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {trips.data.map((trip) => {
            const usedPercent = 100 - (trip.remainingGrams / trip.capacityGrams) * 100;
            return (
              <li key={trip.id}>
                <Link
                  href={`/app/trips/${trip.id}`}
                  className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      {localized(trip.originCity.names)}
                      <ArrowRight
                        className="size-4 text-muted-foreground rtl:rotate-180"
                        aria-hidden="true"
                      />
                      {localized(trip.destinationCity.names)}
                    </p>
                    <Badge tone={STATUS_TONE[trip.status]}>{t(`status.${trip.status}`)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{day(trip.departureDate)}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                    <span>
                      {t('capacity', {
                        remaining: gramsToKgText(trip.remainingGrams),
                        total: gramsToKgText(trip.capacityGrams),
                      })}
                    </span>
                    <span>{t('items', { count: trip.itemsAccepted })}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
