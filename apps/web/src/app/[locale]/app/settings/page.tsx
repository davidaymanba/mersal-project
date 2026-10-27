'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordSchema, UpdateProfileSchema, type MeResponse } from '@mersal/shared';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { api } from '@/lib/api';
import { meQueryKey, useMe } from '@/lib/session';
import { useErrorMessage, useFieldError } from '@/lib/use-error-message';

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-border bg-surface shadow-xs p-6"
    >
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ProfileForm({ me }: { me: MeResponse }) {
  const t = useTranslations('settings.profile');
  const tl = useTranslations('locale');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const describe = useErrorMessage();
  const fieldError = useFieldError();
  const form = useForm<z.input<typeof UpdateProfileSchema>>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: { firstName: me.firstName, lastName: me.lastName, locale: me.locale },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await api<MeResponse>('/users/me', { method: 'PATCH', body: values });
      queryClient.setQueryData(meQueryKey, user);
      form.reset({ firstName: user.firstName, lastName: user.lastName, locale: user.locale });
      toast.success(tc('saved'));
      if (user.locale !== me.locale) router.replace(pathname, { locale: user.locale });
    } catch (error) {
      toast.error(describe(error));
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2" noValidate>
      <Field label={t('firstName')} error={fieldError(form.formState.errors.firstName)}>
        <Input autoComplete="given-name" {...form.register('firstName')} />
      </Field>
      <Field label={t('lastName')} error={fieldError(form.formState.errors.lastName)}>
        <Input autoComplete="family-name" {...form.register('lastName')} />
      </Field>
      <Field label={t('email')}>
        <Input value={me.email} disabled dir="ltr" readOnly />
      </Field>
      <Field label={t('language')}>
        <Select {...form.register('locale')}>
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {tl(l)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
          {form.formState.isSubmitting && <Spinner />}
          {t('save')}
        </Button>
      </div>
    </form>
  );
}

function PhoneForm({ me }: { me: MeResponse }) {
  const t = useTranslations('settings.phone');
  const tc = useTranslations('common');
  const tf = useTranslations('errors.field');
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const [editing, setEditing] = useState(!me.phoneVerified);
  const [phone, setPhone] = useState(me.phone ?? '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      setError(tf('phone'));
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ devCode?: string }>('/auth/phone/send', {
        body: { phone: phone.trim() },
      });
      setDevCode(res.devCode ?? null);
      setSent(true);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await api<MeResponse>('/auth/phone/verify', { body: { code } });
      queryClient.setQueryData(meQueryKey, user);
      setEditing(false);
      setSent(false);
      setCode('');
      setDevCode(null);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  if (!editing && me.phoneVerified) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 font-medium text-ink">
          <CircleCheck className="size-5 text-success" aria-hidden="true" />
          <span dir="ltr">{me.phone}</span>
          <span className="text-sm font-normal text-muted-foreground">· {t('verified')}</span>
        </p>
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          {t('change')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-5">
      {error && <FormAlert>{error}</FormAlert>}
      <form onSubmit={send} className="flex items-end gap-3">
        <Field label={t('number')} className="flex-1">
          <Input
            type="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="+33612345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Button type="submit" variant={sent ? 'secondary' : 'primary'} disabled={busy}>
          {busy && !sent && <Spinner />}
          {t('send')}
        </Button>
      </form>
      {sent && (
        <form onSubmit={verify} className="flex flex-col gap-4">
          {devCode && <FormAlert tone="info">{tc('demoCode', { code: devCode })}</FormAlert>}
          <Field label={t('code')}>
            <CodeInput
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </Field>
          <Button type="submit" disabled={busy || code.length !== 6}>
            {busy && <Spinner />}
            {t('verify')}
          </Button>
        </form>
      )}
    </div>
  );
}

function PasswordForm() {
  const t = useTranslations('settings.password');
  const router = useRouter();
  const describe = useErrorMessage();
  const fieldError = useFieldError();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof ChangePasswordSchema>>({
    resolver: zodResolver(ChangePasswordSchema),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api('/users/me/password', { body: values });
      toast.success(t('done'));
      router.replace('/login');
    } catch (error) {
      setFormError(describe(error));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-5" noValidate>
      {formError && <FormAlert>{formError}</FormAlert>}
      <Field label={t('current')} error={fieldError(form.formState.errors.currentPassword)}>
        <Input
          type="password"
          autoComplete="current-password"
          {...form.register('currentPassword')}
        />
      </Field>
      <Field label={t('new')} error={fieldError(form.formState.errors.newPassword)}>
        <Input type="password" autoComplete="new-password" {...form.register('newPassword')} />
      </Field>
      <Button type="submit" className="self-start" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Spinner />}
        {t('submit')}
      </Button>
    </form>
  );
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { data: me } = useMe();
  if (!me) return <PageSpinner />;

  return (
    <>
      <PageHeader title={t('title')} />
      <div className="flex flex-col gap-6">
        <Section title={t('profile.title')}>
          <ProfileForm me={me} />
        </Section>
        <Section id="phone" title={t('phone.title')} description={t('phone.body')}>
          <PhoneForm me={me} />
        </Section>
        <Section title={t('password.title')}>
          <PasswordForm />
        </Section>
      </div>
    </>
  );
}
