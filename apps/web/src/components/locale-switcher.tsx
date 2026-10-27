'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
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
  // The thumb moves on click, before the new locale has finished loading.
  const [target, setTarget] = useState<string | null>(null);
  const shown = pending && target ? target : locale;
  const index = routing.locales.indexOf(shown as (typeof routing.locales)[number]);
  const count = routing.locales.length;

  return (
    <div
      role="group"
      aria-label={t('label')}
      aria-busy={pending}
      className={cn(
        'relative grid auto-cols-fr grid-flow-col items-center rounded-lg border border-border bg-surface p-0.5 shadow-xs',
        className,
      )}
    >
      {/* Sliding thumb under the active language */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 rounded-md bg-ink shadow-sm transition-[inset-inline-start] duration-300 ease-out-expo"
        style={{
          width: `calc((100% - 4px) / ${count})`,
          insetInlineStart: `calc(2px + ${Math.max(0, index)} * (100% - 4px) / ${count})`,
        }}
      />
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={t(l)}
          aria-pressed={l === locale}
          onClick={() => {
            setTarget(l);
            startTransition(() => router.replace(pathname, { locale: l }));
          }}
          className={cn(
            'relative h-7 min-w-8 rounded-md px-2 text-xs font-semibold transition-colors duration-200',
            l === shown ? 'text-surface' : 'text-muted-foreground hover:text-ink',
          )}
        >
          {SHORT_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
