'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

const TRAVELLER_TONE = {
  NOT_STARTED: 'neutral',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
} as const;
const VERIFICATION_TONE = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' } as const;

export function TravellerBadge({ status }: { status: keyof typeof TRAVELLER_TONE }) {
  const t = useTranslations('app.travellerStatus');
  return <Badge tone={TRAVELLER_TONE[status]}>{t(status)}</Badge>;
}

export function AccountBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' }) {
  const t = useTranslations('admin.userStatus');
  return <Badge tone={status === 'ACTIVE' ? 'success' : 'danger'}>{t(status)}</Badge>;
}

export function VerificationBadge({ status }: { status: keyof typeof VERIFICATION_TONE }) {
  const t = useTranslations('admin.verifications.status');
  return <Badge tone={VERIFICATION_TONE[status]}>{t(status)}</Badge>;
}
