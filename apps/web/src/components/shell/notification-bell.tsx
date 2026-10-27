'use client';

import type { NotificationItem, NotificationsPage } from '@mersal/shared';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import {
  notificationsQueryKey,
  useNotificationActions,
} from '@/components/notifications/use-notifications';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useClickOutside } from '@/lib/use-click-outside';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const t = useTranslations('notifications');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const pathname = usePathname();
  const { text, open: openItem, markAllRead } = useNotificationActions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const { data } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => api<NotificationsPage>('/notifications?pageSize=20'),
    refetchInterval: 30_000,
  });

  function choose(n: NotificationItem) {
    setOpen(false);
    void openItem(n);
  }

  const unread = data?.unread ?? 0;
  const allHref = pathname.startsWith('/admin') ? '/admin/notifications' : '/app/notifications';

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('title')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="size-5!" aria-hidden="true" />
        {unread > 0 && (
          <span
            dir="ltr"
            className="absolute end-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] leading-4 font-semibold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold text-ink">{t('title')}</p>
            {unread > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={() => void markAllRead()}
                className="gap-1 text-xs"
              >
                <CheckCheck aria-hidden="true" />
                {t('markAll')}
              </Button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {!data?.items.length && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">{t('empty')}</li>
            )}
            {data?.items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => choose(n)}
                  className={cn(
                    'flex w-full gap-3 px-4 py-3 text-start text-sm transition-colors hover:bg-muted',
                    !n.readAt && 'bg-tint/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.readAt ? 'bg-transparent' : 'bg-accent',
                    )}
                  />
                  <span className="flex-1">
                    <span className="block text-ink">{text(n)}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {format.relativeTime(new Date(n.createdAt), now)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link
            href={allHref}
            onClick={close}
            className="block border-t border-border px-4 py-3 text-center text-sm font-medium text-primary hover:bg-muted"
          >
            {t('seeAll')}
          </Link>
        </div>
      )}
    </div>
  );
}
