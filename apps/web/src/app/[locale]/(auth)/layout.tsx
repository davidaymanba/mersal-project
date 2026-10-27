import { BadgeCheck, ScrollText, ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { RouteArc } from '@/components/marketing/route-arc';
import { ThemeToggle } from '@/components/theme-toggle';
import { Link } from '@/i18n/navigation';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('auth');
  const home = await getTranslations('home.trust');

  const points = [
    { key: 'verified', icon: BadgeCheck },
    { key: 'protected', icon: ShieldCheck },
    { key: 'rules', icon: ScrollText },
  ] as const;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative isolate hidden overflow-hidden bg-deep p-12 text-white lg:flex lg:flex-col">
        <div
          className="absolute -end-32 -top-32 -z-10 size-[34rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-primary)_75%,transparent),transparent)] opacity-60"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 -start-32 -z-10 size-[28rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-accent)_30%,transparent),transparent)] opacity-60"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 [background-image:radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.09)_1px,transparent_0)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
          aria-hidden="true"
        />
        {/* The route motif, drawn when the page opens */}
        <RouteArc
          id="auth-arc"
          tone="dark"
          delay={0.3}
          className="absolute inset-x-0 top-28 -z-10 w-full opacity-90"
        />

        <Link href="/" aria-label="Mersal" className="group/logo self-start">
          <Logo inverse />
        </Link>
        <div className="mt-auto max-w-md">
          <h2
            className="animate-fade-up text-4xl leading-tight font-semibold"
            style={{ animationDelay: '0.2s' }}
          >
            {t('panelTitle')}
          </h2>
          <p
            className="mt-4 animate-fade-up text-lg leading-relaxed text-white/70"
            style={{ animationDelay: '0.35s' }}
          >
            {t('panelBody')}
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {points.map(({ key, icon: Icon }, index) => (
              <li
                key={key}
                className="flex animate-fade-up items-center gap-3 text-sm text-white/85"
                style={{ animationDelay: `${0.5 + index * 0.1}s` }}
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/15">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {home(`${key}.title`)}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main id="main" className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Mersal" className="group/logo lg:invisible">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 animate-fade-up flex-col justify-center py-10 [animation-delay:0.1s]">
          {children}
        </div>
      </main>
    </div>
  );
}
