'use client';

import type { CandidateResult, ShipmentStatus } from '@mersal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Send } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { gramsToKgText, useLocalized } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';

interface MatchingLog {
  runs: {
    id: string;
    trigger: string;
    result: string;
    createdAt: string;
    candidates: CandidateResult[];
  }[];
  offers: {
    id: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
    score: number;
    expiresAt: string;
    rejectReason: string | null;
    createdAt: string;
    traveller: { id: string; firstName: string; lastName: string };
    trip: { id: string; departureDate: string };
  }[];
}

interface CandidateTrip {
  id: string;
  departureDate: string;
  remainingGrams: number;
  originCity: { names: { en: string; fr: string; ar: string } };
  destinationCity: { names: { en: string; fr: string; ar: string } };
  traveller: { id: string; firstName: string; lastName: string; reliabilityScore: number };
}

const OFFER_TONE = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'neutral',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
} as const;

export function MatchingLogPanel({
  shipmentId,
  status,
}: {
  shipmentId: string;
  status: ShipmentStatus;
}) {
  const t = useTranslations('admin.matching');
  const to = useTranslations('offers.status');
  const format = useFormatter();
  const localized = useLocalized();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const [tripId, setTripId] = useState('');

  const log = useQuery({
    queryKey: ['admin', 'matching', shipmentId],
    queryFn: () => api<MatchingLog>(`/admin/matching/shipments/${shipmentId}`),
  });
  const canMatch = ['PAID', 'MATCHING', 'NO_MATCH'].includes(status);
  const trips = useQuery({
    queryKey: ['admin', 'matching', shipmentId, 'trips'],
    queryFn: () => api<CandidateTrip[]>(`/admin/matching/shipments/${shipmentId}/trips`),
    enabled: canMatch,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

  const rerun = useMutation({
    mutationFn: () =>
      api<{ result: string }>(`/admin/matching/shipments/${shipmentId}/rerun`, { method: 'POST' }),
    onSuccess: (r) => {
      toast.success(t('rerunDone', { result: r.result }));
      return refresh();
    },
    onError: (e) => toast.error(describe(e)),
  });
  const propose = useMutation({
    mutationFn: () => api(`/admin/matching/shipments/${shipmentId}/propose`, { body: { tripId } }),
    onSuccess: () => {
      toast.success(t('proposed'));
      return refresh();
    },
    onError: (e) => toast.error(describe(e)),
  });

  const when = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' });

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{t('log')}</h2>
        {canMatch && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => rerun.mutate()}
            disabled={rerun.isPending}
          >
            <Play aria-hidden="true" />
            {t('rerun')}
          </Button>
        )}
      </div>

      {canMatch && (
        <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-muted/60 p-3">
          <Select
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            className="min-w-64 flex-1"
            aria-label={t('propose')}
          >
            <option value="">{trips.data?.length ? t('propose') : t('noTrips')}</option>
            {trips.data?.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.departureDate.slice(0, 10)} · {trip.traveller.firstName}{' '}
                {trip.traveller.lastName} · {localized(trip.originCity.names)} →{' '}
                {localized(trip.destinationCity.names)} · {gramsToKgText(trip.remainingGrams)} kg
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            onClick={() => propose.mutate()}
            disabled={!tripId || propose.isPending}
          >
            <Send aria-hidden="true" />
            {t('proposeAction')}
          </Button>
        </div>
      )}

      {log.data && log.data.offers.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-semibold text-ink">{t('offers')}</h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {log.data.offers.map((offer) => (
              <li key={offer.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link
                  href={`/admin/users/${offer.traveller.id}`}
                  className="font-medium text-ink hover:text-primary"
                >
                  {offer.traveller.firstName} {offer.traveller.lastName}
                </Link>
                <span className="text-muted-foreground">{when(offer.createdAt)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {t('score')} {offer.score.toFixed(3)}
                </span>
                {offer.rejectReason && (
                  <span className="text-muted-foreground">“{offer.rejectReason}”</span>
                )}
                <Badge tone={OFFER_TONE[offer.status]} className="ms-auto">
                  {to(offer.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {!log.data?.runs.length && <p className="text-sm text-muted-foreground">{t('noRuns')}</p>}
        {log.data?.runs.map((run) => (
          <details key={run.id} className="rounded-xl border border-border px-4 py-3 text-sm">
            <summary className="cursor-pointer text-ink">
              <span className="font-medium">
                {t('run', { trigger: run.trigger, result: run.result })}
              </span>
              <span className="ms-2 text-muted-foreground">{when(run.createdAt)}</span>
            </summary>
            <table className="mt-3 w-full text-start text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 text-start">{t('candidates')}</th>
                  <th className="py-1 text-start">{t('eligible')}</th>
                  <th className="py-1 text-start">{t('score')}</th>
                </tr>
              </thead>
              <tbody>
                {run.candidates.map((c) => (
                  <tr key={c.tripId} className="border-t border-border">
                    <td className="py-1.5 font-mono" dir="ltr">
                      {c.tripId.slice(-8)}
                    </td>
                    <td className="py-1.5">
                      {c.eligible ? (
                        <Badge tone="success">✓</Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          {t(`reason.${c.excludedReason ?? 'own_shipment'}`)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 tabular-nums">{c.eligible ? c.score.toFixed(3) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </section>
  );
}
