'use client';

import type { MeResponse } from '@mersal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserCheck, UserX } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { AccountBadge, TravellerBadge, VerificationBadge } from '@/components/admin/status-badges';
import { Avatar } from '@/components/shell/user-menu';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useErrorMessage } from '@/lib/use-error-message';

interface AdminUserDetail extends MeResponse {
  lastLoginAt: string | null;
  counts: {
    shipmentsSent: number;
    shipmentsCarried: number;
    trips: number;
    disputesOpened: number;
  };
  verifications: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    rejectionReason: string | null;
  }[];
  auditTrail: { id: string; action: string; actorType: string; createdAt: string }[];
}

export default function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('admin.users.detail');
  const tc = useTranslations('common');
  const format = useFormatter();
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const [reason, setReason] = useState('');

  const user = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => api<AdminUserDetail>(`/admin/users/${id}`),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] });
  const suspend = useMutation({
    mutationFn: () => api(`/admin/users/${id}/suspend`, { body: { reason } }),
    onSuccess: () => {
      setReason('');
      return refresh();
    },
    onError: (e) => toast.error(describe(e)),
  });
  const reactivate = useMutation({
    mutationFn: () => api(`/admin/users/${id}/reactivate`, { method: 'POST' }),
    onSuccess: refresh,
    onError: (e) => toast.error(describe(e)),
  });

  if (!user.data) return <PageSpinner />;
  const u = user.data;
  const date = (value: string | null) =>
    value
      ? format.dateTime(new Date(value), { dateStyle: 'medium', timeStyle: 'short' })
      : tc('never');

  return (
    <>
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {tc('back')}
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar firstName={u.firstName} lastName={u.lastName} className="size-14 text-lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-ink">
            {u.firstName} {u.lastName}
          </h1>
          <p className="text-muted-foreground" dir="ltr">
            {u.email} {u.phone && `· ${u.phone}`}
          </p>
        </div>
        <div className="flex gap-2">
          <TravellerBadge status={u.travellerStatus} />
          <AccountBadge status={u.status} />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(u.counts) as (keyof AdminUserDetail['counts'])[]).map((key) => (
          <div key={key} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm text-muted-foreground">{t(`counts.${key}`)}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
              {u.counts[key]}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">{t('auditTrail')}</h2>
          <ul className="mt-4 divide-y divide-border text-sm">
            {u.auditTrail.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 py-2.5">
                <span className="font-mono text-xs text-ink" dir="ltr">
                  {entry.action}
                </span>
                <span className="text-muted-foreground">{date(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-border bg-surface p-6 text-sm">
            <dl className="grid grid-cols-2 gap-y-3">
              <dt className="text-muted-foreground">{t('joined')}</dt>
              <dd className="text-ink">{date(u.createdAt)}</dd>
              <dt className="text-muted-foreground">{t('lastLogin')}</dt>
              <dd className="text-ink">{date(u.lastLoginAt)}</dd>
            </dl>
            {u.verifications.length > 0 && (
              <>
                <h3 className="mt-6 font-semibold text-ink">{t('verifications')}</h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {u.verifications.map((v) => (
                    <li key={v.id}>
                      <Link
                        href={`/admin/verifications/${v.id}`}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted"
                      >
                        <span className="text-muted-foreground">{date(v.createdAt)}</span>
                        <VerificationBadge status={v.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {u.role !== 'ADMIN' && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              {u.status === 'ACTIVE' ? (
                <div className="flex flex-col gap-3">
                  <Field label={t('suspendReason')}>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                  </Field>
                  <Button
                    variant="danger"
                    disabled={reason.trim().length < 3 || suspend.isPending}
                    onClick={() => suspend.mutate()}
                  >
                    <UserX aria-hidden="true" />
                    {t('suspend')}
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  disabled={reactivate.isPending}
                  onClick={() => reactivate.mutate()}
                >
                  <UserCheck aria-hidden="true" />
                  {t('reactivate')}
                </Button>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
