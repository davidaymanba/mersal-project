'use client';

import type { ShipmentView } from '@mersal/shared';
import { DISPUTE_REASONS } from '@mersal/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Flag, ShieldAlert, Star, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select, Textarea } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';
import { PhotoPicker } from './photo-picker';

const STATUS_TONE = { OPEN: 'warning', UNDER_REVIEW: 'info', RESOLVED: 'success' } as const;

function useRefreshShipment(id: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shipment', id] }),
      queryClient.invalidateQueries({ queryKey: ['conversation', id] }),
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    ]);
}

/** Sender's "report a problem" button and form. */
export function ReportProblem({ shipment }: { shipment: ShipmentView }) {
  const t = useTranslations('dispute');
  const describe = useErrorMessage();
  const refresh = useRefreshShipment(shipment.id);
  const inTransit = shipment.status !== 'DELIVERED';
  const reasons = DISPUTE_REASONS.filter(
    (r) => !inTransit || r === 'NOT_DELIVERED' || r === 'LATE',
  );
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(reasons[0]!);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set('reason', reason);
    form.set('description', description);
    photos.forEach((p) => form.append('evidence', p));
    try {
      await api(`/shipments/${shipment.id}/disputes`, { form });
      toast.success(t('sent'));
      setOpen(false);
      await refresh();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" className="text-danger" onClick={() => setOpen(true)}>
        <Flag aria-hidden="true" />
        {t('report')}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('title')} className="max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('body')}</p>
          {error && <FormAlert>{error}</FormAlert>}
          <Field label={t('reason')}>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {t(`reasons.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('description')}>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">{t('photos')}</p>
            <PhotoPicker files={photos} onChange={setPhotos} addLabel="+" />
          </div>
          <Button type="submit" variant="danger" disabled={busy || description.trim().length < 10}>
            {busy && <Spinner />}
            {t('submit')}
          </Button>
        </form>
      </Dialog>
    </>
  );
}

/** Shows the latest reported problem and its outcome to both parties. */
export function DisputeStatus({ shipment }: { shipment: ShipmentView }) {
  const t = useTranslations('dispute');
  const money = useMoney();
  const d = shipment.dispute;
  if (!d) return null;
  return (
    <section className="rounded-2xl border border-warning/30 bg-warning-tint/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <ShieldAlert className="size-5 text-warning" aria-hidden="true" />
          {t('panelTitle')}
        </h2>
        <Badge tone={STATUS_TONE[d.status]}>{t(`status.${d.status}`)}</Badge>
      </div>
      <p className="mt-3 text-sm font-medium text-ink">{t(`reasons.${d.reason as 'OTHER'}`)}</p>
      <p className="mt-1 text-sm text-ink/80">{d.description}</p>
      {d.resolution && (
        <p className="mt-4 rounded-lg bg-surface p-3 text-sm text-ink">
          <span className="font-medium">
            {d.resolution === 'PARTIAL_REFUND'
              ? t('resolution.PARTIAL_REFUND', { amount: money(d.refundAmount, shipment.currency) })
              : t(`resolution.${d.resolution}`)}
          </span>
          {d.resolutionNote && (
            <span className="mt-1 block text-muted-foreground">
              {t('teamNote', { note: d.resolutionNote })}
            </span>
          )}
        </p>
      )}
    </section>
  );
}

function Stars({
  value,
  onChange,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations('review');
  return (
    <div
      className="flex gap-1"
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={t('stars', { count: value })}
    >
      {[1, 2, 3, 4, 5].map((n) =>
        readOnly ? (
          <Star
            key={n}
            className={cn('size-5', n <= value ? 'fill-accent text-accent' : 'text-border')}
            aria-hidden="true"
          />
        ) : (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={t('stars', { count: n })}
            onClick={() => onChange?.(n)}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn('size-7', n <= value ? 'fill-accent text-accent' : 'text-border')}
              aria-hidden="true"
            />
          </button>
        ),
      )}
    </div>
  );
}

export function ReviewPanel({ shipment }: { shipment: ShipmentView }) {
  const t = useTranslations('review');
  const describe = useErrorMessage();
  const refresh = useRefreshShipment(shipment.id);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  if (!shipment.canReview && !shipment.review) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api(`/shipments/${shipment.id}/review`, {
        body: { rating, comment: comment || undefined },
      });
      toast.success(t('sent'));
      await refresh();
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-xs p-6">
      {shipment.review ? (
        <>
          <h2 className="font-semibold text-ink">{t('yours')}</h2>
          <div className="mt-3">
            <Stars value={shipment.review.rating} readOnly />
          </div>
          {shipment.review.comment && (
            <p className="mt-2 text-sm text-muted-foreground">{shipment.review.comment}</p>
          )}
        </>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-ink">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">
              {shipment.viewerRole === 'sender' ? t('rateTraveller') : t('rateSender')}
            </p>
          </div>
          <Stars value={rating} onChange={setRating} />
          <Field label={t('comment')}>
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
          </Field>
          <Button type="submit" className="self-start" disabled={!rating || busy}>
            {busy && <Spinner />}
            {t('submit')}
          </Button>
        </form>
      )}
    </section>
  );
}

/** Traveller hands back a parcel they accepted, before pickup. */
export function WithdrawButton({ shipment }: { shipment: ShipmentView }) {
  const t = useTranslations('withdraw');
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api(`/shipments/${shipment.id}/withdraw`, { body: { reason } });
      toast.success(t('done'));
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['shipment', shipment.id] });
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" className="text-danger" onClick={() => setOpen(true)}>
        <Undo2 aria-hidden="true" />
        {t('action')}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('title')}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormAlert tone="info">{t('body')}</FormAlert>
          <Field label={t('reason')}>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button type="submit" variant="danger" disabled={busy || reason.trim().length < 3}>
            {busy && <Spinner />}
            {t('submit')}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
