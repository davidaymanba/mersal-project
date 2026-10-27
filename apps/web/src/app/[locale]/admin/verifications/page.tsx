'use client';

import type { Paginated } from '@mersal/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { VerificationBadge } from '@/components/admin/status-badges';
import { SlidingThumb } from '@/components/motion/sliding-thumb';
import { EmptyState, PageHeader, Pagination, Table } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

interface VerificationRow {
  id: string;
  status: (typeof STATUSES)[number];
  documentType: string;
  documentCountry: string;
  createdAt: string;
  user: { id: string; email: string; firstName: string; lastName: string };
}

export default function AdminVerificationsPage() {
  const t = useTranslations('admin.verifications');
  const td = useTranslations('verification.form.documentTypes');
  const format = useFormatter();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('PENDING');
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ['admin', 'verifications', status, page],
    queryFn: () =>
      api<Paginated<VerificationRow>>(`/admin/verifications?status=${status}&page=${page}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title={t('title')} />
      <div
        className="relative mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1 sm:w-fit"
        role="tablist"
      >
        <SlidingThumb />
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
              'relative flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              status === s ? 'text-surface' : 'text-muted-foreground hover:text-ink',
            )}
          >
            {t(`status.${s}`)}
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
                <th>{t('columns.user')}</th>
                <th>{t('columns.document')}</th>
                <th>{t('columns.submitted')}</th>
                <th>{t('columns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((v) => (
                <tr key={v.id} className="hover:bg-muted/40">
                  <td>
                    <Link
                      href={`/admin/verifications/${v.id}`}
                      className="font-medium text-ink hover:text-primary"
                    >
                      {v.user.firstName} {v.user.lastName}
                    </Link>
                    <span className="block text-xs text-muted-foreground" dir="ltr">
                      {v.user.email}
                    </span>
                  </td>
                  <td className="text-muted-foreground">
                    {td(v.documentType as 'PASSPORT')} · {v.documentCountry}
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {format.dateTime(new Date(v.createdAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td>
                    <VerificationBadge status={v.status} />
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
