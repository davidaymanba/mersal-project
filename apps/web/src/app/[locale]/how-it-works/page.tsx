import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Calculator,
  CalendarPlus,
  CreditCard,
  Inbox,
  KeyRound,
  Lock,
  MessagesSquare,
  Package,
  PackageSearch,
  Plane,
  QrCode,
  Scale,
  UserCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageIntro } from '@/components/marketing/page-intro';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';
import { weekdayDate } from '@/lib/catalog-format';
import { getPolicies } from '@/lib/server-catalog';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'howItWorks',
  });
  return { title: t('metaTitle'), description: t('subtitle') };
}

const SENDER_STEPS = [
  { key: 'quote', icon: Calculator },
  { key: 'pay', icon: CreditCard },
  { key: 'match', icon: PackageSearch },
  { key: 'pickup', icon: KeyRound },
  { key: 'delivery', icon: QrCode },
] as const;

const TRAVELLER_STEPS = [
  { key: 'verify', icon: UserCheck },
  { key: 'publish', icon: CalendarPlus },
  { key: 'offers', icon: Inbox },
  { key: 'handover', icon: KeyRound },
  { key: 'paid', icon: Wallet },
] as const;

const MONEY_STAGES = [
  { key: 'paid', icon: CreditCard },
  { key: 'held', icon: Lock },
  { key: 'delivered', icon: BadgeCheck },
  { key: 'available', icon: Wallet },
  { key: 'payout', icon: Banknote },
] as const;

const SAFETY = [
  { key: 'identity', icon: UserCheck },
  { key: 'codes', icon: KeyRound },
  { key: 'chat', icon: MessagesSquare },
  { key: 'disputes', icon: Scale },
] as const;

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

function Journey({
  id,
  title,
  icon: Icon,
  steps,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  steps: Step[];
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-3xl border border-border bg-surface p-6 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-tint text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h2 id={id} className="scroll-mt-24 text-2xl font-semibold text-ink">
          {title}
        </h2>
      </div>
      <ol className="mt-8">
        {steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
            {index < steps.length - 1 && (
              <span
                className="absolute start-[1.125rem] top-11 bottom-2 w-px bg-border"
                aria-hidden="true"
              />
            )}
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary">
              <step.icon className="size-4" aria-hidden="true" />
            </span>
            <div className="pt-1.5">
              <h3 className="font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function HowItWorksPage({ params }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations('howItWorks');
  const format = await getFormatter();
  const policies = await getPolicies();
  const values = {
    holdHours: policies.holdHours,
    disputeHours: policies.disputeWindowHours,
    weekday: format.dateTime(weekdayDate(policies.payoutWeekday), { weekday: 'long' }),
  };

  return (
    <>
      <SiteHeader />
      <main id="main">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6">
          <PageIntro eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Journey
              id="senders"
              title={t('senders.title')}
              icon={Package}
              steps={SENDER_STEPS.map(({ key, icon }) => ({
                icon,
                title: t(`senders.steps.${key}.title`),
                body: t(`senders.steps.${key}.body`, values),
              }))}
            />
            <Journey
              id="travellers"
              title={t('travellers.title')}
              icon={Plane}
              steps={TRAVELLER_STEPS.map(({ key, icon }) => ({
                icon,
                title: t(`travellers.steps.${key}.title`),
                body: t(`travellers.steps.${key}.body`, values),
              }))}
            />
          </div>
        </div>

        <section aria-labelledby="money" className="border-y border-border bg-sand/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="money" className="scroll-mt-24 text-3xl font-semibold text-ink">
              {t('money.title')}
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t('money.subtitle')}</p>
            <ol className="mt-10 grid gap-4 lg:grid-cols-5">
              {MONEY_STAGES.map(({ key, icon: Icon }, index) => (
                <li key={key} className="relative rounded-2xl border border-border bg-surface p-5">
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-ink">{t(`money.stages.${key}.title`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t(`money.stages.${key}.body`, values)}
                  </p>
                  {index < MONEY_STAGES.length - 1 && (
                    <span
                      className="absolute inset-x-0 -bottom-[1.375rem] z-10 mx-auto flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground lg:inset-x-auto lg:top-1/2 lg:-end-[1.375rem] lg:bottom-auto lg:mx-0 lg:-translate-y-1/2"
                      aria-hidden="true"
                    >
                      <ArrowDown className="size-4 lg:hidden" />
                      <ArrowRight className="hidden size-4 lg:block rtl:rotate-180" />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="safety" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="safety" className="scroll-mt-24 text-3xl font-semibold text-ink">
            {t('safety.title')}
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {SAFETY.map(({ key, icon: Icon }) => (
              <div key={key} className="flex gap-4">
                <Icon className="mt-1 size-6 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-ink">{t(`safety.items.${key}.title`)}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">
                    {t(`safety.items.${key}.body`, values)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <CtaBand title={t('cta.title')} body={t('cta.body')}>
          <Button variant="inverse" size="lg" asChild>
            <Link href="/pricing">
              {t('cta.send')}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            size="lg"
            className="border border-white/25 bg-transparent text-white hover:bg-white/10"
            asChild
          >
            <Link href="/signup?mode=traveller">
              <Plane aria-hidden="true" />
              {t('cta.travel')}
            </Link>
          </Button>
        </CtaBand>
      </main>
      <SiteFooter />
    </>
  );
}
