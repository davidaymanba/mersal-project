import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-lg border border-border bg-surface px-3.5 text-[0.95rem] text-ink shadow-xs placeholder:text-muted-foreground/70 transition-[border-color,box-shadow] duration-200 hover:border-ink/25 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/12 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:hover:border-border aria-invalid:border-danger aria-invalid:ring-danger/15';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldBase, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea className={cn(fieldBase, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />
  );
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        fieldBase,
        'h-11 appearance-none bg-[length:1rem] bg-[position:right_0.75rem_center] bg-no-repeat pe-9 rtl:bg-[position:left_0.75rem_center]',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2352676a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium text-ink', className)} {...props} />;
}
