'use client';

import { CreditCard, Download, Package, Banknote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page';
import { apiUrl } from '@/lib/api';

const REPORTS = [
  { type: 'shipments', icon: Package },
  { type: 'payments', icon: CreditCard },
  { type: 'payouts', icon: Banknote },
] as const;

const isoDay = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

export default function AdminReportsPage() {
  const t = useTranslations('admin.reports');
  const [from, setFrom] = useState(isoDay(-30));
  const [to, setTo] = useState(isoDay(0));

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <div className="mb-6 flex flex-wrap gap-4">
        <Field label={t('from')} className="w-44">
          <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t('to')} className="w-44">
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {REPORTS.map(({ type, icon: Icon }) => (
          <section
            key={type}
            className="flex flex-col rounded-2xl border border-border bg-surface shadow-xs p-6"
          >
            <Icon className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-semibold text-ink">{t(`types.${type}.title`)}</h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{t(`types.${type}.body`)}</p>
            <Button variant="secondary" className="mt-5 self-start" asChild>
              <a href={apiUrl(`/admin/reports/${type}.csv?from=${from}&to=${to}`)} download>
                <Download aria-hidden="true" />
                {t('download')}
              </a>
            </Button>
          </section>
        ))}
      </div>
    </>
  );
}
