'use client';

import type { ConversationSummary } from '@mersal/shared';
import { ArrowLeft, ExternalLink, MessagesSquare } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { use } from 'react';
import { Avatar } from '@/components/shell/user-menu';
import { ChatPanel } from '@/components/shipments/chat-panel';
import { ShipmentStatusBadge } from '@/components/shipments/shipment-status';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { useLocalized } from '@/lib/catalog';
import { useConversations } from '@/lib/conversations';
import { useMe } from '@/lib/session';
import { cn } from '@/lib/utils';

export default function MessagesPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s: selectedId } = use(searchParams);
  const t = useTranslations('inbox');
  const tChat = useTranslations('chat');
  const format = useFormatter();
  const localized = useLocalized();
  const me = useMe();
  const conversations = useConversations();

  if (!conversations.data || !me.data) return <PageSpinner />;
  const list = conversations.data;
  const selected = list.find((c) => c.shipmentId === selectedId);

  const name = (c: ConversationSummary) =>
    c.counterpart
      ? `${c.counterpart.firstName} ${c.counterpart.lastInitial}.`
      : t(c.role === 'sender' ? 'noTraveller' : 'noSender');
  const counterpartRole = (c: ConversationSummary) =>
    t(c.role === 'sender' ? 'roles.traveller' : 'roles.sender');

  const preview = (c: ConversationSummary) => {
    const last = c.lastMessage;
    if (!last) return t('noMessages');
    if (last.isSystem)
      return tChat.has(last.body as 'system.matched') ? tChat(last.body as 'system.matched') : '';
    return last.fromMe ? t('you', { text: last.body }) : last.body;
  };

  const when = (iso: string) => {
    const date = new Date(iso);
    return date.toDateString() === new Date().toDateString()
      ? format.dateTime(date, { hour: '2-digit', minute: '2-digit' })
      : format.dateTime(date, { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />
      {list.length === 0 ? (
        <EmptyState title={t('emptyTitle')}>
          <p className="max-w-sm text-sm text-muted-foreground">{t('emptyBody')}</p>
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <nav
            aria-label={t('listLabel')}
            className={cn(
              'self-start overflow-hidden rounded-2xl border border-border bg-surface',
              selected && 'hidden lg:block',
            )}
          >
            <ul className="divide-y divide-border">
              {list.map((c) => (
                <li key={c.shipmentId}>
                  <Link
                    href={`/app/messages?s=${c.shipmentId}`}
                    replace
                    scroll={false}
                    aria-current={c.shipmentId === selectedId ? 'page' : undefined}
                    className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted aria-[current=page]:bg-tint/60"
                  >
                    <Avatar
                      firstName={c.counterpart?.firstName ?? '?'}
                      lastName={c.counterpart?.lastInitial ?? ''}
                      className="size-10"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <bdi className="truncate font-medium text-ink">{name(c)}</bdi>
                        {c.lastMessage && (
                          <time
                            dateTime={c.lastMessage.createdAt}
                            className="shrink-0 text-xs text-muted-foreground"
                          >
                            {when(c.lastMessage.createdAt)}
                          </time>
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        <span className="font-mono" dir="ltr">
                          {c.reference}
                        </span>
                        {' · '}
                        {localized(c.route.from)} → {localized(c.route.to)}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span
                          dir="auto"
                          className={cn(
                            'flex-1 truncate text-sm',
                            c.unread ? 'font-medium text-ink' : 'text-muted-foreground',
                          )}
                        >
                          {preview(c)}
                        </span>
                        {c.unread > 0 && (
                          <span
                            dir="ltr"
                            className="flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs leading-5 font-semibold text-white"
                          >
                            {c.unread}
                            <span className="sr-only"> {t('unread')}</span>
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={cn(!selected && 'hidden lg:block')}>
            {selected ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="ghost" size="sm" className="lg:hidden" asChild>
                    <Link href="/app/messages" replace scroll={false}>
                      <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
                      {t('back')}
                    </Link>
                  </Button>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-ink">
                      <bdi>{name(selected)}</bdi>
                    </h2>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">
                      {counterpartRole(selected)} ·{' '}
                      <span className="font-mono" dir="ltr">
                        {selected.reference}
                      </span>
                    </p>
                  </div>
                  <ShipmentStatusBadge status={selected.status} />
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/app/shipments/${selected.shipmentId}`}>
                      <ExternalLink aria-hidden="true" />
                      {t('openShipment')}
                    </Link>
                  </Button>
                </div>
                <ChatPanel
                  key={selected.shipmentId}
                  shipmentId={selected.shipmentId}
                  viewerId={me.data.id}
                />
              </div>
            ) : (
              <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
                <MessagesSquare className="size-8 text-muted-foreground/60" aria-hidden="true" />
                {t('select')}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
