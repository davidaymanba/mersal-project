import {
  ArrowRight,
  Calculator,
  KeyRound,
  PackageSearch,
  Plane,
  ShieldCheck,
  ScrollText,
  UserCheck,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RoutePreview } from '@/components/home/route-preview';
import { CtaBand } from '@/components/marketing/cta-band';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations('home');

  const steps = [
    { key: 'describe', icon: Calculator },
    { key: 'match', icon: PackageSearch },
    { key: 'handover', icon: KeyRound },
  ] as const;

  const trust = [
    { key: 'verified', icon: UserCheck },
    { key: 'protected', icon: ShieldCheck },
    { key: 'rules', icon: ScrollText },
  ] as const;

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pt-24">
          <div>
            <p className="text-sm font-medium text-accent-strong">{t('eyebrow')}</p>
            <h1 className="mt-4 text-4xl leading-[1.08] font-semibold text-ink sm:text-5xl lg:text-[3.5rem]">
              {t('title')}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t('subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/pricing">
                  {t('ctaSend')}
                  <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/signup?mode=traveller">
                  <Plane aria-hidden="true" />
                  {t('ctaTravel')}
                </Link>
              </Button>
            </div>
          </div>
          <RoutePreview />
        </section>

        <section id="how-it-works" className="border-y border-border bg-sand/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold text-ink">{t('stepsTitle')}</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map(({ key, icon: Icon }, index) => (
                <li key={key} className="rounded-2xl border border-border bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-tint text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-display text-sm font-semibold text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{t(`steps.${key}.title`)}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {t(`steps.${key}.body`)}
                  </p>
                </li>
              ))}
            </ol>
            <Link
              href="/how-it-works"
              className="mt-8 inline-flex items-center gap-2 font-medium text-primary hover:underline"
            >
              {t('stepsMore')}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold text-ink">{t('trustTitle')}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {trust.map(({ key, icon: Icon }) => (
              <div key={key} className="flex gap-4">
                <Icon className="mt-1 size-6 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-ink">{t(`trust.${key}.title`)}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">
                    {t(`trust.${key}.body`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <CtaBand title={t('travellerTitle')} body={t('travellerBody')}>
          <Button variant="inverse" size="lg" asChild>
            <Link href="/signup?mode=traveller">
              {t('ctaTravel')}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </CtaBand>
      </main>
      <SiteFooter />
    </>
  );
}
