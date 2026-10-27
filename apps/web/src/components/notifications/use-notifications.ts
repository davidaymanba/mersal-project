'use client';

import type { NotificationItem } from '@mersal/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  BadgeCheck,
  Bell,
  CreditCard,
  Inbox,
  MessagesSquare,
  Package,
  Scale,
  ShieldAlert,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';

/** Prefix shared by every notifications query, so one invalidation refreshes the bell and the page. */
export const notificationsQueryKey = ['notifications'] as const;

const ICONS: Record<string, LucideIcon> = {
  verification: BadgeCheck,
  admin: ShieldAlert,
  offer: Inbox,
  shipment: Package,
  payment: CreditCard,
  message: MessagesSquare,
  wallet: Wallet,
  payout: Banknote,
  dispute: Scale,
};

export const notificationIcon = (type: string): LucideIcon =>
  ICONS[type.split('.')[0] ?? ''] ?? Bell;

/** Translated text for a notification and the action of opening it (mark read, then follow its link). */
export function useNotificationActions() {
  const t = useTranslations('notifications');
  const router = useRouter();
  const queryClient = useQueryClient();

  const text = useCallback(
    (n: NotificationItem) => {
      const key = `types.${n.type}` as 'types.verification.approved';
      return t.has(key) ? t(key, n.data as Record<string, string>) : n.type;
    },
    [t],
  );

  const open = useCallback(
    async (n: NotificationItem) => {
      if (!n.readAt)
        await api(`/notifications/${n.id}/read`, { method: 'POST' })
          .then(() => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }))
          .catch(() => undefined);
      if (n.link) router.push(n.link);
    },
    [queryClient, router],
  );

  const markAllRead = useCallback(
    () =>
      api('/notifications/read-all', { method: 'POST' }).then(() =>
        queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
      ),
    [queryClient],
  );

  return { text, open, markAllRead };
}
