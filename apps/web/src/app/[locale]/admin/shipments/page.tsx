'use client';

import { ShipmentStatus, type Paginated } from '@mersal/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDeferredValue, useState } from 'react';
import type { ShipmentSummary } from '@/components/shipments/shipment-list';
import { ShipmentStatusBadge } from '@/components/shipments/shipment-status';
import { Input, Select } from '@/components/ui/input';
import { EmptyState, PageHeader, Pagination, Table } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useLocalized, useMoney } from '@/lib/catalog';

type Person = { id: string; firstName: string; lastName: string; email?: string } | null;
type AdminShipmentRow = ShipmentSummary & { sender: Person; traveller: Person };

export default function AdminShipmentsPage() {
  const t = useTranslations('admin.shipments');
  const tc = useTranslations('common');
  const tst = useTranslations('shipmentStatus');
  const localized = useLocalized();
  const money = useMoney();
  const format = useFormatter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const search = useDeferredValue(q);

  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (search) params.set('q', search);
  if (status) params.set('status', status);

  const list = useQuery({
    queryKey: ['admin', 'shipments', params.toString()],
    queryFn: () => api<Paginated<AdminShipmentRow>>(`/admin/shipments?${params}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={list.data && tc('results', { count: list.data.total })}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
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
            placeholder={t('searchPlaceholder')}
            className="ps-9"
            aria-label={tc('search')}
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-auto"
          aria-label={t('status')}
        >
          <option value="">
            {t('status')}: {tc('all')}
          </option>
          {Object.values(ShipmentStatus).map((s) => (
            <option key={s} value={s}>
              {tst(s)}
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
                <th>{t('columns.reference')}</th>
                <th>{t('columns.route')}</th>
                <th>{t('columns.sender')}</th>
                <th>{t('columns.traveller')}</th>
                <th>{t('columns.status')}</th>
                <th>{t('columns.price')}</th>
                <th>{t('columns.created')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td>
                    <Link
                      href={`/admin/shipments/${s.id}`}
                      className="font-mono text-xs font-medium text-ink hover:text-primary"
                      dir="ltr"
                    >
                      {s.reference}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-ink">
                    {localized(s.originCity.names)} → {localized(s.destinationCity.names)}
                  </td>
                  <td className="text-muted-foreground">
                    {s.sender && (
                      <Link href={`/admin/users/${s.sender.id}`} className="hover:text-primary">
                        {s.sender.firstName} {s.sender.lastName}
                      </Link>
                    )}
                  </td>
                  <td className="text-muted-foreground">
                    {s.traveller ? (
                      <Link href={`/admin/users/${s.traveller.id}`} className="hover:text-primary">
                        {s.traveller.firstName} {s.traveller.lastName}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <ShipmentStatusBadge status={s.status} />
                  </td>
                  <td className="text-ink tabular-nums">{money(s.price, s.currency)}</td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {format.dateTime(new Date(s.createdAt), { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={20} total={list.data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
