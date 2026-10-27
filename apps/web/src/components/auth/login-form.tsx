'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type AuthResponse, type LoginInput } from '@mersal/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { meQueryKey, safeNext } from '@/lib/session';
import { useErrorMessage, useFieldError } from '@/lib/use-error-message';
import { FormAlert } from './form-alert';

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const fieldError = useFieldError();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await api<AuthResponse>('/auth/login', { body: values });
      queryClient.setQueryData(meQueryKey, res.user);
      router.replace(safeNext(next, res.user.role === 'ADMIN' ? '/admin' : '/app'));
    } catch (error) {
      setFormError(describe(error));
    }
  });

  return (
    <>
      <h1 className="text-3xl font-semibold text-ink">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <Field label={t('email')} error={fieldError(form.formState.errors.email, 'email')}>
          <Input type="email" autoComplete="email" dir="ltr" {...form.register('email')} />
        </Field>
        <Field label={t('password')} error={fieldError(form.formState.errors.password)}>
          <Input type="password" autoComplete="current-password" {...form.register('password')} />
        </Field>
        <Link
          href="/forgot-password"
          className="-mt-2 self-end text-sm font-medium text-primary hover:underline"
        >
          {t('forgot')}
        </Link>
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          {t('submit')}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
          className="font-medium text-primary hover:underline"
        >
          {t('signupLink')}
        </Link>
      </p>
    </>
  );
}
