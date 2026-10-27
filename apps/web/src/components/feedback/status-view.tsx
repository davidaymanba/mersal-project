import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Centred icon, title, message and actions for not-found and error screens. */
export function StatusView({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-tint text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
      {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
