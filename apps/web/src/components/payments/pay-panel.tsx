'use client';

import type { PaymentStart, ShipmentView } from '@mersal/shared';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';

/** Card form for the demo provider. Nothing is charged; it confirms the payment server-side. */
function DemoPaymentSheet({
  payment,
  onClose,
  onPaid,
}: {
  payment: PaymentStart;
  onClose: () => void;
  onPaid: () => void;
}) {
  const t = useTranslations('payment.demo');
  const money = useMoney();
  const describe = useErrorMessage();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(event: FormEvent) {
    event.preventDefault();
    setPaying(true);
    setError(null);
    try {
      await api(`/payments/${payment.paymentId}/confirm-demo`, { method: 'POST' });
      onPaid();
    } catch (err) {
      setError(describe(err));
    } finally {
      setPaying(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('title')}>
      <form onSubmit={pay} className="flex flex-col gap-4">
        <FormAlert tone="info">{t('notice')}</FormAlert>
        {error && <FormAlert>{error}</FormAlert>}
        <Field label={t('card')}>
          <Input
            dir="ltr"
            defaultValue="4242 4242 4242 4242"
            inputMode="numeric"
            autoComplete="off"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('expiry')}>
            <Input dir="ltr" defaultValue="12 / 30" autoComplete="off" />
          </Field>
          <Field label={t('cvc')}>
            <Input dir="ltr" defaultValue="123" autoComplete="off" />
          </Field>
        </div>
        <Button type="submit" size="lg" disabled={paying}>
          {paying ? <Spinner /> : <Lock aria-hidden="true" />}
          {t('submit', { amount: money(payment.amount, payment.currency) })}
        </Button>
      </form>
    </Dialog>
  );
}

export function PayPanel({ shipment }: { shipment: ShipmentView }) {
  const t = useTranslations('payment');
  const locale = useLocale();
  const money = useMoney();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [demo, setDemo] = useState<PaymentStart | null>(null);

  async function start() {
    setStarting(true);
    try {
      const payment = await api<PaymentStart>(
        `/shipments/${shipment.id}/payment?locale=${locale}`,
        { method: 'POST' },
      );
      if (payment.redirectUrl) {
        toast.message(t('redirecting'));
        window.location.assign(payment.redirectUrl);
        return;
      }
      setDemo(payment);
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setStarting(false);
    }
  }

  async function paid() {
    setDemo(null);
    toast.success(t('succeeded'));
    await queryClient.invalidateQueries({ queryKey: ['shipment', shipment.id] });
    await queryClient.invalidateQueries({ queryKey: ['shipments'] });
  }

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-tint/40 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <CreditCard className="size-8 text-primary" aria-hidden="true" />
        <p className="flex-1 text-sm text-ink">
          <ShieldCheck className="me-1 inline size-4 text-primary" aria-hidden="true" />
          {t('secure')}
        </p>
        <Button size="lg" onClick={start} disabled={starting}>
          {starting && <Spinner />}
          {t('pay', { amount: money(shipment.price, shipment.currency) })}
        </Button>
      </div>
      {demo && <DemoPaymentSheet payment={demo} onClose={() => setDemo(null)} onPaid={paid} />}
    </div>
  );
}
