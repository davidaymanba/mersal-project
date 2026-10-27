import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground ring-border/70',
        primary: 'bg-tint text-primary ring-primary/15',
        success: 'bg-success-tint text-success ring-success/15',
        warning: 'bg-warning-tint text-warning ring-warning/20',
        danger: 'bg-danger-tint text-danger ring-danger/15',
        info: 'bg-info-tint text-info ring-info/15',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

/** `live` adds a pulsing dot for states that are actively changing (in transit, matching). */
export function Badge({
  className,
  tone,
  live = false,
  children,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { live?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {live && (
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-current" />
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
