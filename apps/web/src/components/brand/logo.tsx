'use client';

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { useBrand } from './brand-provider';
import { LogoMark } from './logo-mark';

export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  const brand = useBrand();
  const locale = useLocale();
  const textColor = inverse ? 'text-white' : 'text-ink';

  // Partner themes show the partner's name as text; their logo artwork is never reproduced.
  if (brand.id !== 'mersal') {
    return (
      <span className={cn('font-display text-xl font-bold tracking-tight', textColor, className)}>
        {locale === 'ar' ? brand.nameAr : brand.name}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className="size-8" mono={inverse} />
      <span
        className={cn(
          'font-display text-[1.55rem] leading-none font-semibold tracking-tight',
          textColor,
        )}
      >
        {locale === 'ar' ? brand.nameAr : 'mersal'}
      </span>
    </span>
  );
}
