'use client';

import type { NotificationItem, NotificationsPage } from '@mersal/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckCheck, ChevronRight } from 'lucide-react';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useState } from 'react';
import { SlidingThumb } from '@/components/motion/sliding-thumb';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, Pagination } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  notificationIcon,
  notificationsQueryKey,
  useNotificationActions,
} from './use-notifications';

const PAGE_SIZE = 20;

const dayKey = (iso: string) => new Date(iso).toDateString();

/** Full notification history with an unread filter, grouped by day. Used in the app and the admin. */
export function NotificationsView() {
  const t = useTranslations('notifications');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { text, open, markAllRead } = useNotificationActions();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: [...notificationsQueryKey, 'page', filter, page],
    queryFn: () =>
      api<NotificationsPage>(`/notifications?filter=${filter}&page=${page}&pageSize=${PAGE_SIZE}`),
    placeholderData: keepPreviousData,
  });

  const dayLabel = (iso: string) => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    if (dayKey(iso) === today.toDateString()) return t('page.today');
    if (dayKey(iso) === yesterday.toDateString()) return t('page.yesterday');
    return format.dateTime(new Date(iso), { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const groups = (list.data?.items ?? []).reduce<{ key: string; items: NotificationItem[] }[]>(
    (acc, n) => {
      const key = dayKey(n.createdAt);
      const last = acc.at(-1);
      if (last?.key === key) last.items.push(n);
      else acc.push({ key, items: [n] });
      return acc;
    },
    [],
  );
  const unread = list.data?.unread ?? 0;

  const choose = (next: 'all' | 'unread') => {
    setFilter(next);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('page.subtitle')}
        actions={
          unread > 0 && (
            <Button variant="secondary" onClick={() => void markAllRead()}>
              <CheckCheck aria-hidden="true" />
              {t('markAll')}
            </Button>
          )
        }
      />

      <div
        role="group"
        aria-label={t('page.filter')}
        className="relative mb-6 inline-flex rounded-lg border border-border bg-surface p-1"
      >
        <SlidingThumb />
        {(['all', 'unread'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => choose(value)}
            className={cn(
              'relative rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === value ? 'text-surface' : 'text-muted-foreground hover:text-ink',
            )}
          >
            {value === 'all' ? t('page.all') : t('page.unread', { count: unread })}
          </button>
        ))}
      </div>

      {!list.data ? (
        <PageSpinner />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={filter === 'unread' ? t('page.noUnread') : t('empty')} />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} aria-label={dayLabel(group.items[0]!.createdAt)}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                {dayLabel(group.items[0]!.createdAt)}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
                {group.items.map((n) => {
                  const Icon = notificationIcon(n.type);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => void open(n)}
                        className={cn(
                          'flex w-full items-center gap-4 px-5 py-4 text-start transition-colors hover:bg-muted',
                          !n.readAt && 'bg-tint/40',
                        )}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tint text-primary">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block text-ink', !n.readAt && 'font-medium')}>
                            {text(n)}
                          </span>
                          <time
                            dateTime={n.createdAt}
                            title={format.dateTime(new Date(n.createdAt), {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                            className="mt-0.5 block text-xs text-muted-foreground"
                          >
                            {format.relativeTime(new Date(n.createdAt), now)}
                          </time>
                        </span>
                        {!n.readAt && (
                          <span className="size-2 shrink-0 rounded-full bg-accent">
                            <span className="sr-only">{t('page.unreadMarker')}</span>
                          </span>
                        )}
                        {n.link && (
                          <ChevronRight
                            className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onChange={setPage} />
        </div>
      )}
    </>
  );
}
