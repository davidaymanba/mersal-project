'use client';

import type { ShipmentEventView, ShipmentStatus } from '@mersal/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TONE: Record<
  ShipmentStatus,
  'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
> = {
  DRAFT: 'neutral',
  QUOTED: 'warning',
  PAID: 'info',
  MATCHING: 'info',
  MATCHED: 'primary',
  PICKED_UP: 'primary',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  NO_MATCH: 'warning',
  CANCELLED: 'neutral',
  DISPUTED: 'danger',
  REFUNDED: 'neutral',
};

/** Statuses where something is actively happening get a pulsing dot. */
const LIVE = new Set<ShipmentStatus>(['MATCHING', 'PICKED_UP', 'IN_TRANSIT']);

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const t = useTranslations('shipmentStatus');
  return (
    <Badge tone={TONE[status]} live={LIVE.has(status)}>
      {t(status)}
    </Badge>
  );
}

/** Who did it, from the viewer's point of view. */
function actorKey(event: ShipmentEventView, viewerId?: string, travellerId?: string) {
  if (event.actorType !== 'USER') return event.actorType;
  if (event.actorId && event.actorId === viewerId) return 'USER';
  return event.actorId && event.actorId === travellerId ? 'TRAVELLER' : 'SENDER';
}

export function ShipmentTimeline({
  events,
  viewerId,
  travellerId,
}: {
  events: ShipmentEventView[];
  viewerId?: string;
  travellerId?: string;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const ordered = [...events].reverse();

  return (
    <ol className="relative flex flex-col gap-5 ps-6 before:absolute before:inset-y-1 before:start-[0.4375rem] before:w-px before:bg-gradient-to-b before:from-primary/50 before:to-border">
      {ordered.map((event, index) => (
        <li
          key={event.id}
          className="relative animate-fade-up"
          style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
        >
          {index === 0 && (
            <span
              className="absolute -start-6 top-1 size-3.5 animate-ping-soft rounded-full bg-primary/40"
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              'absolute -start-6 top-1 size-3.5 rounded-full border-2 border-surface',
              index === 0 ? 'bg-primary ring-4 ring-tint' : 'bg-border',
            )}
          />
          <p
            className={cn(
              'text-sm font-medium',
              index === 0 ? 'text-ink' : 'text-muted-foreground',
            )}
          >
            {t(`shipmentStatus.${event.toStatus}`)}
          </p>
          <p className="text-xs text-muted-foreground">
            {format.dateTime(new Date(event.createdAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}{' '}
            · {t(`shipments.detail.by.${actorKey(event, viewerId, travellerId)}`)}
          </p>
          {event.note && event.actorType !== 'SYSTEM' && (
            <p className="mt-1 text-sm text-ink/80">“{event.note}”</p>
          )}
        </li>
      ))}
    </ol>
  );
}
