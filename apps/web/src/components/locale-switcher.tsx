'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const SHORT_LABEL: Record<string, string> = { en: 'EN', fr: 'FR', ar: 'ع' };

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('locale');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t('label')}
      aria-busy={pending}
      className={cn('flex items-center rounded-lg border border-border p-0.5', className)}
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={t(l)}
          aria-pressed={l === locale}
          onClick={() => startTransition(() => router.replace(pathname, { locale: l }))}
          className={cn(
            'h-7 min-w-8 rounded-md px-2 text-xs font-semibold transition-colors',
            l === locale ? 'bg-ink text-white' : 'text-muted-foreground hover:text-ink',
          )}
        >
          {SHORT_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
