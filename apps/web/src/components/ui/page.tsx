import { ChevronLeft, ChevronRight, Inbox, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-8 flex animate-fade-up flex-wrap items-end justify-between gap-4',
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold text-ink sm:text-[2rem] sm:leading-tight">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  icon: Icon = Inbox,
  children,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <div className="relative flex animate-fade-in flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
      <div className="bg-dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-60" />
      <span className="relative mb-2 flex size-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-tint/70" />
        <span className="absolute inset-2 rounded-full bg-tint" />
        <Icon className="relative size-6 text-primary" aria-hidden="true" />
      </span>
      <p className="relative font-medium text-ink">{title}</p>
      {children && <div className="relative mt-1 flex flex-col items-center gap-3">{children}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const t = useTranslations('common');
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>{t('pageOf', { page, pages })}</span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="rtl:rotate-180" aria-hidden="true" />
          {t('previous')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          {t('next')}
          <ChevronRight className="rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

/** Pass `index` when several cards sit in a row so they enter one after another. */
export function StatCard({
  label,
  value,
  footer,
  icon: Icon,
  index = 0,
}: {
  label: ReactNode;
  value: ReactNode;
  footer?: ReactNode;
  icon?: LucideIcon;
  index?: number;
}) {
  return (
    <div
      data-spotlight
      className="group relative animate-fade-up overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xs transition-shadow duration-300 hover:shadow-md"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary to-accent transition-transform duration-500 ease-out-expo group-hover:scale-x-100 rtl:origin-right"
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-tint text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-ink tabular-nums">{value}</p>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'animate-fade-in overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs',
        className,
      )}
    >
      <table className="w-full text-start text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-start [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_thead]:border-b [&_thead]:border-border [&_thead]:bg-muted/50 [&_tbody_tr]:border-b [&_tbody_tr]:border-border [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-tint/30 [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}
