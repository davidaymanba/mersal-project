'use client';

import { ArrowRight, Ban, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useCatalog, useLocalized } from '@/lib/catalog';
import { useMe } from '@/lib/session';
import { QuoteCalculator } from './quote-calculator';

export function RestrictedItemsList() {
  const t = useTranslations('pricing');
  const localized = useLocalized();
  const { data } = useCatalog();
  if (!data) return null;

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {data.restrictedItems.map((item) => (
        <li
          key={item.id}
          className="flex items-start gap-3 rounded-lg bg-surface px-4 py-3 text-sm"
        >
          {item.level === 'PROHIBITED' ? (
            <Ban className="mt-0.5 size-4 shrink-0 text-danger" aria-label={t('prohibited')} />
          ) : (
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-warning"
              aria-label={t('restricted')}
            />
          )}
          <span className="text-ink">{localized(item.names)}</span>
        </li>
      ))}
    </ul>
  );
}

export function PricingPageClient() {
  const t = useTranslations('pricing');
  const me = useMe();

  return (
    <>
      <QuoteCalculator
        action={(quote) => {
          const target = `/app/shipments/new?quote=${quote.id}`;
          return (
            <Button variant="inverse" size="lg" className="w-full" asChild>
              <Link href={me.data ? target : `/signup?next=${encodeURIComponent(target)}`}>
                {me.data ? t('result.cta') : t('result.ctaSignedOut')}
                <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
              </Link>
            </Button>
          );
        }}
      />

      <section id="restricted" className="mt-16 rounded-2xl bg-sand p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-ink">{t('restrictedTitle')}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('restrictedBody')}</p>
        <div className="mt-6">
          <RestrictedItemsList />
        </div>
      </section>
    </>
  );
}
