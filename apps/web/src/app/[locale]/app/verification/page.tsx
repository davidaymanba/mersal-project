'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, Clock, Lock, TriangleAlert, X } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FileInput } from '@/components/ui/file-input';
import { Select } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { meQueryKey, useMe } from '@/lib/session';
import { useErrorMessage } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';

const DOCUMENT_TYPES = ['PASSPORT', 'NATIONAL_ID', 'RESIDENCE_PERMIT', 'DRIVING_LICENSE'] as const;
const COUNTRIES = ['FR', 'DZ', 'MA', 'TN', 'BE', 'CH', 'ES', 'IT', 'DE', 'GB', 'CA'];
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

interface Verification {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
}

function StatusPanel({
  verification,
  travellerStatus,
}: {
  verification: Verification | null;
  travellerStatus: string;
}) {
  const t = useTranslations('verification.status');
  const format = useFormatter();
  const status = travellerStatus as Verification['status'] | 'NOT_STARTED';
  if (status === 'NOT_STARTED' || !verification) return null;

  const tone = {
    PENDING: { Icon: Clock, className: 'border-warning/30 bg-warning-tint text-warning' },
    APPROVED: { Icon: BadgeCheck, className: 'border-success/30 bg-success-tint text-success' },
    REJECTED: { Icon: TriangleAlert, className: 'border-danger/30 bg-danger-tint text-danger' },
  }[status];

  return (
    <div className={cn('flex gap-4 rounded-2xl border p-5', tone.className)}>
      <tone.Icon className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{t(`${status}.title`)}</p>
        <p className="mt-1 text-sm text-ink/80">
          {status === 'PENDING'
            ? t('PENDING.body', {
                date: format.dateTime(new Date(verification.createdAt), { dateStyle: 'long' }),
              })
            : status === 'REJECTED'
              ? t('REJECTED.body', { reason: verification.rejectionReason ?? '' })
              : t('APPROVED.body')}
        </p>
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const t = useTranslations('verification');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const { data: me } = useMe();
  const verification = useQuery({
    queryKey: ['verification'],
    queryFn: () => api<Verification | null>('/verification/me'),
  });

  const [documentType, setDocumentType] = useState<(typeof DOCUMENT_TYPES)[number]>('PASSPORT');
  const [country, setCountry] = useState('FR');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regionNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);

  if (!me || verification.isPending) return <PageSpinner />;

  const ready = me.emailVerified && me.phoneVerified;
  const canSubmit =
    ready && (me.travellerStatus === 'NOT_STARTED' || me.travellerStatus === 'REJECTED');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!front || !selfie) return;
    setError(null);
    setSubmitting(true);
    const form = new FormData();
    form.set('documentType', documentType);
    form.set('documentCountry', country);
    form.set('documentFront', front);
    if (back && documentType !== 'PASSPORT') form.set('documentBack', back);
    form.set('selfie', selfie);
    try {
      await api('/verification', { form });
      toast.success(t('form.submitted'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['verification'] }),
      ]);
    } catch (err) {
      setError(describe(err));
    } finally {
      setSubmitting(false);
    }
  }

  const requirements = [
    { key: 'email', done: me.emailVerified, href: '/verify-email?next=/app/verification' },
    { key: 'phone', done: me.phoneVerified, href: '/app/settings#phone' },
  ] as const;

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <StatusPanel
            verification={verification.data ?? null}
            travellerStatus={me.travellerStatus}
          />

          {canSubmit && (
            <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-ink">{t('form.title')}</h2>
              {error && (
                <div className="mt-4">
                  <FormAlert>{error}</FormAlert>
                </div>
              )}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label={t('form.documentType')}>
                  <Select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as typeof documentType)}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`form.documentTypes.${type}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('form.country')}>
                  <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                    {COUNTRIES.map((code) => (
                      <option key={code} value={code}>
                        {regionNames.of(code)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <FileInput
                  label={t('form.front')}
                  hint={t('form.fileHint')}
                  chooseLabel={t('form.choose')}
                  replaceLabel={t('form.replace')}
                  accept={ACCEPT}
                  value={front}
                  onChange={setFront}
                />
                {documentType !== 'PASSPORT' && (
                  <FileInput
                    label={t('form.back')}
                    hint={t('form.fileHint')}
                    chooseLabel={t('form.choose')}
                    replaceLabel={t('form.replace')}
                    accept={ACCEPT}
                    value={back}
                    onChange={setBack}
                  />
                )}
                <FileInput
                  label={t('form.selfie')}
                  hint={t('form.selfieHint')}
                  chooseLabel={t('form.choose')}
                  replaceLabel={t('form.replace')}
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  value={selfie}
                  onChange={setSelfie}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="mt-6"
                disabled={submitting || !front || !selfie}
              >
                {submitting && <Spinner />}
                {t('form.submit')}
              </Button>
            </form>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="font-semibold text-ink">{t('requirementsTitle')}</p>
            <ul className="mt-4 flex flex-col gap-3">
              {requirements.map(({ key, done, href }) => (
                <li key={key} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full',
                      done ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger',
                    )}
                  >
                    {done ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <X className="size-3.5" aria-hidden="true" />
                    )}
                  </span>
                  {done ? (
                    <span className="text-ink">{t(`requirements.${key}`)}</span>
                  ) : (
                    <Link href={href} className="font-medium text-primary hover:underline">
                      {t(`requirements.${key}`)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <p className="flex gap-2 rounded-2xl bg-sand p-5 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t('privacy')}
          </p>
        </aside>
      </div>
    </>
  );
}
