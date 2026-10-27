'use client';

import type { ShipmentView } from '@mersal/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, KeyRound, PackageCheck, Truck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { useErrorMessage } from '@/lib/use-error-message';

function CodeDisplay({ title, body, code }: { title: string; body: string; code: string }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
        <KeyRound className="size-4 text-primary" aria-hidden="true" />
        {title}
      </h3>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.35em] text-ink" dir="ltr">
        {code}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function SenderHandover({ shipment }: { shipment: ShipmentView }) {
  const t = useTranslations('handover');
  const locale = useLocale();
  const trackingUrl = shipment.trackingPath
    ? `${window.location.origin}/${locale}${shipment.trackingPath}`
    : null;

  return (
    <div className="flex flex-col gap-4">
      {shipment.pickupCode && (
        <CodeDisplay
          title={t('pickupCodeTitle')}
          body={t('pickupCodeBody')}
          code={shipment.pickupCode}
        />
      )}
      {shipment.deliveryCode && (
        <CodeDisplay
          title={t('deliveryCodeTitle')}
          body={t('deliveryCodeBody')}
          code={shipment.deliveryCode}
        />
      )}
      {trackingUrl && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(trackingUrl);
              toast.success(t('copied'));
            }}
          >
            <Copy aria-hidden="true" />
            {t('copyLink')}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={trackingUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              {t('openTracking')}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

function TravellerHandover({ shipment }: { shipment: ShipmentView }) {
  const t = useTranslations('handover');
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const step = shipment.status === 'MATCHED' ? 'pickup' : 'deliver';

  async function call(action: 'pickup' | 'deliver' | 'in-transit') {
    setBusy(action);
    setError(null);
    try {
      await api(
        `/shipments/${shipment.id}/${action}`,
        action === 'in-transit' ? { method: 'POST' } : { body: { code } },
      );
      setCode('');
      toast.success(
        t(action === 'pickup' ? 'pickedUp' : action === 'deliver' ? 'delivered' : 'inTransit'),
      );
      await queryClient.invalidateQueries({ queryKey: ['shipment', shipment.id] });
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    } catch (err) {
      setError(describe(err));
      await queryClient.invalidateQueries({ queryKey: ['shipment', shipment.id] });
    } finally {
      setBusy(null);
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void call(step);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-medium text-ink">
          {step === 'pickup' ? t('travellerPickupTitle') : t('travellerDeliveryTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 'pickup' ? t('travellerPickupBody') : t('travellerDeliveryBody')}
        </p>
        {step === 'deliver' && (
          <p className="mt-1 text-sm text-ink">
            {t('recipient', { name: shipment.recipientName })}
          </p>
        )}
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <CodeInput
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          aria-label={t('code')}
          className="sm:max-w-56"
        />
        <Button
          type="submit"
          size="lg"
          disabled={code.length !== 6 || busy !== null}
          className="sm:h-14"
        >
          {busy === step ? <Spinner /> : <PackageCheck aria-hidden="true" />}
          {step === 'pickup' ? t('confirmPickup') : t('confirmDelivery')}
        </Button>
      </form>
      {shipment.codeAttemptsLeft !== null && shipment.codeAttemptsLeft < 5 && (
        <p className="text-sm text-warning">
          {t('attemptsLeft', { count: shipment.codeAttemptsLeft })}
        </p>
      )}
      {shipment.status === 'PICKED_UP' && (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => call('in-transit')}
          disabled={busy !== null}
        >
          {busy === 'in-transit' ? <Spinner /> : <Truck aria-hidden="true" />}
          {t('startJourney')}
        </Button>
      )}
    </div>
  );
}

const ACTIVE = ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'];

export function HandoverPanel({ shipment }: { shipment: ShipmentView }) {
  const t = useTranslations('handover');
  if (!ACTIVE.includes(shipment.status)) return null;
  if (shipment.viewerRole === 'admin') return null;
  if (shipment.viewerRole === 'sender' && !shipment.pickupCode && !shipment.deliveryCode)
    return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-4 font-semibold text-ink">{t('title')}</h2>
      {shipment.viewerRole === 'sender' ? (
        <SenderHandover shipment={shipment} />
      ) : (
        <TravellerHandover shipment={shipment} />
      )}
    </section>
  );
}
