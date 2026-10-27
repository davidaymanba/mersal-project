'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useCountryName } from '@/lib/catalog';

interface PricingOverview {
  id: string;
  code: string;
  originCountry: string;
  destinationCountry: string;
  currency: string;
  active: boolean;
  versions: {
    id: string;
    version: number;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    notes: string | null;
    createdAt: string;
    activatedAt: string | null;
    createdBy: { firstName: string; lastName: string } | null;
  }[];
}

const STATUS_TONE = { DRAFT: 'warning', ACTIVE: 'success', ARCHIVED: 'neutral' } as const;

export default function AdminPricingPage() {
  const t = useTranslations('admin.pricing');
  const tcat = useTranslations('admin.catalog');
  const format = useFormatter();
  const country = useCountryName();
  const overview = useQuery({
    queryKey: ['admin', 'pricing'],
    queryFn: () => api<PricingOverview[]>('/admin/pricing'),
  });

  if (!overview.data) return <PageSpinner />;

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {overview.data.map((corridor) => (
          <section
            key={corridor.id}
            className="rounded-2xl border border-border bg-surface shadow-xs p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-ink">
                  {country(corridor.originCountry)}
                  <ArrowRight
                    className="size-4 text-muted-foreground rtl:rotate-180"
                    aria-hidden="true"
                  />
                  {country(corridor.destinationCountry)}
                </h2>
                <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {corridor.code} · {corridor.currency}
                </p>
              </div>
              <Badge tone={corridor.active ? 'success' : 'neutral'}>
                {corridor.active ? tcat('active') : tcat('inactive')}
              </Badge>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {corridor.versions.length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">{t('noTariff')}</li>
              )}
              {corridor.versions.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/admin/pricing/${v.id}`}
                    className="flex items-center gap-3 py-2.5 text-sm hover:text-primary"
                  >
                    <span className="w-20 font-medium text-ink">
                      {t('version', { version: v.version })}
                    </span>
                    <Badge tone={STATUS_TONE[v.status]}>{t(`status.${v.status}`)}</Badge>
                    <span className="flex-1 truncate text-muted-foreground">{v.notes}</span>
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {format.dateTime(new Date(v.activatedAt ?? v.createdAt), {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
