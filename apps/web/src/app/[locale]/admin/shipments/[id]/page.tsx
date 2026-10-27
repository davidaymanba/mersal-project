'use client';

import type { QuoteCalculation, ShipmentView } from '@mersal/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { use, type ReactNode } from 'react';
import { MatchingLogPanel } from '@/components/admin/matching-log';
import { ShipmentOperations } from '@/components/admin/shipment-operations';
import { ChatPanel } from '@/components/shipments/chat-panel';
import { QuoteLines } from '@/components/pricing/quote-lines';
import { ShipmentStatusBadge, ShipmentTimeline } from '@/components/shipments/shipment-status';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api, apiUrl } from '@/lib/api';
import { gramsToKgText, useLocalized, useMoney } from '@/lib/catalog';

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
} | null;

interface AdminShipment extends Omit<ShipmentView, 'sender' | 'traveller'> {
  travellerEarning: number | null;
  commission: number | null;
  sender: Person;
  traveller: Person;
  quote: {
    id: string;
    breakdown: QuoteCalculation;
    pricingVersion: { id: string; version: number };
  } | null;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-xs p-6">
      <h2 className="mb-4 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function PersonCard({ person, emptyLabel }: { person: Person; emptyLabel: string }) {
  if (!person) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <Link
      href={`/admin/users/${person.id}`}
      className="block rounded-lg text-sm hover:text-primary"
    >
      <p className="font-medium text-ink">
        {person.firstName} {person.lastName}
      </p>
      <p className="text-muted-foreground" dir="ltr">
        {person.email} {person.phone && `· ${person.phone}`}
      </p>
    </Link>
  );
}

export default function AdminShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('admin.shipments.detail');
  const td = useTranslations('shipments.detail');
  const tc = useTranslations('common');
  const localized = useLocalized();
  const money = useMoney();
  const shipment = useQuery({
    queryKey: ['admin', 'shipment', id],
    queryFn: () => api<AdminShipment>(`/admin/shipments/${id}`),
  });

  if (!shipment.data) return <PageSpinner />;
  const s = shipment.data;

  return (
    <>
      <Link
        href="/admin/shipments"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {tc('back')}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground" dir="ltr">
            {s.reference} · {s.corridorCode}
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold text-ink">
            {localized(s.originCity.names)}
            <ArrowRight className="size-5 text-accent rtl:rotate-180" aria-hidden="true" />
            {localized(s.destinationCity.names)}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {localized(s.category.names)} · {gramsToKgText(s.weightGrams)} kg · {s.description}
          </p>
        </div>
        <ShipmentStatusBadge status={s.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Section title={t('sender')}>
          <PersonCard person={s.sender} emptyLabel={t('none')} />
        </Section>
        <Section title={t('traveller')}>
          <PersonCard person={s.traveller} emptyLabel={t('none')} />
        </Section>
        <Section title={td('recipient')}>
          <p className="text-sm font-medium text-ink">{s.recipientName}</p>
          <p className="text-sm text-muted-foreground" dir="ltr">
            {s.recipientPhone} {s.recipientEmail && `· ${s.recipientEmail}`}
          </p>
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Section title={t('money')}>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t('price')}</dt>
                <dd className="font-display text-2xl font-semibold text-ink">
                  {money(s.price, s.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('commission')}</dt>
                <dd className="font-display text-2xl font-semibold text-ink">
                  {money(s.commission, s.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('earning')}</dt>
                <dd className="font-display text-2xl font-semibold text-ink">
                  {money(s.travellerEarning, s.currency)}
                </dd>
              </div>
            </dl>
            {s.quote && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  {t('tariff')}: v{s.quote.pricingVersion.version}
                </p>
                <QuoteLines
                  lines={s.quote.breakdown.lines}
                  currency={s.currency}
                  chargeableGrams={s.quote.breakdown.chargeableGrams}
                  showRounding
                />
              </div>
            )}
          </Section>
          <ShipmentOperations
            shipmentId={s.id}
            status={s.status}
            pickupCode={s.pickupCode}
            deliveryCode={s.deliveryCode}
          />
          <MatchingLogPanel shipmentId={s.id} status={s.status} />
          {s.traveller && <ChatPanel shipmentId={s.id} viewerId="" readOnly />}
          {s.photos.length > 0 && (
            <Section title={td('photos')}>
              <div className="flex flex-wrap gap-3">
                {s.photos.map((photo) => (
                  <a
                    key={photo}
                    href={apiUrl(photo)}
                    target="_blank"
                    rel="noreferrer"
                    className="size-28 overflow-hidden rounded-xl border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- private file served with session cookies */}
                    <img src={apiUrl(photo)} alt="" className="size-full object-cover" />
                  </a>
                ))}
              </div>
            </Section>
          )}
        </div>
        <Section title={td('timeline')}>
          <ShipmentTimeline events={s.events} travellerId={s.traveller?.id} />
        </Section>
      </div>
    </>
  );
}
