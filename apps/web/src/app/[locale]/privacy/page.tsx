import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/marketing/legal-page';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

const SECTIONS = [
  'controller',
  'data',
  'purposes',
  'sharing',
  'retention',
  'rights',
  'cookies',
  'security',
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'legal.privacy',
  });
  return { title: t('title') };
}

export default async function PrivacyPage({ params }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations('legal.privacy');

  return (
    <LegalPage
      title={t('title')}
      intro={t('intro')}
      sections={SECTIONS.map((id) => ({
        id,
        title: t(`sections.${id}.title`),
        body: t(`sections.${id}.body`),
      }))}
    />
  );
}
