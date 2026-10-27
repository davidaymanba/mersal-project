import type { ReactNode } from 'react';
import { HeroGlow } from './hero-glow';

/** Eyebrow, page title and lead paragraph shared by the public pages. */
export function PageIntro({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <HeroGlow />
      <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border/80 bg-surface/80 px-3 py-1 text-sm font-medium text-accent-strong shadow-xs backdrop-blur">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
        {eyebrow}
      </p>
      <h1
        className="mt-5 animate-fade-up text-4xl leading-[1.08] font-semibold text-ink sm:text-5xl lg:text-[3.5rem]"
        style={{ animationDelay: '0.08s' }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="mt-5 animate-fade-up text-lg leading-relaxed text-muted-foreground"
          style={{ animationDelay: '0.16s' }}
        >
          {subtitle}
        </p>
      )}
      {children && (
        <div className="animate-fade-up" style={{ animationDelay: '0.24s' }}>
          {children}
        </div>
      )}
    </div>
  );
}
