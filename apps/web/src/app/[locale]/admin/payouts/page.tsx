'use client';

import type { Paginated, PayoutStatus } from '@mersal/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hourglass, Play, RotateCw } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';

interface AdminPayout {
  id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
  traveller: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    payoutAccountLabel: string | null;
  };
}

const TONE = {
  SCHEDULED: 'neutral',
  PROCESSING: 'info',
  PAID: 'success',
  FAILED: 'danger',
} as const;

export default function AdminPayoutsPage() {
  const t = useTranslations('admin.payouts');
  const tw = useTranslations('wallet.payoutStatus');
  const tc = useTranslations('common');
  const money = useMoney();
  const format = useFormatter();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['admin', 'payouts', page],
    queryFn: () =>
      api<Paginated<AdminPayout> & { availableToPay: number }>(`/admin/payouts?page=${page}`),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });

  const run = useMutation({
    mutationFn: () =>
      api<{ paid: number; failed: number; skipped: number }>('/admin/payouts/run', {
        method: 'POST',
      }),
    onSuccess: (r) => {
      toast.success(t('ran', r));
      return refresh();
    },
    onError: (e) => toast.error(describe(e)),
  });
  const release = useMutation({
    mutationFn: () => api<{ released: number }>('/admin/payouts/release-holds', { method: 'POST' }),
    onSuccess: (r) => {
      toast.success(t('released', { count: r.released }));
      return refresh();
    },
  });
  const retry = useMutation({
    mutationFn: (id: string) => api(`/admin/payouts/${id}/retry`, { method: 'POST' }),
    onSuccess: refresh,
    onError: (e) => toast.error(describe(e)),
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => release.mutate()}
              disabled={release.isPending}
            >
              <Hourglass aria-hidden="true" />
              {t('release')}
            </Button>
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              <Play aria-hidden="true" />
              {t('run')}
            </Button>
          </>
        }
      />
      {list.data && (
        <div className="mb-6 sm:max-w-xs">
          <StatCard label={t('available')} value={money(list.data.availableToPay, 'EUR')} />
        </div>
      )}
      {!list.data ? (
        <PageSpinner />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={tc('empty')} />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>{t('columns.traveller')}</th>
                <th>{t('columns.account')}</th>
                <th>{t('columns.amount')}</th>
                <th>{t('columns.status')}</th>
                <th>{t('columns.date')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/admin/users/${p.traveller.id}`}
                      className="font-medium text-ink hover:text-primary"
                    >
                      {p.traveller.firstName} {p.traveller.lastName}
                    </Link>
                  </td>
                  <td className="text-muted-foreground">{p.traveller.payoutAccountLabel ?? '—'}</td>
                  <td className="text-ink tabular-nums">{money(p.amount, p.currency)}</td>
                  <td>
                    <Badge tone={TONE[p.status]}>{tw(p.status)}</Badge>
                    {p.failureReason && (
                      <span className="mt-1 block text-xs text-danger">{p.failureReason}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {format.dateTime(new Date(p.paidAt ?? p.createdAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="text-end">
                    {p.status === 'FAILED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => retry.mutate(p.id)}
                        disabled={retry.isPending}
                      >
                        <RotateCw aria-hidden="true" />
                        {t('retry')}
                      </Button>
                    )}
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
