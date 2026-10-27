'use client';

import type { MeResponse } from '@mersal/shared';
import { useEffect, type ReactNode } from 'react';
import { PageSpinner } from '@/components/ui/spinner';
import { usePathname, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { useMe } from '@/lib/session';

/** Renders children only for a signed-in user (and an admin when `admin` is set). */
export function AuthGate({
  admin = false,
  children,
}: {
  admin?: boolean;
  children: (me: MeResponse) => ReactNode;
}) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const unauthenticated = me.error instanceof ApiError && me.error.status === 401;
  const notAllowed = admin && me.data && me.data.role !== 'ADMIN';

  useEffect(() => {
    if (unauthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (notAllowed) router.replace('/app');
  }, [unauthenticated, notAllowed, router, pathname]);

  if (!me.data || notAllowed) return <PageSpinner />;
  return <>{children(me.data)}</>;
}
