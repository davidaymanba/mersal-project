import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Logo } from './brand/logo';
import { LocaleSwitcher } from './locale-switcher';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');

  const columns = [
    {
      title: t('product'),
      links: [
        { href: '/how-it-works', label: nav('howItWorks') },
        { href: '/services', label: nav('services') },
        { href: '/pricing', label: nav('pricing') },
      ],
    },
    {
      title: t('support'),
      links: [
        { href: '/help', label: nav('help') },
        { href: '/help#prohibited', label: t('prohibited') },
        { href: '/signup?mode=traveller', label: t('becomeTraveller') },
      ],
    },
    {
      title: t('company'),
      links: [
        { href: '/terms', label: t('terms') },
        { href: '/privacy', label: t('privacy') },
        { href: '/brand', label: t('brand') },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-sand/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-8 sm:grid-cols-3 sm:px-6 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="sm:col-span-3 lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t('tagline')}
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-semibold text-ink">{column.title}</h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 border-t border-border/70 px-4 py-6 sm:px-6">
        <p className="text-sm text-muted-foreground">
          {t('rights', { year: new Date().getFullYear() })}
        </p>
        <LocaleSwitcher className="ms-auto" />
      </div>
    </footer>
  );
}
