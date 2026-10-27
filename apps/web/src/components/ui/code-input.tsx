import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

/** Single field for a 6-digit one-time code (works with SMS autofill). */
export function CodeInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      dir="ltr"
      className={cn('h-14 text-center font-mono text-2xl tracking-[0.5em]', className)}
      {...props}
    />
  );
}
