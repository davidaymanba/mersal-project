'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Send, ShieldCheck } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { conversationsQueryKey } from '@/lib/conversations';
import { useShipmentChannel } from '@/lib/realtime';
import { useErrorMessage } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  senderId: string | null;
  body: string;
  originalBody?: string | null;
  masked: boolean;
  isSystem: boolean;
  createdAt: string;
}

interface Conversation {
  open: boolean;
  messages: Message[];
}

export function ChatPanel({
  shipmentId,
  viewerId,
  readOnly = false,
}: {
  shipmentId: string;
  viewerId: string;
  readOnly?: boolean;
}) {
  const t = useTranslations('chat');
  const format = useFormatter();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const key = ['conversation', shipmentId];
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  // Live updates over the socket; polling is a fallback if the socket is down.
  const conversation = useQuery({
    queryKey: key,
    queryFn: () => api<Conversation>(`/shipments/${shipmentId}/messages`),
    refetchInterval: 20_000,
  });

  const onMessage = useCallback(
    (message: Message) => {
      queryClient.setQueryData<Conversation>(['conversation', shipmentId], (current) =>
        current && !current.messages.some((m) => m.id === message.id)
          ? { ...current, messages: [...current.messages, message] }
          : current,
      );
    },
    [queryClient, shipmentId],
  );
  useShipmentChannel(shipmentId, onMessage);

  const count = conversation.data?.messages.length ?? 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' });
    if (count && !readOnly)
      void api(`/shipments/${shipmentId}/messages/read`, { method: 'POST' })
        .then(() => queryClient.invalidateQueries({ queryKey: conversationsQueryKey }))
        .catch(() => undefined);
  }, [count, shipmentId, readOnly, queryClient]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const message = await api<Message>(`/shipments/${shipmentId}/messages`, {
        body: { body: text },
      });
      onMessage(message);
      setText('');
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setSending(false);
    }
  }

  const messages = conversation.data?.messages ?? [];
  const time = (iso: string) =>
    format.dateTime(new Date(iso), {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-surface shadow-xs">
      <header className="border-b border-border px-6 py-4">
        <h2 className="font-semibold text-ink">{t('title')}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
          {t('maskedNote')}
        </p>
      </header>
      <div
        className="flex max-h-96 min-h-48 flex-col gap-3 overflow-y-auto px-6 py-4"
        aria-live="polite"
      >
        {!conversation.data && <Spinner className="m-auto" />}
        {conversation.data && messages.length === 0 && (
          <p className="m-auto text-center text-sm text-muted-foreground">{t('empty')}</p>
        )}
        {messages.map((m) =>
          m.isSystem ? (
            <p
              key={m.id}
              className="mx-auto flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
            >
              <Info className="size-3.5" aria-hidden="true" />
              {t.has(m.body as 'system.matched') ? t(m.body as 'system.matched') : m.body}
            </p>
          ) : (
            <div
              key={m.id}
              className={cn(
                'flex max-w-[80%] flex-col',
                m.senderId === viewerId ? 'self-end items-end' : 'self-start items-start',
              )}
            >
              <p
                className={cn(
                  'rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap',
                  m.senderId === viewerId
                    ? 'rounded-ee-sm bg-primary text-primary-foreground'
                    : 'rounded-es-sm bg-muted text-ink',
                )}
                dir="auto"
              >
                {m.body}
              </p>
              {m.originalBody && <p className="mt-1 text-xs text-warning">{m.originalBody}</p>}
              <span className="mt-1 text-[0.7rem] text-muted-foreground">{time(m.createdAt)}</span>
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>
      {!readOnly &&
        (conversation.data?.open ? (
          <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('placeholder')}
              maxLength={2000}
              aria-label={t('placeholder')}
            />
            <Button
              type="submit"
              size="icon"
              className="size-11 shrink-0"
              disabled={sending || !text.trim()}
              aria-label={t('send')}
            >
              {sending ? <Spinner /> : <Send className="rtl:-scale-x-100" aria-hidden="true" />}
            </Button>
          </form>
        ) : (
          conversation.data && (
            <p className="border-t border-border px-6 py-3 text-center text-sm text-muted-foreground">
              {t('closed')}
            </p>
          )
        ))}
    </section>
  );
}
