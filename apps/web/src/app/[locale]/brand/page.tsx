import { brands, mersal, semanticColors, type BrandColor } from '@mersal/brand';
import { Check, X } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BrandSwitcher } from '@/components/brand/brand-switcher';
import { LogoMark } from '@/components/brand/logo-mark';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { toLocale } from '@/i18n/routing';
import { contrastRatio, wcagLevel } from '@/lib/color';

type Props = { params: Promise<{ locale: string }> };

const INK = mersal.colors[0]!.hex;

const COLOR_KEYS: Record<string, string> = {
  '--brand-ink': 'ink',
  '--brand-primary': 'primary',
  '--brand-tint': 'tint',
  '--brand-accent': 'accent',
  '--brand-accent-strong': 'accentStrong',
  '--brand-sand': 'sand',
  '--surface': 'surface',
  '--success': 'success',
  '--warning': 'warning',
  '--danger': 'danger',
  '--info': 'info',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'brandGuide',
  });
  return { title: t('metaTitle') };
}

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-14">
      <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
        <div>
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          {body && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default async function BrandPage({ params }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations('brandGuide');

  const swatch = (color: BrandColor) => {
    // Light fills are backgrounds: report how readable ink text is on them instead.
    const isBackground = contrastRatio(color.hex, '#FFFFFF') < 1.5;
    const ratio = isBackground
      ? contrastRatio(color.hex, INK)
      : contrastRatio(color.hex, '#FFFFFF');
    const level = wcagLevel(ratio);
    const key = COLOR_KEYS[color.token] ?? 'surface';
    return (
      <li key={color.token} className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="h-20 border-b border-border" style={{ background: color.hex }} />
        <div className="space-y-1 p-4">
          <p className="font-medium text-ink">{color.name}</p>
          <p className="font-mono text-xs text-muted-foreground" dir="ltr">
            {color.hex} · {color.token}
          </p>
          <p className="text-sm text-muted-foreground">{t(`colors.${key}` as 'colors.ink')}</p>
          {color.hex.toUpperCase() !== '#FFFFFF' && (
            <Badge
              tone={level === 'Fail' ? 'danger' : level === 'AA large' ? 'warning' : 'success'}
              className="mt-2"
            >
              <span dir="ltr">
                {ratio.toFixed(1)}:1 {level}
              </span>
              {isBackground ? t('contrastInkOn') : t('contrastOnWhite')}
            </Badge>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <header className="py-16">
          <p className="text-sm font-medium text-accent-strong">{t('eyebrow')}</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink sm:text-5xl">{t('title')}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('intro')}
          </p>
        </header>

        <Section title={t('logoTitle')} body={t('logoBody')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <figure className="flex min-h-40 flex-col justify-between rounded-xl border border-border bg-surface p-6">
              <span className="inline-flex items-center gap-2" dir="ltr">
                <LogoMark className="size-12" />
                <span className="font-display text-[2.3rem] leading-none font-semibold tracking-tight text-ink">
                  mersal
                </span>
              </span>
              <figcaption className="text-sm text-muted-foreground">{t('logoFull')}</figcaption>
            </figure>
            <figure className="flex min-h-40 flex-col justify-between rounded-xl border border-border bg-surface p-6">
              <span className="inline-flex items-center gap-2" dir="rtl">
                <LogoMark className="size-12" />
                <span className="font-display text-[2.3rem] leading-none font-semibold text-ink">
                  مرسال
                </span>
              </span>
              <figcaption className="text-sm text-muted-foreground">{t('logoArabic')}</figcaption>
            </figure>
            <figure className="flex min-h-40 flex-col justify-between rounded-xl border border-border bg-sand p-6">
              <LogoMark className="size-16" />
              <figcaption className="text-sm text-muted-foreground">{t('logoMark')}</figcaption>
            </figure>
            <figure className="flex min-h-40 flex-col justify-between rounded-xl bg-ink p-6 text-white">
              <span className="inline-flex items-center gap-2" dir="ltr">
                <LogoMark className="size-12" mono />
                <span className="font-display text-[2.3rem] leading-none font-semibold tracking-tight">
                  mersal
                </span>
              </span>
              <figcaption className="text-sm text-white/70">{t('logoInverse')}</figcaption>
            </figure>
          </div>
        </Section>

        <Section title={t('colorTitle')} body={t('colorBody')}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{mersal.colors.map(swatch)}</ul>
          <h3 className="mt-10 font-semibold text-ink">{t('semanticTitle')}</h3>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {semanticColors.map(swatch)}
          </ul>
        </Section>

        <Section title={t('typeTitle')} body={t('typeBody')}>
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t('typeDisplay')}
              </p>
              <p className="mt-3 font-display text-4xl font-semibold text-ink">{t('typeSample')}</p>
              <p className="mt-3 font-display text-3xl font-semibold text-ink" dir="rtl" lang="ar">
                طردك يسافر مع من هو مسافر أصلاً.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t('typeBodyLabel')}
              </p>
              <p className="mt-3 text-lg leading-relaxed text-ink" dir="ltr" lang="en">
                {brands.mersal.tagline.en} {brands.mersal.tagline.fr}
              </p>
              <p className="mt-2 text-lg leading-relaxed text-ink" dir="rtl" lang="ar">
                {brands.mersal.tagline.ar}
              </p>
            </div>
          </div>
        </Section>

        <Section title={t('voiceTitle')} body={t('voiceBody')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-success-tint/50 p-6">
              <p className="font-semibold text-success">{t('voiceDo')}</p>
              <ul className="mt-4 space-y-3">
                {t.raw('voiceDoItems').map((item: string) => (
                  <li key={item} className="flex gap-2 text-ink">
                    <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-danger-tint/50 p-6">
              <p className="font-semibold text-danger">{t('voiceDont')}</p>
              <ul className="mt-4 space-y-3">
                {t.raw('voiceDontItems').map((item: string) => (
                  <li key={item} className="flex gap-2 text-ink">
                    <X className="mt-1 size-4 shrink-0 text-danger" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section title={t('themeTitle')} body={t('themeBody')}>
          <p className="mb-3 text-sm font-medium text-muted-foreground">{t('themeCurrent')}</p>
          <BrandSwitcher />
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
