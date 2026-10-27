'use client';

import type { ShipmentStatus, TripView } from '@mersal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { use } from 'react';
import { toast } from 'sonner';
import { ShipmentStatusBadge } from '@/components/shipments/shipment-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { gramsToKgText, useLocalized, useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';

const STATUS_TONE = {
  PUBLISHED: 'primary',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
} as const;

export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('trips');
  const td = useTranslations('trips.detail');
  const localized = useLocalized();
  const money = useMoney();
  const format = useFormatter();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const trip = useQuery({ queryKey: ['trip', id], queryFn: () => api<TripView>(`/trips/${id}`) });
  const cancel = useMutation({
    mutationFn: () => api<TripView>(`/trips/${id}/cancel`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['trip', id], data);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success(td('cancelled'));
    },
    onError: (e) => toast.error(describe(e)),
  });

  if (!trip.data) return <PageSpinner />;
  const tr = trip.data;
  const day = (iso: string) => format.dateTime(new Date(`${iso}T00:00:00`), { dateStyle: 'full' });

  return (
    <>
      <Link
        href="/app/trips"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t('title')}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="flex items-center gap-3 text-2xl font-semibold text-ink sm:text-3xl">
          {localized(tr.originCity.names)}
          <ArrowRight className="size-6 text-accent rtl:rotate-180" aria-hidden="true" />
          {localized(tr.destinationCity.names)}
        </h1>
        <Badge tone={STATUS_TONE[tr.status]}>{t(`status.${tr.status}`)}</Badge>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">{td('dates')}</p>
          <p className="mt-1 font-medium text-ink">{day(tr.departureDate)}</p>
          {tr.arrivalDate && (
            <p className="text-sm text-muted-foreground">→ {day(tr.arrivalDate)}</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">{td('space')}</p>
          <p className="mt-1 font-medium text-ink">
            {t('capacity', {
              remaining: gramsToKgText(tr.remainingGrams),
              total: gramsToKgText(tr.capacityGrams),
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('items', { count: tr.itemsAccepted })} / {tr.maxItems}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">{td('categories')}</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {tr.categories.length
              ? tr.categories.map((c) => localized(c.names)).join(' · ')
              : td('allCategories')}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-ink">{td('parcels')}</h2>
        {tr.shipments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{td('noParcels')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {tr.shipments.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/app/shipments/${s.id}`}
                  className="flex items-center gap-4 py-3 text-sm hover:text-primary"
                >
                  <span className="font-mono text-ink" dir="ltr">
                    {s.reference}
                  </span>
                  <span className="text-muted-foreground">{gramsToKgText(s.weightGrams)} kg</span>
                  <span className="ms-auto font-medium text-ink tabular-nums">
                    {money(s.travellerEarning, s.currency)}
                  </span>
                  <ShipmentStatusBadge status={s.status as ShipmentStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tr.status === 'PUBLISHED' && (
        <Button
          variant="secondary"
          className="mt-6 text-danger"
          disabled={cancel.isPending}
          onClick={() => {
            if (window.confirm(td('cancelConfirm'))) cancel.mutate();
          }}
        >
          {td('cancel')}
        </Button>
      )}
    </>
  );
}
