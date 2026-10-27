import type { Catalog } from '@mersal/shared';
import { ArrowLeftRight, ArrowRight, Ban, Camera, Clock, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { FormAlert } from '@/components/auth/form-alert';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageIntro } from '@/components/marketing/page-intro';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';
import { categoryIcon, gramsToKgText, pickLocalized } from '@/lib/catalog-format';
import { getCatalog } from '@/lib/server-catalog';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'services',
  });
  return { title: t('metaTitle'), description: t('subtitle') };
}

/** Corridors are directional (FR-DZ, DZ-FR); the page shows each country pair once. */
function countryPairs(catalog: Catalog) {
  const pairs = new Map<string, [string, string]>();
  for (const corridor of catalog.corridors) {
    const pair = [corridor.originCountry, corridor.destinationCountry].sort() as [string, string];
    // Keep France first so every card reads "France ⇄ …" when it is part of the pair.
    pairs.set(
      pair.join('-'),
      pair.includes('FR') ? ['FR', pair.find((c) => c !== 'FR') ?? 'FR'] : pair,
    );
  }
  return [...pairs.values()];
}

/** Lowest price of each optional extra across routes, keyed by option code. */
function extras(catalog: Catalog) {
  const byCode = new Map<
    string,
    Catalog['corridors'][number]['options'][number] & { currency: string }
  >();
  for (const corridor of catalog.corridors) {
    for (const option of corridor.options) {
      const seen = byCode.get(option.code);
      if (!seen || option.price < seen.price)
        byCode.set(option.code, { ...option, currency: corridor.currency });
    }
  }
  return [...byCode.values()];
}

export default async function ServicesPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('services');
  const format = await getFormatter();
  const catalog = await getCatalog();
  const country = new Intl.DisplayNames([locale], { type: 'region' });

  return (
    <>
      <SiteHeader />
      <main id="main">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6">
          <PageIntro eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
          {!catalog && (
            <div className="mt-10">
              <FormAlert tone="info">{t('unavailable')}</FormAlert>
            </div>
          )}

          {catalog && (
            <section aria-labelledby="routes" className="mt-14">
              <h2 id="routes" className="text-2xl font-semibold text-ink">
                {t('routesTitle')}
              </h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">{t('routesBody')}</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {countryPairs(catalog).map(([a, b]) => (
                  <article
                    key={`${a}-${b}`}
                    className="rounded-2xl border border-border bg-surface shadow-xs p-6"
                  >
                    <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                      {country.of(a)}
                      <ArrowLeftRight className="size-4 text-accent" aria-label={t('bothWays')} />
                      {country.of(b)}
                    </h3>
                    <dl className="mt-5 space-y-4">
                      {[a, b].map((code) => {
                        const cities = catalog.cities.filter((city) => city.countryCode === code);
                        return (
                          <div key={code}>
                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                              {country.of(code)} · {t('cityCount', { count: cities.length })}
                            </dt>
                            <dd className="mt-2 flex flex-wrap gap-1.5">
                              {cities.map((city) => (
                                <span
                                  key={city.id}
                                  className="rounded-md bg-muted px-2 py-1 text-sm text-ink"
                                >
                                  {pickLocalized(city.names, locale)}
                                </span>
                              ))}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          )}

          {catalog && (
            <section aria-labelledby="categories" className="mt-16">
              <h2 id="categories" className="text-2xl font-semibold text-ink">
                {t('categoriesTitle')}
              </h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">{t('categoriesBody')}</p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {catalog.categories.map((category) => {
                  const Icon = categoryIcon(category.icon);
                  return (
                    <li
                      key={category.id}
                      className="flex gap-4 rounded-2xl border border-border bg-surface shadow-xs p-5"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tint text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-ink">
                          {pickLocalized(category.names, locale)}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {category.maxWeightGrams
                            ? t('maxWeight', { kg: gramsToKgText(category.maxWeightGrams) })
                            : t('noWeightLimit')}
                        </p>
                        {category.requiresPhotos && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-accent-strong">
                            <Camera className="size-3.5" aria-hidden="true" />
                            {t('photosRequired')}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="pace" className="mt-16 grid gap-10 lg:grid-cols-2">
            <div>
              <h2 id="pace" className="text-2xl font-semibold text-ink">
                {t('paceTitle')}
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface shadow-xs p-5">
                  <Clock className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold text-ink">{t('standard.title')}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t('standard.body')}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface shadow-xs p-5">
                  <Zap className="size-5 text-accent" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold text-ink">{t('express.title')}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t('express.body')}
                  </p>
                </div>
              </div>
            </div>

            {catalog && extras(catalog).length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-ink">{t('extrasTitle')}</h2>
                <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface shadow-xs">
                  {extras(catalog).map((option) => (
                    <li
                      key={option.code}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <span className="text-ink">{pickLocalized(option.names, locale)}</span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {t('from', {
                          price: format.number(option.price / 100, {
                            style: 'currency',
                            currency: option.currency,
                          }),
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">{t('extrasNote')}</p>
              </div>
            )}
          </section>

          <section className="mt-16 flex flex-col items-start gap-4 rounded-2xl bg-sand p-6 sm:flex-row sm:items-center sm:p-8">
            <Ban className="size-6 shrink-0 text-danger" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-ink">{t('prohibitedTitle')}</h2>
              <p className="mt-1 text-muted-foreground">{t('prohibitedBody')}</p>
            </div>
            <Button variant="secondary" className="sm:ms-auto" asChild>
              <Link href="/help#prohibited">{t('prohibitedLink')}</Link>
            </Button>
          </section>
        </div>

        <CtaBand title={t('cta.title')} body={t('cta.body')}>
          <Button variant="inverse" size="lg" asChild>
            <Link href="/pricing">
              {t('cta.action')}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </CtaBand>
      </main>
      <SiteFooter />
    </>
  );
}
