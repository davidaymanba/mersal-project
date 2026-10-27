import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/marketing/legal-page';
import { toLocale } from '@/i18n/routing';
import { getPolicies } from '@/lib/server-catalog';

type Props = { params: Promise<{ locale: string }> };

const SECTIONS = [
  'service',
  'accounts',
  'parcels',
  'payments',
  'cancellations',
  'disputes',
  'liability',
  'conduct',
  'law',
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'legal.terms',
  });
  return { title: t('title') };
}

export default async function TermsPage({ params }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations('legal.terms');
  const policies = await getPolicies();
  const values = { holdHours: policies.holdHours, disputeHours: policies.disputeWindowHours };

  return (
    <LegalPage
      title={t('title')}
      intro={t('intro')}
      sections={SECTIONS.map((id) => ({
        id,
        title: t(`sections.${id}.title`),
        body: t(`sections.${id}.body`, values),
      }))}
    />
  );
}
