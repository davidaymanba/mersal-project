'use client';

import type { AdminTravellerRow, AdminTravellersResponse } from '@mersal/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search, Star } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDeferredValue, useState } from 'react';
import { AccountBadge, TravellerBadge } from '@/components/admin/status-badges';
import { Avatar } from '@/components/shell/user-menu';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { EmptyState, PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useMoney } from '@/lib/catalog';

const PAGE_SIZE = 20;
const STATUSES = ['APPROVED', 'PENDING', 'REJECTED'] as const;
const SORTS = ['recent', 'reliability', 'parcels'] as const;

/** Score as a thin single-hue bar; the percentage next to it carries the value. */
function Reliability({ score }: { score: number }) {
  const format = useFormatter();
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </span>
      <span className="text-ink">{format.number(score, { style: 'percent' })}</span>
    </span>
  );
}

export default function AdminTravellersPage() {
  const t = useTranslations('admin.travellers');
  const tc = useTranslations('common');
  const tt = useTranslations('app.travellerStatus');
  const format = useFormatter();
  const money = useMoney();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]>('recent');
  const [page, setPage] = useState(1);
  const search = useDeferredValue(q);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort });
  if (search) params.set('q', search);
  if (status) params.set('status', status);

  const list = useQuery({
    queryKey: ['admin', 'travellers', params.toString()],
    queryFn: () => api<AdminTravellersResponse>(`/admin/travellers?${params}`),
    placeholderData: keepPreviousData,
  });

  const summary = list.data?.summary;
  const percent = (value: number | null) =>
    value === null ? '—' : format.number(value, { style: 'percent' });
  const reset =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  const rating = (row: AdminTravellerRow) =>
    row.ratingAvg === null ? (
      <span className="text-muted-foreground" title={t('noRating')}>
        —<span className="sr-only">{t('noRating')}</span>
      </span>
    ) : (
      <span className="flex items-center gap-1 whitespace-nowrap text-ink">
        <Star className="size-3.5 fill-current text-accent" aria-hidden="true" />
        {format.number(row.ratingAvg, { maximumFractionDigits: 1 })}
        <span className="text-xs text-muted-foreground">({row.ratingCount})</span>
      </span>
    );

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />

      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t('summary.approved')} value={format.number(summary.approved)} />
          <StatCard
            label={t('summary.pending')}
            value={format.number(summary.pending)}
            footer={
              summary.pending > 0 && (
                <Link
                  href="/admin/verifications"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t('summary.review')}
                </Link>
              )
            }
          />
          <StatCard
            label={t('summary.withOpenTrips')}
            value={format.number(summary.withOpenTrips)}
          />
          <StatCard label={t('summary.avgReliability')} value={percent(summary.avgReliability)} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => reset(setQ)(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="ps-9"
            aria-label={tc('search')}
          />
        </div>
        <Select
          value={status}
          onChange={(e) => reset(setStatus)(e.target.value)}
          className="w-auto"
          aria-label={t('status')}
        >
          <option value="">
            {t('status')}: {tc('all')}
          </option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {tt(s)}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(e) => reset(setSort)(e.target.value as (typeof SORTS)[number])}
          className="w-auto"
          aria-label={t('sort')}
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t('sort')}: {t(`sorts.${s}`)}
            </option>
          ))}
        </Select>
      </div>

      {!list.data ? (
        <PageSpinner />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={tc('results', { count: 0 })} />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>{t('columns.traveller')}</th>
                <th>{t('columns.verification')}</th>
                <th>{t('columns.reliability')}</th>
                <th>{t('columns.rating')}</th>
                <th>{t('columns.response')}</th>
                <th>{t('columns.parcels')}</th>
                <th>{t('columns.nextTrip')}</th>
                <th>{t('columns.wallet')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((row) => (
                <tr key={row.id} className="hover:bg-muted/40">
                  <td>
                    <Link
                      href={`/admin/users/${row.id}`}
                      className="flex items-center gap-3 hover:text-primary"
                    >
                      <Avatar
                        firstName={row.firstName}
                        lastName={row.lastName}
                        className="size-8"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium whitespace-nowrap text-ink">
                          {row.firstName} {row.lastName}
                        </span>
                        <span className="block text-xs text-muted-foreground" dir="ltr">
                          {row.email}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="flex flex-col items-start gap-1">
                      <TravellerBadge status={row.travellerStatus} />
                      {row.accountStatus === 'SUSPENDED' && <AccountBadge status="SUSPENDED" />}
                    </span>
                  </td>
                  <td>
                    <Reliability score={row.reliabilityScore} />
                  </td>
                  <td>{rating(row)}</td>
                  <td className="text-ink">{percent(row.responseRate)}</td>
                  <td className="whitespace-nowrap">
                    <span className="block text-ink">
                      {t('parcels', {
                        delivered: row.parcels.delivered,
                        active: row.parcels.active,
                      })}
                    </span>
                    {row.parcels.disputed > 0 && (
                      <Badge tone="warning" className="mt-1">
                        {t('disputed', { count: row.parcels.disputed })}
                      </Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {row.trips.nextDeparture ? (
                      <>
                        <span className="block text-ink">
                          {format.dateTime(new Date(row.trips.nextDeparture), {
                            dateStyle: 'medium',
                          })}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {t('openTrips', { count: row.trips.open })}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground" title={t('noTrip')}>
                        —<span className="sr-only">{t('noTrip')}</span>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="block text-ink">
                      {t('available', { amount: money(row.wallet.available) })}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t('held', { amount: money(row.wallet.held) })}
                    </span>
                    {row.wallet.blocked > 0 && (
                      <span className="block text-xs text-warning">
                        {t('blocked', { amount: money(row.wallet.blocked) })}
                      </span>
                    )}
                    <span
                      className={
                        row.payoutsEnabled
                          ? 'mt-0.5 block text-xs text-success'
                          : 'mt-0.5 block text-xs text-muted-foreground'
                      }
                    >
                      {row.payoutsEnabled ? t('payoutsReady') : t('payoutsMissing')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
