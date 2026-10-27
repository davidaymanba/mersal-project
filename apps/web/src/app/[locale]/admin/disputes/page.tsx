'use client';

import type { DisputeView, Paginated } from '@mersal/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PageHeader, Pagination, Table } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useMoney } from '@/lib/catalog';
import { cn } from '@/lib/utils';

type Row = DisputeView & {
  shipment: {
    id: string;
    reference: string;
    price: number | null;
    travellerEarning: number | null;
    currency: string;
  };
  openedBy: { firstName: string; lastName: string } | null;
};

const STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED'] as const;
const TONE = { OPEN: 'warning', UNDER_REVIEW: 'info', RESOLVED: 'success' } as const;

export default function AdminDisputesPage() {
  const t = useTranslations('admin.disputes');
  const td = useTranslations('dispute');
  const money = useMoney();
  const format = useFormatter();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('OPEN');
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['admin', 'disputes', status, page],
    queryFn: () => api<Paginated<Row>>(`/admin/disputes?status=${status}&page=${page}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title={t('title')} />
      <div
        className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1 sm:w-fit"
        role="tablist"
      >
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={cn(
              'flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              status === s ? 'bg-ink text-white' : 'text-muted-foreground hover:text-ink',
            )}
          >
            {td(`status.${s}`)}
          </button>
        ))}
      </div>
      {!list.data ? (
        <PageSpinner />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>{t('columns.shipment')}</th>
                <th>{t('columns.reason')}</th>
                <th>{t('columns.openedBy')}</th>
                <th>{t('columns.amount')}</th>
                <th>{t('columns.status')}</th>
                <th>{t('columns.date')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((d) => (
                <tr key={d.id} className="hover:bg-muted/40">
                  <td>
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className="font-mono text-xs font-medium text-ink hover:text-primary"
                      dir="ltr"
                    >
                      {d.shipment.reference}
                    </Link>
                  </td>
                  <td className="text-ink">{td(`reasons.${d.reason}`)}</td>
                  <td className="text-muted-foreground">
                    {d.openedBy
                      ? `${d.openedBy.firstName} ${d.openedBy.lastName}`
                      : t('detail.system')}
                  </td>
                  <td className="text-ink tabular-nums">
                    {money(d.shipment.price, d.shipment.currency)}
                  </td>
                  <td>
                    <Badge tone={TONE[d.status]}>{td(`status.${d.status}`)}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {format.dateTime(new Date(d.createdAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            onChange={setPage}
          />
        </>
      )}
    </>
  );
}
