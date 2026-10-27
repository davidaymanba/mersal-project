'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { VerificationBadge } from '@/components/admin/status-badges';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api, apiUrl } from '@/lib/api';
import { useErrorMessage } from '@/lib/use-error-message';

interface VerificationDetail {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documentType: string;
  documentCountry: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  files: { documentFront: string; documentBack: string | null; selfie: string };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    createdAt: string;
  };
  reviewedBy: { firstName: string; lastName: string } | null;
}

function DocumentImage({
  label,
  src,
  emptyLabel,
}: {
  label: string;
  src: string | null;
  emptyLabel: string;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex aspect-[4/3] items-center justify-center bg-muted">
        {src ? (
          <a href={apiUrl(src)} target="_blank" rel="noreferrer" className="h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- private file served by the API with session cookies */}
            <img src={apiUrl(src)} alt={label} className="h-full w-full object-contain" />
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">{emptyLabel}</span>
        )}
      </div>
      <figcaption className="px-4 py-2.5 text-sm font-medium text-ink">{label}</figcaption>
    </figure>
  );
}

export default function AdminVerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('admin.verifications.detail');
  const td = useTranslations('verification.form.documentTypes');
  const tc = useTranslations('common');
  const format = useFormatter();
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const [reason, setReason] = useState('');

  const detail = useQuery({
    queryKey: ['admin', 'verification', id],
    queryFn: () => api<VerificationDetail>(`/admin/verifications/${id}`),
  });
  const onDone = (message: string) => () => {
    toast.success(message);
    return queryClient.invalidateQueries({ queryKey: ['admin'] });
  };
  const approve = useMutation({
    mutationFn: () => api(`/admin/verifications/${id}/approve`, { method: 'POST' }),
    onSuccess: onDone(t('approved')),
    onError: (e) => toast.error(describe(e)),
  });
  const reject = useMutation({
    mutationFn: () => api(`/admin/verifications/${id}/reject`, { body: { reason } }),
    onSuccess: onDone(t('rejected')),
    onError: (e) => toast.error(describe(e)),
  });

  if (!detail.data) return <PageSpinner />;
  const v = detail.data;

  return (
    <>
      <Link
        href="/admin/verifications"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {tc('back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            <Link href={`/admin/users/${v.user.id}`} className="hover:text-primary">
              {v.user.firstName} {v.user.lastName}
            </Link>
          </h1>
          <p className="mt-1 text-muted-foreground">
            {td(v.documentType as 'PASSPORT')} · {v.documentCountry} ·{' '}
            {format.dateTime(new Date(v.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <VerificationBadge status={v.status} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <DocumentImage
          label={t('documentFront')}
          src={v.files.documentFront}
          emptyLabel={t('noBack')}
        />
        <DocumentImage
          label={t('documentBack')}
          src={v.files.documentBack}
          emptyLabel={t('noBack')}
        />
        <DocumentImage label={t('selfie')} src={v.files.selfie} emptyLabel={t('noBack')} />
      </div>

      {v.status === 'PENDING' ? (
        <div className="mt-8 grid gap-6 rounded-2xl border border-border bg-surface p-6 md:grid-cols-[auto_1fr]">
          <Button
            size="lg"
            onClick={() => approve.mutate()}
            disabled={approve.isPending || reject.isPending}
          >
            <Check aria-hidden="true" />
            {t('approve')}
          </Button>
          <div className="flex flex-col gap-3 md:border-s md:border-border md:ps-6">
            <Field label={t('rejectReason')}>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('rejectPlaceholder')}
                rows={3}
              />
            </Field>
            <Button
              variant="danger"
              className="self-start"
              disabled={reason.trim().length < 3 || approve.isPending || reject.isPending}
              onClick={() => reject.mutate()}
            >
              <X aria-hidden="true" />
              {t('reject')}
            </Button>
          </div>
        </div>
      ) : (
        v.reviewedBy &&
        v.reviewedAt && (
          <p className="mt-8 text-sm text-muted-foreground">
            {t('reviewed', {
              name: `${v.reviewedBy.firstName} ${v.reviewedBy.lastName}`,
              date: format.dateTime(new Date(v.reviewedAt), {
                dateStyle: 'medium',
                timeStyle: 'short',
              }),
            })}
            {v.rejectionReason && ` — “${v.rejectionReason}”`}
          </p>
        )
      )}
    </>
  );
}
