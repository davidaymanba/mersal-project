'use client';

import type { CatalogCity, LocalizedText, Paginated, ShipmentStatus } from '@mersal/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { ShipmentStatusBadge } from '@/components/shipments/shipment-status';
import { Button } from '@/components/ui/button';
import { EmptyState, Pagination } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useLocalized, useMoney } from '@/lib/catalog';

export interface ShipmentSummary {
  id: string;
  reference: string;
  status: ShipmentStatus;
  originCity: CatalogCity;
  destinationCity: CatalogCity;
  categoryNames: LocalizedText;
  price: number | null;
  travellerEarning: number | null;
  currency: string;
  earliestDate: string;
  latestDate: string;
  createdAt: string;
}

export function ShipmentList({ role }: { role: 'sender' | 'traveller' }) {
  const t = useTranslations('shipments');
  const localized = useLocalized();
  const money = useMoney();
  const format = useFormatter();
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['shipments', role, page],
    queryFn: () => api<Paginated<ShipmentSummary>>(`/shipments?role=${role}&page=${page}`),
    placeholderData: keepPreviousData,
  });

  if (!list.data) return <PageSpinner />;
  if (!list.data.items.length) {
    return (
      <EmptyState title={role === 'sender' ? t('empty') : t('emptyCarrying')}>
        {role === 'sender' && (
          <Button asChild>
            <Link href="/app/shipments/new">{t('newAction')}</Link>
          </Button>
        )}
      </EmptyState>
    );
  }

  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00`), { day: 'numeric', month: 'short' });

  return (
    <>
      <ul className="flex flex-col gap-3">
        {list.data.items.map((s, index) => (
          <li
            key={s.id}
            className="animate-fade-up"
            style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
          >
            <Link
              href={`/app/shipments/${s.id}`}
              data-spotlight
              className="group/link relative flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-surface p-4 shadow-xs transition-[border-color,box-shadow,translate] duration-200 ease-out-quart hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="min-w-48 flex-1">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  {localized(s.originCity.names)}
                  <ArrowRight
                    className="size-4 text-muted-foreground rtl:rotate-180"
                    aria-hidden="true"
                  />
                  {localized(s.destinationCity.names)}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-mono" dir="ltr">
                    {s.reference}
                  </span>{' '}
                  · {localized(s.categoryNames)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {day(s.earliestDate)} – {day(s.latestDate)}
              </p>
              <p className="w-24 font-semibold text-ink tabular-nums sm:text-end">
                {money(role === 'traveller' ? s.travellerEarning : s.price, s.currency)}
              </p>
              <ShipmentStatusBadge status={s.status} />
            </Link>
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        pageSize={list.data.pageSize}
        total={list.data.total}
        onChange={setPage}
      />
    </>
  );
}
