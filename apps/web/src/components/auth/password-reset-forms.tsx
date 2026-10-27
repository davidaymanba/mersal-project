'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordSchema, ResetPasswordSchema } from '@mersal/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useErrorMessage, useFieldError } from '@/lib/use-error-message';
import { FormAlert } from './form-alert';

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgot');
  const describe = useErrorMessage();
  const fieldError = useFieldError();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api('/auth/password/forgot', { body: values });
      setSentTo(values.email);
    } catch (error) {
      setFormError(describe(error));
    }
  });

  return (
    <>
      <h1 className="text-3xl font-semibold text-ink">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('body')}</p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        {sentTo && <FormAlert tone="success">{t('sent')}</FormAlert>}
        <Field label={t('email')} error={fieldError(form.formState.errors.email, 'email')}>
          <Input type="email" autoComplete="email" dir="ltr" {...form.register('email')} />
        </Field>
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          {t('submit')}
        </Button>
      </form>
      <Link
        href={sentTo ? `/reset-password?email=${encodeURIComponent(sentTo)}` : '/reset-password'}
        className="mt-6 text-center text-sm font-medium text-primary hover:underline"
      >
        {t('haveCode')}
      </Link>
    </>
  );
}

export function ResetPasswordForm({ email }: { email?: string }) {
  const t = useTranslations('auth.reset');
  const router = useRouter();
  const describe = useErrorMessage();
  const fieldError = useFieldError();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { email: email ?? '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api('/auth/password/reset', { body: values });
      toast.success(t('done'));
      router.replace('/login');
    } catch (error) {
      setFormError(describe(error));
    }
  });

  return (
    <>
      <h1 className="text-3xl font-semibold text-ink">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('body')}</p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <Field label={t('email')} error={fieldError(form.formState.errors.email, 'email')}>
          <Input type="email" autoComplete="email" dir="ltr" {...form.register('email')} />
        </Field>
        <Field label={t('code')} error={fieldError(form.formState.errors.code, 'code')}>
          <CodeInput {...form.register('code')} />
        </Field>
        <Field label={t('password')} error={fieldError(form.formState.errors.password)}>
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          {t('submit')}
        </Button>
      </form>
    </>
  );
}
