'use client';

import type { OfferView } from '@mersal/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Clock, X, Zap } from 'lucide-react';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { openOffersKey } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { useRouter } from '@/i18n/navigation';
import { api, apiUrl } from '@/lib/api';
import { categoryIcon, gramsToKgText, useLocalized, useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';

const STATUS_TONE = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'neutral',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
} as const;

function OfferCard({ offer, onDone }: { offer: OfferView; onDone: () => void }) {
  const t = useTranslations('offers');
  const localized = useLocalized();
  const money = useMoney();
  const format = useFormatter();
  const now = useNow({ updateInterval: 15_000 });
  const router = useRouter();
  const describe = useErrorMessage();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);
  const s = offer.shipment;
  const Icon = categoryIcon(s.category.icon);
  const open = offer.status === 'PENDING' && Date.parse(offer.expiresAt) > now.getTime();
  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00`), { day: 'numeric', month: 'short' });

  async function respond(kind: 'accept' | 'reject') {
    setBusy(kind);
    try {
      if (kind === 'accept') {
        const res = await api<{ shipmentId: string }>(`/offers/${offer.id}/accept`, {
          method: 'POST',
        });
        toast.success(t('accepted'));
        router.push(`/app/shipments/${res.shipmentId}`);
      } else {
        await api(`/offers/${offer.id}/reject`, { body: { reason: reason || undefined } });
        toast.success(t('rejected'));
      }
      onDone();
    } catch (error) {
      toast.error(describe(error));
      onDone();
    } finally {
      setBusy(null);
    }
  }

  return (
    <article
      className={cn(
        'rounded-2xl border bg-surface p-5',
        open ? 'border-primary/40 shadow-sm' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-tint text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="flex items-center gap-2 font-semibold text-ink">
              {localized(s.originCity.names)}
              <ArrowRight
                className="size-4 text-muted-foreground rtl:rotate-180"
                aria-hidden="true"
              />
              {localized(s.destinationCity.names)}
            </p>
            <p className="text-sm text-muted-foreground">
              {localized(s.category.names)} · {gramsToKgText(s.weightGrams)} kg ·{' '}
              <span dir="ltr">
                {s.lengthCm}×{s.widthCm}×{s.heightCm} cm
              </span>
            </p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-xs text-muted-foreground">{t('earning')}</p>
          <p className="font-display text-2xl font-semibold text-ink tabular-nums">
            {money(s.earning, s.currency)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink">{s.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Badge tone="neutral">{t('onTrip', { date: day(offer.trip.departureDate) })}</Badge>
        <Badge tone="neutral">
          {t('window', { from: day(s.earliestDate), to: day(s.latestDate) })}
        </Badge>
        {s.urgency === 'EXPRESS' && (
          <Badge tone="warning">
            <Zap className="size-3" aria-hidden="true" />
            {t('express')}
          </Badge>
        )}
        {!open && <Badge tone={STATUS_TONE[offer.status]}>{t(`status.${offer.status}`)}</Badge>}
      </div>

      {s.photos.length > 0 && (
        <div className="mt-4 flex gap-2">
          {s.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element -- private file served with session cookies
            <img
              key={photo}
              src={apiUrl(photo)}
              alt=""
              className="size-16 rounded-lg border border-border object-cover"
            />
          ))}
        </div>
      )}

      {open && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm text-warning">
            <Clock className="size-4" aria-hidden="true" />
            {t('expiresIn', { time: format.relativeTime(new Date(offer.expiresAt), now) })}
          </p>
          {rejecting ? (
            <div className="flex flex-wrap gap-2">
              <Input
                className="min-w-48 flex-1"
                placeholder={t('rejectReason')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button variant="danger" onClick={() => respond('reject')} disabled={busy !== null}>
                {busy === 'reject' && <Spinner />}
                {t('confirmReject')}
              </Button>
              <Button variant="ghost" onClick={() => setRejecting(false)}>
                <X aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => respond('accept')} disabled={busy !== null}>
                {busy === 'accept' ? <Spinner /> : <Check aria-hidden="true" />}
                {t('accept')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setRejecting(true)}
                disabled={busy !== null}
              >
                {t('reject')}
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function OffersPage() {
  const t = useTranslations('offers');
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'open' | 'history'>('open');
  const offers = useQuery({
    queryKey: tab === 'open' ? openOffersKey : ['offers', 'history'],
    queryFn: () => api<OfferView[]>(`/offers?status=${tab}`),
    refetchInterval: tab === 'open' ? 15_000 : false,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['offers'] });

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <div
        className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1 sm:w-fit"
        role="tablist"
      >
        {(['open', 'history'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === key ? 'bg-ink text-white' : 'text-muted-foreground hover:text-ink',
            )}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>
      {!offers.data ? (
        <PageSpinner />
      ) : offers.data.length === 0 ? (
        <EmptyState title={tab === 'open' ? t('empty') : t('emptyHistory')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {offers.data.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onDone={refresh} />
          ))}
        </div>
      )}
    </>
  );
}
