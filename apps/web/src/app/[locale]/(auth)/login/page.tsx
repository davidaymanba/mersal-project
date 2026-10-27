import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/login-form';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'auth.login',
  });
  return { title: t('title') };
}

export default async function LoginPage({ params, searchParams }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const { next } = await searchParams;
  return <LoginForm next={next} />;
}
