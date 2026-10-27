'use client';

import type { AdminAnalytics, ShipmentStatus } from '@mersal/shared';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Gauge,
  Hourglass,
  Lock,
  PackageX,
  Percent,
  Plane,
  ShieldAlert,
  Undo2,
  Wallet,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { BarList } from '@/components/charts/bar-list';
import { CountUp } from '@/components/motion/count-up';
import { LineChart } from '@/components/charts/line-chart';
import { SERIES_COLORS } from '@/components/charts/palette';
import { useAdminOverview } from '@/components/shell/admin-shell';
import { PageHeader, StatCard } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useCountryName, useMoney } from '@/lib/catalog';

function Panel({
  title,
  children,
  table,
}: {
  title: string;
  children: ReactNode;
  table?: ReactNode;
}) {
  const t = useTranslations('admin.overview');
  return (
    <section className="animate-fade-up rounded-2xl border border-border bg-surface p-6 shadow-xs [animation-delay:0.2s]">
      <h2 className="mb-5 font-semibold text-ink">{title}</h2>
      {children}
      {table && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-ink">
            {t('showTable')}
          </summary>
          <div className="mt-3 max-h-72 overflow-auto">{table}</div>
        </details>
      )}
    </section>
  );
}

function Attention({
  href,
  icon,
  label,
  count,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`group/link flex animate-fade-up items-center gap-3 rounded-2xl border p-4 shadow-xs transition-[background-color,box-shadow,translate] duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-md ${count ? 'border-warning/30 bg-warning-tint/60 hover:bg-warning-tint' : 'border-border bg-surface'}`}
    >
      <span
        className={`flex size-9 items-center justify-center rounded-xl ${count ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm text-ink">{label}</span>
      <span className="font-display text-xl font-semibold text-ink tabular-nums">{count}</span>
      <ArrowRight className="size-4 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
    </Link>
  );
}

export default function AdminOverviewPage() {
  const t = useTranslations('admin.overview');
  const tv = useTranslations('admin.verifications');
  const ts = useTranslations('shipmentStatus');
  const format = useFormatter();
  const money = useMoney();
  const country = useCountryName();
  const counts = useAdminOverview();
  const analytics = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api<AdminAnalytics>('/admin/analytics'),
    refetchInterval: 60_000,
  });

  if (!analytics.data || !counts.data) return <PageSpinner />;
  const a = analytics.data;
  const k = a.kpis;
  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00`), { day: 'numeric', month: 'short' });
  const series = [
    { key: 'created', label: t('series.created'), color: SERIES_COLORS[0] },
    { key: 'paid', label: t('series.paid'), color: SERIES_COLORS[1] },
    { key: 'delivered', label: t('series.delivered'), color: SERIES_COLORS[2] },
  ];
  const routeLabel = (code: string) => code.split('-').map(country).join(' → ');

  return (
    <>
      <PageHeader title={t('title')} />

      <div className="grid gap-3 md:grid-cols-3">
        <Attention
          href="/admin/verifications"
          icon={<BadgeCheck className="size-5" aria-hidden="true" />}
          label={tv('title')}
          count={counts.data.pendingVerifications}
        />
        <Attention
          href="/admin/disputes"
          icon={<ShieldAlert className="size-5" aria-hidden="true" />}
          label={t('openDisputes')}
          count={k.openDisputes}
        />
        <Attention
          href="/admin/shipments"
          icon={<PackageX className="size-5" aria-hidden="true" />}
          label={t('noMatch')}
          count={counts.data.noMatch}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          icon={Coins}
          label={t('gmv')}
          value={<CountUp value={k.gmv} format={(v) => money(Math.round(v), a.currency)} />}
        />
        <StatCard
          index={1}
          icon={Percent}
          label={t('commission')}
          value={<CountUp value={k.commission} format={(v) => money(Math.round(v), a.currency)} />}
        />
        <StatCard
          index={2}
          icon={Gauge}
          label={t('matchRate')}
          value={
            k.matchRate === null ? (
              '—'
            ) : (
              <CountUp value={k.matchRate} format={(v) => format.number(v, { style: 'percent' })} />
            )
          }
        />
        <StatCard
          index={3}
          icon={Hourglass}
          label={t('timeToMatch')}
          value={
            k.avgHoursToMatch === null
              ? '—'
              : t('hours', {
                  value: format.number(k.avgHoursToMatch, { maximumFractionDigits: 1 }),
                })
          }
        />
        <StatCard
          index={4}
          icon={Lock}
          label={t('heldFunds')}
          value={<CountUp value={k.heldFunds} format={(v) => money(Math.round(v), a.currency)} />}
        />
        <StatCard
          index={5}
          icon={Wallet}
          label={t('availableToPay')}
          value={
            <CountUp value={k.availableToPay} format={(v) => money(Math.round(v), a.currency)} />
          }
        />
        <StatCard
          index={6}
          icon={Undo2}
          label={t('refunds')}
          value={<CountUp value={k.refunds} format={(v) => money(Math.round(v), a.currency)} />}
        />
        <StatCard
          index={7}
          icon={Plane}
          label={t('activeTrips')}
          value={<CountUp value={k.activeTrips} format={(v) => format.number(Math.round(v))} />}
        />
      </div>

      <div className="mt-6">
        <Panel
          title={t('activity')}
          table={
            <table className="w-full text-start text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 text-start font-medium">{t('date')}</th>
                  {series.map((s) => (
                    <th key={s.key} className="py-1 text-end font-medium">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {a.daily.map((d) => (
                  <tr key={d.date} className="border-t border-border">
                    <td className="py-1.5">{day(d.date)}</td>
                    <td className="py-1.5 text-end">{d.created}</td>
                    <td className="py-1.5 text-end">{d.paid}</td>
                    <td className="py-1.5 text-end">{d.delivered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <LineChart
            label={t('activity')}
            data={a.daily.map((d) => ({
              x: d.date,
              values: { created: d.created, paid: d.paid, delivered: d.delivered },
            }))}
            series={series}
            formatX={day}
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={t('byStatus')}>
          <BarList
            items={a.byStatus.map((s) => ({
              key: s.status,
              label: ts(s.status as ShipmentStatus),
              value: s.count,
            }))}
          />
        </Panel>
        <Panel title={t('byCorridor')}>
          <BarList
            items={a.byCorridor.map((c) => ({
              key: c.corridor,
              label: routeLabel(c.corridor),
              value: c.gmv,
            }))}
            formatValue={(v) => money(v, a.currency)}
          />
        </Panel>
      </div>
    </>
  );
}
