'use client';

import type { ConversationSummary } from '@mersal/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export const conversationsQueryKey = ['conversations'] as const;

/** The signed-in user's inbox. Kept fresh by realtime events; polling is the fallback. */
export function useConversations() {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: () => api<ConversationSummary[]>('/conversations'),
    refetchInterval: 60_000,
  });
}
