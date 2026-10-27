'use client';

import type { Paginated } from '@mersal/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDeferredValue, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader, Pagination, Table } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

interface AuditRow {
  id: string;
  action: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  entityType: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string; email: string } | null;
}

const ACTOR_TONE = { USER: 'neutral', ADMIN: 'primary', SYSTEM: 'info' } as const;

/** Where an audited record can be opened in the admin, when it has a page. */
function entityHref(type: string, id: string | null): string | null {
  if (!id) return null;
  const routes: Record<string, string> = {
    User: `/admin/users/${id}`,
    Shipment: `/admin/shipments/${id}`,
    IdentityVerification: `/admin/verifications/${id}`,
    PricingVersion: `/admin/pricing/${id}`,
    Dispute: `/admin/disputes/${id}`,
  };
  return routes[type] ?? null;
}

export default function AdminAuditPage() {
  const t = useTranslations('admin.audit');
  const format = useFormatter();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const action = useDeferredValue(q);
  const list = useQuery({
    queryKey: ['admin', 'audit', action, page],
    queryFn: () =>
      api<Paginated<AuditRow>>(
        `/admin/audit-logs?page=${page}&pageSize=30${action ? `&action=${encodeURIComponent(action)}` : ''}`,
      ),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <div className="relative mb-4 max-w-sm">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder={t('filter')}
          className="ps-9"
          dir="ltr"
          aria-label={t('filter')}
        />
      </div>
      {!list.data ? (
        <PageSpinner />
      ) : list.data.items.length === 0 ? (
        <EmptyState title="—" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>{t('columns.date')}</th>
                <th>{t('columns.actor')}</th>
                <th>{t('columns.action')}</th>
                <th>{t('columns.entity')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((row) => {
                const href = entityHref(row.entityType, row.entityId);
                return (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap text-muted-foreground">
                      {format.dateTime(new Date(row.createdAt), {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <Badge tone={ACTOR_TONE[row.actorType]}>{row.actorType}</Badge>
                        <span className="text-ink">
                          {row.actor ? `${row.actor.firstName} ${row.actor.lastName}` : t('system')}
                        </span>
                      </span>
                    </td>
                    <td className="font-mono text-xs text-ink" dir="ltr">
                      {row.action}
                    </td>
                    <td className="text-xs text-muted-foreground" dir="ltr">
                      {href ? (
                        <Link href={href} className="hover:text-primary">
                          {row.entityType} · {row.entityId?.slice(-8)}
                        </Link>
                      ) : (
                        `${row.entityType}${row.entityId ? ` · ${row.entityId.slice(-8)}` : ''}`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={30} total={list.data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
