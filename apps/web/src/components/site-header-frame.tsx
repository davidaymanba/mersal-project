'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Sticky public header that stays see-through over the hero and gains a surface once scrolled. */
export function SiteHeaderFrame({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300',
        scrolled
          ? 'border-border/70 bg-background/80 shadow-xs backdrop-blur-xl backdrop-saturate-150'
          : 'border-transparent bg-transparent',
      )}
    >
      {children}
      <div
        aria-hidden="true"
        className="scroll-progress absolute inset-x-0 -bottom-px h-0.5 origin-left bg-gradient-to-r from-primary to-accent rtl:origin-right rtl:bg-gradient-to-l"
      />
    </header>
  );
}
