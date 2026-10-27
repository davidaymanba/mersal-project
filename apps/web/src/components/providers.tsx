'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { MotionObserver } from '@/components/motion/motion-observer';
import { ApiError } from '@/lib/api';
import { useResolvedTheme } from '@/lib/theme-client';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status > 0 && error.status < 500) return false;
  return failureCount < 2;
}

export function Providers({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const theme = useResolvedTheme();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: shouldRetry, staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <MotionObserver />
      <Toaster
        position="top-center"
        richColors
        closeButton
        theme={theme}
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
      />
    </QueryClientProvider>
  );
}
