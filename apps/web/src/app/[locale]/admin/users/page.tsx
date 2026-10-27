'use client';

import type { MeResponse, Paginated } from '@mersal/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDeferredValue, useState } from 'react';
import { AccountBadge, TravellerBadge } from '@/components/admin/status-badges';
import { Avatar } from '@/components/shell/user-menu';
import { Input, Select } from '@/components/ui/input';
import { EmptyState, PageHeader, Pagination, Table } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

type AdminUserRow = MeResponse & { lastLoginAt: string | null };

export default function AdminUsersPage() {
  const t = useTranslations('admin.users');
  const tc = useTranslations('common');
  const tt = useTranslations('app.travellerStatus');
  const ts = useTranslations('admin.userStatus');
  const format = useFormatter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [traveller, setTraveller] = useState('');
  const [page, setPage] = useState(1);
  const search = useDeferredValue(q);

  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (search) params.set('q', search);
  if (status) params.set('status', status);
  if (traveller) params.set('traveller', traveller);

  const users = useQuery({
    queryKey: ['admin', 'users', params.toString()],
    queryFn: () => api<Paginated<AdminUserRow>>(`/admin/users?${params}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={users.data && tc('results', { count: users.data.total })}
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
          {(['ACTIVE', 'SUSPENDED'] as const).map((s) => (
            <option key={s} value={s}>
              {ts(s)}
            </option>
          ))}
        </Select>
        <Select
          value={traveller}
          onChange={(e) => {
            setTraveller(e.target.value);
            setPage(1);
          }}
          className="w-auto"
          aria-label={t('traveller')}
        >
          <option value="">
            {t('traveller')}: {tc('all')}
          </option>
          {(['NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <option key={s} value={s}>
              {tt(s)}
            </option>
          ))}
        </Select>
      </div>

      {!users.data ? (
        <PageSpinner />
      ) : users.data.items.length === 0 ? (
        <EmptyState title={tc('results', { count: 0 })} />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>{t('columns.name')}</th>
                <th>{t('columns.contact')}</th>
                <th>{t('columns.traveller')}</th>
                <th>{t('columns.status')}</th>
                <th>{t('columns.joined')}</th>
              </tr>
            </thead>
            <tbody>
              {users.data.items.map((user) => (
                <tr key={user.id} className="hover:bg-muted/40">
                  <td>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="flex items-center gap-3 font-medium text-ink hover:text-primary"
                    >
                      <Avatar
                        firstName={user.firstName}
                        lastName={user.lastName}
                        className="size-8"
                      />
                      {user.firstName} {user.lastName}
                    </Link>
                  </td>
                  <td className="text-muted-foreground">
                    <span className="block" dir="ltr">
                      {user.email}
                    </span>
                    {user.phone && (
                      <span className="block text-xs" dir="ltr">
                        {user.phone}
                      </span>
                    )}
                  </td>
                  <td>
                    <TravellerBadge status={user.travellerStatus} />
                  </td>
                  <td>
                    <AccountBadge status={user.status} />
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {format.dateTime(new Date(user.createdAt), { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={20} total={users.data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
