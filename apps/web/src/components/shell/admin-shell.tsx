'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CreditCard,
  FileDown,
  LayoutDashboard,
  Luggage,
  Map as MapIcon,
  Package,
  ScrollText,
  Settings,
  ShieldAlert,
  Shuffle,
  Tags,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { AuthGate } from './auth-gate';
import { Shell, type NavSection } from './shell';

export interface AdminOverview {
  users: number;
  travellersVerified: number;
  pendingVerifications: number;
  suspended: number;
  openDisputes: number;
  noMatch: number;
}

export const adminOverviewKey = ['admin', 'overview'] as const;

export function useAdminOverview(enabled = true) {
  return useQuery({
    queryKey: adminOverviewKey,
    queryFn: () => api<AdminOverview>('/admin/overview'),
    enabled,
  });
}

function AdminNav({
  children,
  me,
}: {
  children: ReactNode;
  me: Parameters<typeof Shell>[0]['me'];
}) {
  const t = useTranslations('admin');
  const overview = useAdminOverview();
  const pending = overview.data?.pendingVerifications ?? 0;

  const sections: NavSection[] = [
    { items: [{ href: '/admin', label: t('nav.overview'), icon: LayoutDashboard, exact: true }] },
    {
      title: t('nav.sectionOperations'),
      items: [
        { href: '/admin/shipments', label: t('nav.shipments'), icon: Package },
        {
          href: '/admin/disputes',
          label: t('nav.disputes'),
          icon: ShieldAlert,
          badge: overview.data?.openDisputes ? (
            <Badge tone="danger">{overview.data.openDisputes}</Badge>
          ) : undefined,
        },
        { href: '/admin/payments', label: t('nav.payments'), icon: CreditCard },
        { href: '/admin/payouts', label: t('nav.payouts'), icon: Banknote },
      ],
    },
    {
      title: t('nav.sectionPeople'),
      items: [
        { href: '/admin/users', label: t('nav.users'), icon: Users },
        { href: '/admin/travellers', label: t('nav.travellers'), icon: Luggage },
        {
          href: '/admin/verifications',
          label: t('nav.verifications'),
          icon: BadgeCheck,
          badge: pending ? <Badge tone="warning">{pending}</Badge> : undefined,
        },
      ],
    },
    {
      title: t('nav.sectionConfig'),
      items: [
        { href: '/admin/pricing', label: t('nav.pricing'), icon: Tags },
        { href: '/admin/matching', label: t('nav.matching'), icon: Shuffle },
        { href: '/admin/catalog', label: t('nav.catalog'), icon: MapIcon },
        { href: '/admin/settings', label: t('nav.settings'), icon: Settings },
      ],
    },
    {
      title: t('nav.sectionInsights'),
      items: [
        { href: '/admin/reports', label: t('nav.reports'), icon: FileDown },
        { href: '/admin/audit', label: t('nav.audit'), icon: ScrollText },
      ],
    },
  ];

  return (
    <Shell
      me={me}
      sections={sections}
      tag={<Badge tone="primary">{t('title')}</Badge>}
      footer={
        <Link
          href="/app"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-ink"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t('nav.backToApp')}
        </Link>
      }
    >
      {children}
    </Shell>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return <AuthGate admin>{(me) => <AdminNav me={me}>{children}</AdminNav>}</AuthGate>;
}
