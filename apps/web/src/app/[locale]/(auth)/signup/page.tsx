import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SignupForm } from '@/components/auth/signup-form';
import { toLocale } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; next?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'auth.signup',
  });
  return { title: t('title') };
}

export default async function SignupPage({ params, searchParams }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const { mode, next } = await searchParams;
  return <SignupForm traveller={mode === 'traveller'} next={next} />;
}
