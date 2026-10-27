import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'auth.verifyEmail',
  });
  return { title: t('title') };
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const { next } = await searchParams;
  return <VerifyEmailForm next={next} />;
}
