import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,scale] duration-200 ease-out-quart active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.16),var(--shadow-sm)] hover:bg-primary-hover hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.16),var(--shadow-glow)]',
        secondary:
          'border border-border bg-surface text-ink shadow-xs hover:border-ink/20 hover:bg-muted/60',
        ghost: 'text-ink hover:bg-muted',
        inverse: 'bg-white text-deep shadow-sm hover:bg-white/90',
        outlineInverse: 'border border-white/25 text-white hover:border-white/45 hover:bg-white/10',
        danger: 'bg-danger text-surface shadow-sm hover:bg-danger/90',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-[0.95rem]',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
