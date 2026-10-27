import type { ReactNode } from 'react';

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
      <p className="text-sm font-medium text-accent-strong">{eyebrow}</p>
      <h1 className="mt-3 text-4xl leading-[1.1] font-semibold text-ink sm:text-5xl">{title}</h1>
      {subtitle && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
      {children}
    </div>
  );
}
