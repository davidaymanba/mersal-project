'use client';

import type { DisputeView, LocalizedText } from '@mersal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Gavel, Search } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { ChatPanel } from '@/components/shipments/chat-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { StatCard } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api, apiUrl } from '@/lib/api';
import { useLocalized, useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  reliabilityScore?: number;
};

interface DisputeDetail extends DisputeView {
  blockedAmount: number;
  refundable: number;
  resolvedBy: { firstName: string; lastName: string } | null;
  shipment: {
    id: string;
    reference: string;
    status: string;
    price: number | null;
    travellerEarning: number | null;
    currency: string;
    description: string;
    sender: Person;
    traveller: Person | null;
    originCity: { names: LocalizedText };
    destinationCity: { names: LocalizedText };
  };
}

const TONE = { OPEN: 'warning', UNDER_REVIEW: 'info', RESOLVED: 'success' } as const;

export default function AdminDisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('admin.disputes.detail');
  const td = useTranslations('dispute');
  const tc = useTranslations('common');
  const money = useMoney();
  const localized = useLocalized();
  const format = useFormatter();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const [resolution, setResolution] = useState<
    'FULL_REFUND' | 'PARTIAL_REFUND' | 'RELEASE_TO_TRAVELLER'
  >('RELEASE_TO_TRAVELLER');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const dispute = useQuery({
    queryKey: ['admin', 'dispute', id],
    queryFn: () => api<DisputeDetail>(`/admin/disputes/${id}`),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] });
  const review = useMutation({
    mutationFn: () => api(`/admin/disputes/${id}/review`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const resolve = useMutation({
    mutationFn: () =>
      api(`/admin/disputes/${id}/resolve`, {
        body: {
          resolution,
          note,
          refundAmount:
            resolution === 'PARTIAL_REFUND'
              ? Math.round(Number(amount.replace(',', '.')) * 100)
              : undefined,
        },
      }),
    onSuccess: () => {
      toast.success(t('resolved'));
      return refresh();
    },
    onError: (e) => toast.error(describe(e)),
  });

  if (!dispute.data) return <PageSpinner />;
  const d = dispute.data;
  const s = d.shipment;
  const person = (p: Person | null) => (p ? `${p.firstName} ${p.lastName}` : '—');

  return (
    <>
      <Link
        href="/admin/disputes"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {tc('back')}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/admin/shipments/${s.id}`}
            className="font-mono text-sm text-muted-foreground hover:text-primary"
            dir="ltr"
          >
            {s.reference}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{td(`reasons.${d.reason}`)}</h1>
          <p className="mt-1 text-muted-foreground">
            {localized(s.originCity.names)} → {localized(s.destinationCity.names)} ·{' '}
            {format.dateTime(new Date(d.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <Badge tone={TONE[d.status]}>{td(`status.${d.status}`)}</Badge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('blocked')}
          value={money(d.blockedAmount || s.travellerEarning, s.currency)}
        />
        <StatCard label={t('refundable')} value={money(d.refundable, s.currency)} />
        <div className="rounded-xl border border-border bg-surface shadow-xs p-5 text-sm">
          <p className="text-muted-foreground">{t('sender')}</p>
          <Link
            href={`/admin/users/${s.sender.id}`}
            className="font-medium text-ink hover:text-primary"
          >
            {person(s.sender)}
          </Link>
          <p className="mt-3 text-muted-foreground">{t('traveller')}</p>
          {s.traveller ? (
            <Link
              href={`/admin/users/${s.traveller.id}`}
              className="font-medium text-ink hover:text-primary"
            >
              {person(s.traveller)} ·{' '}
              {t('reliability', {
                value: format.number(s.traveller.reliabilityScore ?? 0, {
                  maximumFractionDigits: 2,
                }),
              })}
            </Link>
          ) : (
            '—'
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-border bg-surface shadow-xs p-6">
            <h2 className="font-semibold text-ink">{t('description')}</h2>
            <p className="mt-2 whitespace-pre-wrap text-ink">{d.description}</p>
            {d.evidence.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-ink">{t('evidence')}</h3>
                <div className="mt-2 flex flex-wrap gap-3">
                  {d.evidence.map((src) => (
                    <a
                      key={src}
                      href={apiUrl(src)}
                      target="_blank"
                      rel="noreferrer"
                      className="size-28 overflow-hidden rounded-xl border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- private file served with session cookies */}
                      <img src={apiUrl(src)} alt="" className="size-full object-cover" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </section>
          <ChatPanel shipmentId={s.id} viewerId="" readOnly />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {d.status === 'RESOLVED' ? (
            <section className="rounded-2xl border border-border bg-surface shadow-xs p-6 text-sm">
              <p className="font-semibold text-ink">
                {d.resolution === 'PARTIAL_REFUND'
                  ? td('resolution.PARTIAL_REFUND', { amount: money(d.refundAmount, s.currency) })
                  : td(`resolution.${d.resolution!}`)}
              </p>
              <p className="mt-2 text-muted-foreground">{d.resolutionNote}</p>
              {d.resolvedBy && d.resolvedAt && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {d.resolvedBy.firstName} {d.resolvedBy.lastName} ·{' '}
                  {format.dateTime(new Date(d.resolvedAt), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </section>
          ) : (
            <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface shadow-xs p-6">
              {d.status === 'OPEN' && (
                <Button
                  variant="secondary"
                  onClick={() => review.mutate()}
                  disabled={review.isPending}
                >
                  <Search aria-hidden="true" />
                  {t('startReview')}
                </Button>
              )}
              <Field label={t('resolution')}>
                <Select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as typeof resolution)}
                >
                  {(['RELEASE_TO_TRAVELLER', 'PARTIAL_REFUND', 'FULL_REFUND'] as const).map((r) => (
                    <option key={r} value={r}>
                      {r === 'PARTIAL_REFUND'
                        ? td('resolution.PARTIAL_REFUND', { amount: '…' })
                        : td(`resolution.${r}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              {resolution === 'PARTIAL_REFUND' && (
                <Field label={t('refundAmount')} hint={`≤ ${money(d.refundable, s.currency)}`}>
                  <Input
                    inputMode="decimal"
                    dir="ltr"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
              )}
              <Field label={t('note')}>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              {resolution === 'FULL_REFUND' && (
                <FormAlert tone="info">{money(d.refundable, s.currency)}</FormAlert>
              )}
              <Button
                onClick={() => resolve.mutate()}
                disabled={
                  resolve.isPending ||
                  note.trim().length < 3 ||
                  (resolution === 'PARTIAL_REFUND' && !Number(amount.replace(',', '.')))
                }
              >
                {resolve.isPending ? <Spinner /> : <Gavel aria-hidden="true" />}
                {t('resolve')}
              </Button>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
