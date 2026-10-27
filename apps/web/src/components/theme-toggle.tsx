'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { applyTheme, resolvedTheme } from '@/lib/theme-client';
import { cn } from '@/lib/utils';

/**
 * Switches between light and dark. The new theme spreads out as a circle from the button
 * (View Transitions API); browsers without it, or visitors who prefer reduced motion, get
 * an instant switch. The icon is chosen by CSS, so server and client markup always match.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('theme');

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) {
      applyTheme(next);
      return;
    }

    // Keyboard clicks report 0,0: start from the button's centre instead.
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || box.left + box.width / 2;
    const y = event.clientY || box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const root = document.documentElement;
    root.setAttribute('data-theme-switching', '');
    const transition = document.startViewTransition(() => applyTheme(next));
    void transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 650,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
    void transition.finished.finally(() => root.removeAttribute('data-theme-switching'));
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={t('toggle')}
      title={t('toggle')}
      className={cn('relative overflow-hidden', className)}
    >
      <Sun
        className="absolute size-5! rotate-90 scale-0 opacity-0 transition-[rotate,scale,opacity] duration-500 ease-spring dark:rotate-0 dark:scale-100 dark:opacity-100"
        aria-hidden="true"
      />
      <Moon
        className="absolute size-5! rotate-0 scale-100 opacity-100 transition-[rotate,scale,opacity] duration-500 ease-spring dark:-rotate-90 dark:scale-0 dark:opacity-0"
        aria-hidden="true"
      />
    </Button>
  );
}
