'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { LocaleSwitcher } from './locale-switcher';
import { Button } from './ui/button';

const LINKS = [
  { href: '/how-it-works', key: 'howItWorks' },
  { href: '/services', key: 'services' },
  { href: '/pricing', key: 'pricing' },
  { href: '/help', key: 'help' },
] as const;

/** Public site navigation: inline links from md up, a disclosure menu below that. */
export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const current = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined;

  return (
    <>
      <nav aria-label={t('main')} className="hidden items-center gap-6 text-sm font-medium md:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current(link.href)}
            className="text-muted-foreground hover:text-ink aria-[current=page]:text-ink"
          >
            {t(link.key)}
          </Link>
        ))}
      </nav>

      <div className="ms-auto flex items-center gap-2">
        <LocaleSwitcher className="hidden sm:flex" />
        {signedIn ? (
          <Button size="sm" asChild>
            <Link href="/app">{t('account')}</Link>
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/login">{t('login')}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">{t('signup')}</Link>
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? t('close') : t('menu')}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X className="size-5!" aria-hidden="true" />
          ) : (
            <Menu className="size-5!" aria-hidden="true" />
          )}
        </Button>
      </div>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-surface shadow-[0_16px_32px_-24px_rgb(11_46_51/0.4)] md:hidden"
      >
        <nav aria-label={t('main')} className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <ul>
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={current(link.href)}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-muted',
                    'aria-[current=page]:bg-tint aria-[current=page]:text-primary',
                  )}
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border px-3 pt-4 pb-2">
            <LocaleSwitcher />
            {!signedIn && (
              <Button variant="secondary" size="sm" className="ms-auto" asChild>
                <Link href="/login">{t('login')}</Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
