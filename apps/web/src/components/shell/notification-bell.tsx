'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useClickOutside } from '@/lib/use-click-outside';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  data: Record<string, string | number>;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export const notificationsQueryKey = ['notifications'] as const;

export function NotificationBell() {
  const t = useTranslations('notifications');
  const format = useFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const { data } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => api<{ items: NotificationItem[]; unread: number }>('/notifications'),
    refetchInterval: 30_000,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  const markAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: invalidate,
  });

  const text = (n: NotificationItem) => {
    const key = `types.${n.type}` as 'types.verification.approved';
    return t.has(key) ? t(key, n.data as Record<string, string>) : n.type;
  };

  async function openItem(n: NotificationItem) {
    setOpen(false);
    if (!n.readAt)
      await api(`/notifications/${n.id}/read`, { method: 'POST' })
        .then(invalidate)
        .catch(() => undefined);
    if (n.link) router.push(n.link);
  }

  const unread = data?.unread ?? 0;

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
                onClick={() => markAll.mutate()}
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
                  onClick={() => openItem(n)}
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
                      {format.relativeTime(new Date(n.createdAt))}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
