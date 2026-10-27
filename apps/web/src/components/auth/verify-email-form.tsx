'use client';

import type { MeResponse } from '@mersal/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { Field } from '@/components/ui/field';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { meQueryKey, safeNext, useMe } from '@/lib/session';
import { useErrorMessage } from '@/lib/use-error-message';
import { FormAlert } from './form-alert';
import { devCodeQueryKey } from './signup-form';

export function VerifyEmailForm({ next }: { next?: string }) {
  const t = useTranslations('auth.verifyEmail');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const me = useMe();
  const devCode = useQuery<string | null>({
    queryKey: devCodeQueryKey,
    queryFn: () => null,
    staleTime: Infinity,
    enabled: false,
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const destination = safeNext(next, '/app');

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) router.replace('/login');
    if (me.data?.emailVerified) router.replace(destination);
  }, [me.error, me.data, router, destination]);

  const user = me.data;
  if (!user) return <PageSpinner />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await api<MeResponse>('/auth/email/verify', { body: { code } });
      queryClient.setQueryData(meQueryKey, updated);
      toast.success(t('done'));
      router.replace(destination);
    } catch (err) {
      setError(describe(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      const res = await api<{ devCode?: string }>('/auth/email/resend', { method: 'POST' });
      queryClient.setQueryData(devCodeQueryKey, res.devCode ?? null);
      toast.success(t('resent'));
    } catch (err) {
      toast.error(describe(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold text-ink">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('body', { email: user.email })}</p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        {error && <FormAlert>{error}</FormAlert>}
        {devCode.data && (
          <FormAlert tone="info">{tc('demoCode', { code: devCode.data })}</FormAlert>
        )}
        <Field label={t('code')}>
          <CodeInput
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </Field>
        <Button type="submit" size="lg" disabled={submitting || code.length !== 6}>
          {submitting && <Spinner />}
          {t('submit')}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Button variant="link" onClick={resend} disabled={resending}>
          {t('resend')}
        </Button>
        <Link href={destination} className="text-muted-foreground hover:text-ink">
          {t('later')}
        </Link>
      </div>
    </>
  );
}
