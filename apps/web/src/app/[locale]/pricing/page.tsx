import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PricingPageClient } from '@/components/pricing/pricing-page-client';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'pricing',
  });
  return { title: t('metaTitle'), description: t('subtitle') };
}

export default async function PricingPage({ params }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations('pricing');

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6">
        <p className="text-sm font-medium text-accent-strong">{t('eyebrow')}</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink sm:text-5xl">{t('title')}</h1>
        <p className="mt-4 mb-10 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
        <PricingPageClient />
      </main>
      <SiteFooter />
    </>
  );
}
