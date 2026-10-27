'use client';

import type { MeResponse } from '@mersal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';
import { api } from './api';
import { disconnectSocket } from './realtime';

export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery({ queryKey: meQueryKey, queryFn: () => api<MeResponse>('/auth/me') });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      disconnectSocket();
      queryClient.clear();
      router.replace('/login');
    },
  });
}

/** Only allow redirects to paths inside the app (prevents open redirects via ?next=). */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next.replace(/^\/(en|fr|ar)(?=\/|$)/, '') || fallback;
}
