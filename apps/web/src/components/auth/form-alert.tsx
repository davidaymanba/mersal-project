import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  danger: { className: 'bg-danger-tint text-danger', Icon: CircleAlert },
  success: { className: 'bg-success-tint text-success', Icon: CircleCheck },
  info: { className: 'bg-info-tint text-info', Icon: Info },
} as const;

export function FormAlert({
  tone = 'danger',
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  const { className, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex animate-pop-in gap-2.5 rounded-lg px-3.5 py-3 text-sm ring-1 ring-current/15 ring-inset',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
