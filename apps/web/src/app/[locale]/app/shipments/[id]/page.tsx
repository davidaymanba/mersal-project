'use client';

import type { ShipmentView } from '@mersal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Search, TriangleAlert } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { use, useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { PayPanel } from '@/components/payments/pay-panel';
import {
  DisputeStatus,
  ReportProblem,
  ReviewPanel,
  WithdrawButton,
} from '@/components/shipments/after-delivery';
import { ChatPanel } from '@/components/shipments/chat-panel';
import { HandoverPanel } from '@/components/shipments/handover-panel';
import { PartyCard } from '@/components/shipments/party-card';
import { ShipmentStatusBadge, ShipmentTimeline } from '@/components/shipments/shipment-status';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { Link, useRouter } from '@/i18n/navigation';
import { api, apiUrl } from '@/lib/api';
import { categoryIcon, gramsToKgText, useLocalized, useMoney } from '@/lib/catalog';
import { useMe } from '@/lib/session';
import { useErrorMessage } from '@/lib/use-error-message';

const CHAT_STATUSES = ['MATCHED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'DISPUTED'];
const REFUNDABLE = ['PAID', 'MATCHING', 'NO_MATCH', 'MATCHED'];

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-4 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end text-ink">{children}</dd>
    </div>
  );
}

/** After returning from Stripe Checkout, confirm the payment even if the webhook is not configured. */
function usePaymentReturn(shipmentId: string, payment: string | undefined) {
  const t = useTranslations('payment');
  const router = useRouter();
  const queryClient = useQueryClient();
  const handled = useRef(false);

  useEffect(() => {
    if (!payment || handled.current) return;
    handled.current = true;
    if (payment === 'cancelled') {
      toast.message(t('cancelled'));
    } else {
      toast.promise(api(`/payments/${payment}/sync`, { method: 'POST' }), {
        loading: t('checking'),
        success: t('succeeded'),
        error: () => '',
      });
    }
    router.replace(`/app/shipments/${shipmentId}`);
    void queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
  }, [payment, shipmentId, router, queryClient, t]);
}

export default function ShipmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { id } = use(params);
  const { payment } = use(searchParams);
  const t = useTranslations('shipments.detail');
  const tp = useTranslations('pricing.form');
  const tn = useTranslations('shipments.new');
  const ts = useTranslations('shipments');
  const tpay = useTranslations('payment');
  const format = useFormatter();
  const localized = useLocalized();
  const money = useMoney();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  usePaymentReturn(id, payment);

  const shipment = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => api<ShipmentView>(`/shipments/${id}`),
    // Keep the page fresh while something is expected to happen.
    refetchInterval: (q) =>
      ['PAID', 'MATCHING'].includes(q.state.data?.status ?? '') ? 5_000 : 30_000,
  });
  const cancel = useMutation({
    mutationFn: () => api<ShipmentView>(`/shipments/${id}/cancel`, { body: {} }),
    onSuccess: (data) => {
      queryClient.setQueryData(['shipment', id], data);
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success(data.status === 'REFUNDED' ? tpay('refunded') : t('cancelled'));
    },
    onError: (e) => toast.error(describe(e)),
  });

  if (!shipment.data || !me) return <PageSpinner />;
  const s = shipment.data;
  const Icon = categoryIcon(s.category.icon);
  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00`), { dateStyle: 'medium' });
  const isSender = s.viewerRole === 'sender';
  const canCancel = isSender && (s.status === 'QUOTED' || REFUNDABLE.includes(s.status));

  return (
    <>
      <Link
        href="/app/shipments"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {ts('title')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground" dir="ltr">
            {s.reference}
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-semibold text-ink sm:text-3xl">
            {localized(s.originCity.names)}
            <ArrowRight className="size-6 text-accent rtl:rotate-180" aria-hidden="true" />
            {localized(s.destinationCity.names)}
          </h1>
        </div>
        <ShipmentStatusBadge status={s.status} />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {isSender && s.status === 'QUOTED' && <PayPanel shipment={s} />}
        {isSender && (s.status === 'MATCHING' || s.status === 'PAID') && (
          <div className="flex items-center gap-3 rounded-2xl border border-info/20 bg-info-tint p-4 text-sm text-info">
            <Search className="size-5 shrink-0 animate-pulse" aria-hidden="true" />
            {t('matching')}
          </div>
        )}
        {isSender && s.status === 'NO_MATCH' && (
          <FormAlert tone="danger">
            <span className="flex items-center gap-2">
              <TriangleAlert className="size-4" aria-hidden="true" />
              {t('noMatch')}
            </span>
          </FormAlert>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <DisputeStatus shipment={s} />
          <ReviewPanel shipment={s} />
          <HandoverPanel shipment={s} />
          {CHAT_STATUSES.includes(s.status) && <ChatPanel shipmentId={s.id} viewerId={me.id} />}

          <Card title={t('parcel')}>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-tint text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium text-ink">{localized(s.category.names)}</p>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            </div>
            <dl className="divide-y divide-border">
              <Row label={t('weight')}>{gramsToKgText(s.weightGrams)} kg</Row>
              <Row label={t('size')}>
                <span dir="ltr">
                  {s.lengthCm} × {s.widthCm} × {s.heightCm} cm
                </span>
              </Row>
              <Row label={t('declaredValue')}>{money(s.declaredValue, s.currency)}</Row>
              <Row label={t('speed')}>{tp(`urgencyOptions.${s.urgency}.title`)}</Row>
              <Row label={t('dates')}>
                {t('datesValue', { from: day(s.earliestDate), to: day(s.latestDate) })}
              </Row>
            </dl>
          </Card>

          <Card title={t('recipient')}>
            <dl className="divide-y divide-border">
              <Row label={tn('recipientName')}>{s.recipientName}</Row>
              <Row label={tn('recipientPhone')}>
                <span dir="ltr">{s.recipientPhone}</span>
              </Row>
              {s.recipientEmail && (
                <Row label={tn('recipientEmail')}>
                  <span dir="ltr">{s.recipientEmail}</span>
                </Row>
              )}
            </dl>
          </Card>

          {s.photos.length > 0 && (
            <Card title={t('photos')}>
              <div className="flex flex-wrap gap-3">
                {s.photos.map((photo) => (
                  <a
                    key={photo}
                    href={apiUrl(photo)}
                    target="_blank"
                    rel="noreferrer"
                    className="size-28 overflow-hidden rounded-xl border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- private file served with session cookies */}
                    <img src={apiUrl(photo)} alt="" className="size-full object-cover" />
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          {isSender && s.traveller && (
            <PartyCard
              title={t('traveller')}
              profile={s.traveller}
              departureDate={s.trip?.departureDate}
            />
          )}
          {s.viewerRole === 'traveller' && s.sender && (
            <PartyCard
              title={t('sender')}
              profile={s.sender}
              departureDate={s.trip?.departureDate}
            />
          )}

          <div className="rounded-2xl bg-ink p-6 text-white">
            <p className="text-sm text-white/70">
              {s.viewerRole === 'traveller' ? t('earning') : t('price')}
            </p>
            <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
              {money(s.price, s.currency)}
            </p>
          </div>

          <Card title={t('timeline')}>
            <ShipmentTimeline events={s.events} viewerId={me.id} travellerId={s.traveller?.id} />
          </Card>

          {s.canDispute && <ReportProblem shipment={s} />}
          {s.viewerRole === 'traveller' && s.status === 'MATCHED' && (
            <WithdrawButton shipment={s} />
          )}
          {canCancel && (
            <Button
              variant="secondary"
              className="text-danger"
              disabled={cancel.isPending}
              onClick={() => {
                const paid = REFUNDABLE.includes(s.status);
                if (window.confirm(paid ? tpay('cancelRefundConfirm') : t('cancelConfirm')))
                  cancel.mutate();
              }}
            >
              {REFUNDABLE.includes(s.status) ? tpay('cancelRefund') : t('cancel')}
            </Button>
          )}
        </aside>
      </div>
    </>
  );
}
