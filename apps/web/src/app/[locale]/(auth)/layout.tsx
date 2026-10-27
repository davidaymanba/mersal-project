import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Link } from '@/i18n/navigation';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('auth');

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <Link href="/" aria-label="Mersal">
          <Logo inverse />
        </Link>
        <div className="mt-auto max-w-md">
          <h2 className="text-4xl leading-tight font-semibold">{t('panelTitle')}</h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70">{t('panelBody')}</p>
        </div>
        {/* Decorative route arc echoing the logo mark */}
        <svg
          viewBox="0 0 400 200"
          className="pointer-events-none absolute -end-10 top-24 w-[28rem] opacity-25 rtl:-scale-x-100"
          aria-hidden="true"
        >
          <path
            d="M20 180 C 120 -20, 280 -20, 380 120"
            fill="none"
            stroke="var(--brand-primary)"
            strokeWidth="3"
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
          <circle cx="380" cy="120" r="8" fill="var(--brand-accent)" />
          <circle cx="20" cy="180" r="6" fill="white" />
        </svg>
      </aside>

      <main id="main" className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Mersal" className="lg:invisible">
            <Logo />
          </Link>
          <LocaleSwitcher />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
