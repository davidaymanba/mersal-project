'use client';

import { PayoutAccountSchema, type WalletView } from '@mersal/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Building2, Clock, Hourglass, Lock, Wallet } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { CountUp } from '@/components/motion/count-up';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';

const PAYOUT_TONE = {
  SCHEDULED: 'neutral',
  PROCESSING: 'info',
  PAID: 'success',
  FAILED: 'danger',
} as const;

function Balance({
  label,
  hint,
  amount,
  icon,
  highlight,
}: {
  label: string;
  hint: string;
  amount: ReactNode;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'animate-fade-up rounded-2xl p-5',
        highlight
          ? 'bg-deep-glow text-white shadow-md'
          : 'border border-border bg-surface shadow-xs',
      )}
    >
      <p
        className={cn(
          'flex items-center gap-2 text-sm',
          highlight ? 'text-white/70' : 'text-muted-foreground',
        )}
      >
        {icon}
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{amount}</p>
      <p className={cn('mt-1 text-xs', highlight ? 'text-white/60' : 'text-muted-foreground')}>
        {hint}
      </p>
    </div>
  );
}

function PayoutAccount({ wallet }: { wallet: WalletView }) {
  const t = useTranslations('wallet.account');
  const locale = useLocale();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(!wallet.payoutAccount.ready);
  const [holderName, setHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = PayoutAccountSchema.safeParse({ holderName, iban }).success;

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = wallet.payoutAccount.provider === 'demo' ? { holderName, iban } : {};
      const res = await api<{ ready: boolean; onboardingUrl?: string }>(
        `/wallet/payout-account?locale=${locale}`,
        { body },
      );
      if (res.onboardingUrl) {
        window.location.assign(res.onboardingUrl);
        return;
      }
      toast.success(t('saved'));
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-xs p-6">
      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <Building2 className="size-5 text-primary" aria-hidden="true" />
        {t('title')}
      </h2>
      {!editing && wallet.payoutAccount.ready ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink">
            {t('ready', { label: wallet.payoutAccount.label ?? '' })}
          </p>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {t('change')}
          </Button>
        </div>
      ) : wallet.payoutAccount.provider === 'stripe' ? (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">{t('stripeBody')}</p>
          <Button onClick={() => save()} disabled={busy}>
            {busy && <Spinner />}
            {t('stripe')}
          </Button>
        </div>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('none')}</p>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('holder')}>
              <Input
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label={t('iban')}>
              <Input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                dir="ltr"
                placeholder="FR76 3000 6000 0112 3456 7890 189"
              />
            </Field>
          </div>
          <Button type="submit" className="self-start" disabled={!valid || busy}>
            {busy ? <Spinner /> : <Lock aria-hidden="true" />}
            {t('save')}
          </Button>
        </form>
      )}
    </section>
  );
}

export default function WalletPage() {
  const t = useTranslations('wallet');
  const money = useMoney();
  const format = useFormatter();
  const wallet = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api<WalletView>('/wallet'),
    refetchInterval: 20_000,
  });

  if (!wallet.data) return <PageSpinner />;
  const w = wallet.data;
  const hours =
    w.holdHours >= 1
      ? format.number(w.holdHours, { style: 'unit', unit: 'hour', unitDisplay: 'long' })
      : format.number(Math.round(w.holdHours * 60), {
          style: 'unit',
          unit: 'minute',
          unitDisplay: 'long',
        });
  const date = (iso: string, withTime = false) =>
    format.dateTime(
      new Date(iso),
      withTime
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { weekday: 'long', day: 'numeric', month: 'long' },
    );

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle', { hours })} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Balance
          label={t('available')}
          hint={t('availableHint', { date: date(w.nextPayoutAt) })}
          amount={
            <CountUp
              value={w.balances.available}
              format={(v) => money(Math.round(v), w.currency)}
            />
          }
          icon={<Wallet className="size-4" aria-hidden="true" />}
          highlight
        />
        <Balance
          label={t('held')}
          hint={t('heldHint')}
          amount={
            <CountUp value={w.balances.held} format={(v) => money(Math.round(v), w.currency)} />
          }
          icon={<Hourglass className="size-4" aria-hidden="true" />}
        />
        <Balance
          label={t('expected')}
          hint={t('expectedHint')}
          amount={
            <CountUp value={w.balances.expected} format={(v) => money(Math.round(v), w.currency)} />
          }
          icon={<Clock className="size-4" aria-hidden="true" />}
        />
        <Balance
          label={t('paidOut')}
          hint={
            w.balances.blocked ? `${t('blocked')}: ${money(w.balances.blocked, w.currency)}` : ' '
          }
          amount={
            <CountUp value={w.balances.paidOut} format={(v) => money(Math.round(v), w.currency)} />
          }
          icon={<Banknote className="size-4" aria-hidden="true" />}
        />
      </div>

      <div className="mt-6">
        <PayoutAccount key={String(w.payoutAccount.ready)} wallet={w} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-2xl border border-border bg-surface shadow-xs p-6">
          <h2 className="font-semibold text-ink">{t('activity')}</h2>
          {w.entries.length === 0 ? (
            <div className="mt-4">
              <EmptyState title={t('noActivity')} />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {w.entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                  <span className="font-medium text-ink">
                    {t(`entry.${e.type}` as 'entry.ADJUSTMENT')}
                  </span>
                  {e.shipment && (
                    <Link
                      href={`/app/shipments/${e.shipment.id}`}
                      className="font-mono text-xs text-muted-foreground hover:text-primary"
                      dir="ltr"
                    >
                      {e.shipment.reference}
                    </Link>
                  )}
                  <span className="ms-auto font-medium text-ink tabular-nums">
                    {money(e.amount, e.currency)}
                  </span>
                  <span className="w-full text-xs text-muted-foreground">
                    {date(e.createdAt, true)}
                    {e.bucket === 'HELD' &&
                      e.releaseAt &&
                      ` · ${t('releases', { date: date(e.releaseAt, true) })}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-xs p-6 lg:self-start">
          <h2 className="font-semibold text-ink">{t('payouts')}</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {w.payouts.length === 0 && <li className="text-sm text-muted-foreground">—</li>}
            {w.payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="block font-medium text-ink tabular-nums">
                    {money(p.amount, p.currency)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {date(p.paidAt ?? p.createdAt, true)}
                  </span>
                </span>
                <Badge tone={PAYOUT_TONE[p.status]}>{t(`payoutStatus.${p.status}`)}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
