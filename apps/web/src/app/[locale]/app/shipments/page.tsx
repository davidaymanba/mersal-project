'use client';

import { PackagePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ShipmentList } from '@/components/shipments/shipment-list';
import { SlidingThumb } from '@/components/motion/sliding-thumb';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export default function ShipmentsPage() {
  const t = useTranslations('shipments');
  const [tab, setTab] = useState<'sender' | 'traveller'>('sender');

  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Button asChild>
            <Link href="/app/shipments/new">
              <PackagePlus aria-hidden="true" />
              {t('newAction')}
            </Link>
          </Button>
        }
      />
      <div
        className="relative mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1 sm:w-fit"
        role="tablist"
      >
        <SlidingThumb />
        {(['sender', 'traveller'] as const).map((role) => (
          <button
            key={role}
            type="button"
            role="tab"
            aria-selected={tab === role}
            onClick={() => setTab(role)}
            className={cn(
              'relative flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === role ? 'text-surface' : 'text-muted-foreground hover:text-ink',
            )}
          >
            {t(`tabs.${role === 'sender' ? 'sending' : 'carrying'}`)}
          </button>
        ))}
      </div>
      <ShipmentList key={tab} role={tab} />
    </>
  );
}
