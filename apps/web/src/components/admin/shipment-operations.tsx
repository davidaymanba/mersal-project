'use client';

import type { PaymentStatus, ShipmentStatus } from '@mersal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, KeyRound, RotateCcw } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';

interface Payment {
  id: string;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  currency: string;
  provider: string;
  createdAt: string;
}

const CANCELLABLE: ShipmentStatus[] = ['PAID', 'MATCHING', 'NO_MATCH', 'MATCHED'];
const HANDOVER: ShipmentStatus[] = ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'];
const PAYMENT_TONE = {
  REQUIRES_PAYMENT: 'neutral',
  PROCESSING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'danger',
  REFUNDED: 'warning',
  PARTIALLY_REFUNDED: 'warning',
} as const;

/** Support tools on a shipment: hand-over codes, payments, cancellation with refund. */
export function ShipmentOperations({
  shipmentId,
  status,
  pickupCode,
  deliveryCode,
}: {
  shipmentId: string;
  status: ShipmentStatus;
  pickupCode: string | null;
  deliveryCode: string | null;
}) {
  const t = useTranslations('admin.shipments.detail');
  const tp = useTranslations('admin.payments.status');
  const money = useMoney();
  const format = useFormatter();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

  const payments = useQuery({
    queryKey: ['admin', 'shipment', shipmentId, 'payments'],
    queryFn: () => api<Payment[]>(`/admin/shipments/${shipmentId}/payments`),
  });
  const reset = useMutation({
    mutationFn: () => api(`/admin/shipments/${shipmentId}/reset-code-attempts`, { method: 'POST' }),
    onSuccess: () => toast.success(t('attemptsReset')),
    onError: (e) => toast.error(describe(e)),
  });
  const cancel = useMutation({
    mutationFn: () => api(`/admin/shipments/${shipmentId}/cancel`, { body: { reason } }),
    onSuccess: () => {
      toast.success(t('cancelled'));
      setReason('');
      return refresh();
    },
    onError: (e) => toast.error(describe(e)),
  });

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border bg-surface shadow-xs p-6">
      {HANDOVER.includes(status) && (pickupCode || deliveryCode) && (
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <KeyRound className="size-4 text-primary" aria-hidden="true" />
            {t('codes')}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {pickupCode && (
              <div className="rounded-lg bg-muted p-3">
                <dt className="text-muted-foreground">{t('pickupCode')}</dt>
                <dd className="font-mono text-lg font-semibold tracking-widest text-ink" dir="ltr">
                  {pickupCode}
                </dd>
              </div>
            )}
            {deliveryCode && (
              <div className="rounded-lg bg-muted p-3">
                <dt className="text-muted-foreground">{t('deliveryCode')}</dt>
                <dd className="font-mono text-lg font-semibold tracking-widest text-ink" dir="ltr">
                  {deliveryCode}
                </dd>
              </div>
            )}
          </dl>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => reset.mutate()}
            disabled={reset.isPending}
          >
            <RotateCcw aria-hidden="true" />
            {t('resetAttempts')}
          </Button>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-ink">{t('payments')}</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {payments.data?.length === 0 && <li className="py-2 text-muted-foreground">—</li>}
          {payments.data?.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-medium text-ink tabular-nums">
                {money(p.amount, p.currency)}
              </span>
              {p.refundedAmount > 0 && (
                <span className="text-muted-foreground">
                  −{money(p.refundedAmount, p.currency)}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {p.provider} ·{' '}
                {format.dateTime(new Date(p.createdAt), { dateStyle: 'short', timeStyle: 'short' })}
              </span>
              <Badge tone={PAYMENT_TONE[p.status]} className="ms-auto">
                {tp(p.status)}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {CANCELLABLE.includes(status) && (
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <Field label={t('cancelReason')}>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button
            variant="danger"
            className="self-start"
            disabled={reason.trim().length < 3 || cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            <Ban aria-hidden="true" />
            {t('cancelRefund')}
          </Button>
        </div>
      )}
    </section>
  );
}
