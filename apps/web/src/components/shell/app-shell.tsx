'use client';

import type { MeResponse, OfferView } from '@mersal/shared';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Inbox, LayoutDashboard, Package, Plane, Settings, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { AuthGate } from './auth-gate';
import { Shell, type NavSection } from './shell';

export const openOffersKey = ['offers', 'open'] as const;

export function useOpenOffers(enabled: boolean) {
  return useQuery({
    queryKey: openOffersKey,
    queryFn: () => api<OfferView[]>('/offers?status=open'),
    enabled,
    refetchInterval: 30_000,
  });
}

function AppNav({ me, children }: { me: MeResponse; children: ReactNode }) {
  const t = useTranslations('app.nav');
  const ts = useTranslations('shipments');
  const isTraveller = me.travellerStatus === 'APPROVED';
  const offers = useOpenOffers(isTraveller);
  const open = offers.data?.length ?? 0;

  const sections: NavSection[] = [
    {
      items: [
        { href: '/app', label: t('overview'), icon: LayoutDashboard, exact: true },
        { href: '/app/shipments', label: ts('title'), icon: Package },
      ],
    },
    {
      title: t('sectionTravel'),
      items: [
        { href: '/app/trips', label: t('trips'), icon: Plane },
        ...(isTraveller
          ? [
              {
                href: '/app/offers',
                label: t('offers'),
                icon: Inbox,
                badge: open ? <Badge tone="warning">{open}</Badge> : undefined,
              },
              { href: '/app/wallet', label: t('wallet'), icon: Wallet },
            ]
          : []),
      ],
    },
    {
      title: t('sectionAccount'),
      items: [
        { href: '/app/verification', label: t('verification'), icon: BadgeCheck },
        { href: '/app/settings', label: t('settings'), icon: Settings },
      ],
    },
  ];

  return (
    <Shell me={me} sections={sections}>
      {children}
    </Shell>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <AuthGate>{(me) => <AppNav me={me}>{children}</AppNav>}</AuthGate>;
}
