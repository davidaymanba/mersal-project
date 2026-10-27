import { Ban, ChevronDown, Package, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { PageIntro } from '@/components/marketing/page-intro';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';
import { pickLocalized, weekdayDate } from '@/lib/catalog-format';
import { DEFAULT_POLICIES, getCatalog } from '@/lib/server-catalog';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: 'help' });
  return { title: t('metaTitle'), description: t('subtitle') };
}

const GROUPS = [
  { key: 'sending', questions: ['price', 'noMatch', 'cancel', 'recipient'] },
  { key: 'travelling', questions: ['who', 'choose', 'check', 'withdraw'] },
  { key: 'payments', questions: ['when', 'methods', 'refund', 'payout'] },
  { key: 'safety', questions: ['problem', 'chat', 'codes', 'data'] },
] as const;

export default async function HelpPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('help');
  const format = await getFormatter();
  const catalog = await getCatalog();
  const policies = catalog?.policies ?? DEFAULT_POLICIES;
  const values = {
    holdHours: policies.holdHours,
    disputeHours: policies.disputeWindowHours,
    weekday: format.dateTime(weekdayDate(policies.payoutWeekday), { weekday: 'long' }),
  };

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-14 pb-24 sm:px-6">
        <PageIntro eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <div className="mt-12 grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label={t('topics')} className="hidden lg:block">
            <ul className="sticky top-24 space-y-1 text-sm">
              {GROUPS.map((group) => (
                <li key={group.key}>
                  <a
                    href={`#${group.key}`}
                    className="block rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-ink"
                  >
                    {t(`groups.${group.key}`)}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#prohibited"
                  className="block rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-ink"
                >
                  {t('prohibitedTitle')}
                </a>
              </li>
            </ul>
          </nav>

          <div className="min-w-0 space-y-12">
            {GROUPS.map((group) => (
              <section
                key={group.key}
                id={group.key}
                aria-labelledby={`${group.key}-title`}
                className="scroll-mt-24"
              >
                <h2 id={`${group.key}-title`} className="text-2xl font-semibold text-ink">
                  {t(`groups.${group.key}`)}
                </h2>
                <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface">
                  {group.questions.map((question) => (
                    <details key={question} className="group px-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                        {t(`faq.${question}.q`)}
                        <ChevronDown
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <p className="pb-5 leading-relaxed text-muted-foreground">
                        {t(`faq.${question}.a`, values)}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}

            <section
              id="prohibited"
              aria-labelledby="prohibited-title"
              className="scroll-mt-24 rounded-2xl bg-sand p-6 sm:p-8"
            >
              <h2 id="prohibited-title" className="text-2xl font-semibold text-ink">
                {t('prohibitedTitle')}
              </h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">{t('prohibitedBody')}</p>
              {catalog ? (
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {catalog.restrictedItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg bg-surface px-4 py-3 text-sm"
                    >
                      {item.level === 'PROHIBITED' ? (
                        <Ban
                          className="mt-0.5 size-4 shrink-0 text-danger"
                          aria-label={t('prohibited')}
                        />
                      ) : (
                        <TriangleAlert
                          className="mt-0.5 size-4 shrink-0 text-warning"
                          aria-label={t('restricted')}
                        />
                      )}
                      <span className="text-ink">{pickLocalized(item.names, locale)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">{t('listUnavailable')}</p>
              )}
              <p className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Ban className="size-3.5 text-danger" aria-hidden="true" />
                  {t('prohibited')}
                </span>
                <span className="flex items-center gap-1.5">
                  <TriangleAlert className="size-3.5 text-warning" aria-hidden="true" />
                  {t('restricted')}
                </span>
              </p>
            </section>

            <section className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
              <Package className="size-6 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-ink">{t('contactTitle')}</h2>
                <p className="mt-1 text-muted-foreground">{t('contactBody')}</p>
              </div>
              <Button variant="secondary" className="sm:ms-auto" asChild>
                <Link href="/app/shipments">{t('contactAction')}</Link>
              </Button>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
