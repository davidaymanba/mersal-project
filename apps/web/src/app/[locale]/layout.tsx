import { defaultBrand, isBrandId } from '@mersal/brand';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { BrandProvider } from '@/components/brand/brand-provider';
import { Providers } from '@/components/providers';
import { directionFor, routing, toLocale } from '@/i18n/routing';
import { fontVariables } from '@/lib/fonts';
import '../globals.css';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: 'meta' });
  return {
    title: { default: t('title'), template: '%s · Mersal' },
    description: t('description'),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('nav');
  const brandCookie = (await cookies()).get('brand')?.value;
  const brandId = isBrandId(brandCookie) ? brandCookie : defaultBrand;

  return (
    <html lang={locale} dir={directionFor(locale)} data-brand={brandId} className={fontVariables}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[100] rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        >
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider>
          <BrandProvider brandId={brandId}>
            <Providers>{children}</Providers>
          </BrandProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
