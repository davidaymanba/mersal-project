import {
  ArrowRight,
  Ban,
  BadgeCheck,
  Calculator,
  CreditCard,
  KeyRound,
  Lock,
  PackageSearch,
  Plane,
  ShieldCheck,
  ScrollText,
  TriangleAlert,
  UserCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { CSSProperties, ReactNode } from 'react';
import { RoutePreview } from '@/components/home/route-preview';
import { CtaBand } from '@/components/marketing/cta-band';
import { HeroGlow } from '@/components/marketing/hero-glow';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';

const at = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });
const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations('home');

  const steps = [
    { key: 'describe', icon: Calculator },
    { key: 'match', icon: PackageSearch },
    { key: 'handover', icon: KeyRound },
  ] as const;

  const trust = [
    { key: 'verified', icon: UserCheck, art: <VerifiedArt /> },
    { key: 'protected', icon: ShieldCheck, art: <ProtectedArt /> },
    { key: 'rules', icon: ScrollText, art: <RulesArt /> },
  ] as const;

  const title = t('title');

  return (
    <>
      <HeroGlow tall />
      <SiteHeader />
      <main id="main">
        <section className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pt-14 pb-24 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
          <div>
            <p
              className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border/80 bg-surface/80 py-1 ps-2 pe-3.5 text-sm font-medium text-accent-strong shadow-xs backdrop-blur"
              style={at(0)}
            >
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-accent" />
                <span className="relative size-2 rounded-full bg-accent" />
              </span>
              {t('eyebrow')}
            </p>
            <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-semibold text-ink sm:text-6xl lg:text-[4.25rem]">
              <span className="sr-only">{title}</span>
              <span aria-hidden="true">
                {title.split(' ').map((word, i) => (
                  <span key={i}>
                    <span className="inline-block animate-word-in" style={at(0.08 + i * 0.07)}>
                      {word}
                    </span>{' '}
                  </span>
                ))}
              </span>
            </h1>
            <p
              className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-muted-foreground"
              style={at(0.45)}
            >
              {t('subtitle')}
            </p>
            <div className="mt-9 flex animate-fade-up flex-wrap gap-3" style={at(0.6)}>
              <Button size="lg" className="shine shine-once h-13 px-7" asChild>
                <Link href="/pricing">
                  {t('ctaSend')}
                  <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" className="h-13 px-7" asChild>
                <Link href="/signup?mode=traveller">
                  <Plane aria-hidden="true" />
                  {t('ctaTravel')}
                </Link>
              </Button>
            </div>
          </div>
          <RoutePreview />
        </section>

        <section
          id="how-it-works"
          className="relative overflow-hidden border-y border-border bg-sand/60"
        >
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-3xl font-semibold text-ink sm:text-4xl">{t('stepsTitle')}</h2>
              <Link
                href="/how-it-works"
                className="group/link inline-flex items-center gap-2 font-medium text-primary"
              >
                {t('stepsMore')}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>

            <div data-reveal="group" className="relative mt-14">
              {/* The steps sit on one route that draws across as the section comes in */}
              <div
                className="absolute inset-x-[16%] top-[2.375rem] hidden h-0 border-t-2 border-dashed border-primary/30 md:block"
                aria-hidden="true"
              >
                <div className="reveal-grow absolute inset-x-0 -top-0.5 h-0.5 origin-left bg-primary [transition-duration:1.6s] rtl:origin-right" />
              </div>
              <ol className="relative grid gap-6 md:grid-cols-3">
                {steps.map(({ key, icon: Icon }, index) => (
                  <li
                    key={key}
                    data-spotlight
                    className="reveal-item group relative rounded-3xl border border-border/80 bg-surface p-6 shadow-xs transition-[box-shadow,translate] duration-300 ease-out-quart hover:-translate-y-1 hover:shadow-md"
                    style={stagger(index + 1)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="relative flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow transition-transform duration-300 ease-spring group-hover:scale-105 group-hover:-rotate-3">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="font-display text-4xl font-semibold text-ink/10">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-6 text-lg font-semibold text-ink">
                      {t(`steps.${key}.title`)}
                    </h3>
                    <p className="mt-2 leading-relaxed text-muted-foreground">
                      {t(`steps.${key}.body`)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <h2 data-reveal className="text-3xl font-semibold text-ink sm:text-4xl">
            {t('trustTitle')}
          </h2>
          <div data-reveal="group" className="mt-12 grid gap-5 md:grid-cols-3">
            {trust.map(({ key, icon, art }, index) => (
              <TrustCard
                key={key}
                index={index}
                icon={icon}
                art={art}
                title={t(`trust.${key}.title`)}
                body={t(`trust.${key}.body`)}
              />
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

function TrustCard({
  index,
  icon: Icon,
  art,
  title,
  body,
}: {
  index: number;
  icon: LucideIcon;
  art: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article
      data-spotlight
      className="reveal-item group relative overflow-hidden rounded-3xl border border-border bg-surface transition-[box-shadow,translate] duration-300 ease-out-quart hover:-translate-y-1 hover:shadow-md"
      style={stagger(index)}
    >
      <div className="relative flex h-44 items-center justify-center overflow-hidden border-b border-border/70 bg-gradient-to-b from-tint/60 to-surface">
        <div className="bg-dot-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-60" />
        <div className="relative transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]">
          {art}
        </div>
      </div>
      <div className="flex gap-4 p-6">
        <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <h3 className="font-semibold text-ink">{title}</h3>
          <p className="mt-1.5 leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </article>
  );
}

/* Small abstract vignettes for the trust cards. Bars stand in for text; no data is implied. */

function VerifiedArt() {
  return (
    <div className="w-56 rounded-2xl border border-border bg-surface p-4 shadow-md">
      <div className="flex items-center gap-3">
        <span className="size-11 rounded-full bg-gradient-to-br from-tint to-[color-mix(in_oklab,var(--brand-primary)_30%,var(--surface))]" />
        <div className="flex-1 space-y-2">
          <span className="block h-2.5 w-24 rounded-full bg-ink/15" />
          <span className="block h-2 w-16 rounded-full bg-ink/10" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="block h-2 w-20 rounded-full bg-ink/10" />
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
          <BadgeCheck className="size-4" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function ProtectedArt() {
  const stages = [CreditCard, Lock, Wallet];
  return (
    <div className="flex items-center gap-2">
      {stages.map((Icon, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className={
              i === 1
                ? 'relative flex size-14 items-center justify-center rounded-2xl bg-deep text-white shadow-md'
                : 'flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-primary shadow-sm'
            }
          >
            {i === 1 && (
              <span className="absolute inset-0 animate-ping-soft rounded-2xl border-2 border-primary/50 [animation-duration:2.8s]" />
            )}
            <Icon className={i === 1 ? 'size-6' : 'size-5'} aria-hidden="true" />
          </span>
          {i < stages.length - 1 && (
            <span className="h-0.5 w-6 rounded-full bg-[repeating-linear-gradient(90deg,var(--brand-primary)_0_4px,transparent_4px_8px)] opacity-50" />
          )}
        </div>
      ))}
    </div>
  );
}

function RulesArt() {
  const rows = [
    { icon: Ban, tone: 'text-danger', width: 'w-28' },
    { icon: Ban, tone: 'text-danger', width: 'w-20' },
    { icon: TriangleAlert, tone: 'text-warning', width: 'w-24' },
  ];
  return (
    <ul className="w-56 space-y-2">
      {rows.map(({ icon: Icon, tone, width }, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-sm"
        >
          <Icon className={`size-4 ${tone}`} aria-hidden="true" />
          <span className={`block h-2 rounded-full bg-ink/12 ${width}`} />
        </li>
      ))}
    </ul>
  );
}
