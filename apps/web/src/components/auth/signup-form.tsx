'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type AuthResponse, type RegisterInput } from '@mersal/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { meQueryKey } from '@/lib/session';
import { useErrorMessage, useFieldError } from '@/lib/use-error-message';
import { FormAlert } from './form-alert';

export const devCodeQueryKey = ['devCode', 'email'] as const;

export function SignupForm({ traveller, next }: { traveller: boolean; next?: string }) {
  const t = useTranslations('auth.signup');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const fieldError = useFieldError();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { locale: locale as RegisterInput['locale'] },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await api<AuthResponse>('/auth/register', { body: values });
      queryClient.setQueryData(meQueryKey, res.user);
      queryClient.setQueryData(devCodeQueryKey, res.devCode ?? null);
      const destination = next ?? (traveller ? '/app/verification' : undefined);
      router.replace(
        destination ? `/verify-email?next=${encodeURIComponent(destination)}` : '/verify-email',
      );
    } catch (error) {
      setFormError(describe(error));
    }
  });

  const termsError = form.formState.errors.acceptTerms;

  return (
    <>
      <h1 className="text-3xl font-semibold text-ink">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">
        {traveller ? t('travellerSubtitle') : t('subtitle')}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('firstName')} error={fieldError(form.formState.errors.firstName)}>
            <Input autoComplete="given-name" {...form.register('firstName')} />
          </Field>
          <Field label={t('lastName')} error={fieldError(form.formState.errors.lastName)}>
            <Input autoComplete="family-name" {...form.register('lastName')} />
          </Field>
        </div>
        <Field label={t('email')} error={fieldError(form.formState.errors.email, 'email')}>
          <Input type="email" autoComplete="email" dir="ltr" {...form.register('email')} />
        </Field>
        <Field
          label={t('password')}
          hint={t('passwordHint')}
          error={fieldError(form.formState.errors.password)}
        >
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary)]"
            aria-invalid={termsError ? true : undefined}
            {...form.register('acceptTerms')}
          />
          <span>
            {t.rich('acceptTerms', {
              terms: (chunks) => (
                <Link href="/terms" className="font-medium text-primary hover:underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy" className="font-medium text-primary hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {termsError && <p className="-mt-3 text-sm text-danger">{fieldError(termsError)}</p>}
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          {t('submit')}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-medium text-primary hover:underline"
        >
          {t('loginLink')}
        </Link>
      </p>
    </>
  );
}
