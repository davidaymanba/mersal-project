import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/auth/password-reset-forms';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ email?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'auth.reset',
  });
  return { title: t('title') };
}

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const { email } = await searchParams;
  return <ResetPasswordForm email={email} />;
}
