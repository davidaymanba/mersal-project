import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ForgotPasswordForm } from '@/components/auth/password-reset-forms';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'auth.forgot',
  });
  return { title: t('title') };
}

export default async function ForgotPasswordPage({ params }: Props) {
  setRequestLocale(toLocale((await params).locale));
  return <ForgotPasswordForm />;
}
