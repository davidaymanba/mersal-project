import type { LocalizedText, ShipmentStatus } from '@mersal/shared';
import { ArrowRight, Check, KeyRound, Plane } from 'lucide-react';
import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { API_URL } from '@/lib/api';
import { toLocale, type AppLocale } from '@/i18n/routing';

interface Tracking {
  reference: string;
  status: ShipmentStatus;
  originCity: LocalizedText;
  destinationCity: LocalizedText;
  recipientName: string;
  traveller: { firstName: string } | null;
  departureDate: string | null;
  deliveryCode: string | null;
  events: { status: ShipmentStatus; createdAt: string }[];
}

type Props = { params: Promise<{ locale: string; token: string }> };

async function fetchTracking(token: string): Promise<Tracking | null> {
  const res = await fetch(`${API_URL}/tracking/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as Tracking) : null;
}

const STEPS: ShipmentStatus[] = ['PAID', 'MATCHED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];

export default async function TrackingPage({ params }: Props) {
  const { locale: raw, token } = await params;
  const locale: AppLocale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations('tracking');
  const ts = await getTranslations('shipmentStatus');
  const format = await getFormatter();
  const data = await fetchTracking(token);

  const reached = new Set(data?.events.map((e) => e.status));
  const when = (status: ShipmentStatus) => data?.events.find((e) => e.status === status)?.createdAt;

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        {!data ? (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted-foreground">
            {t('notFound')}
          </p>
        ) : (
          <>
            <p className="font-mono text-sm text-muted-foreground" dir="ltr">
              {data.reference}
            </p>
            <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-semibold text-ink">
              {data.originCity[locale]}
              <ArrowRight className="size-6 text-accent rtl:rotate-180" aria-hidden="true" />
              {data.destinationCity[locale]}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('for', { name: data.recipientName })} · {ts(data.status)}
            </p>

            {data.traveller && (
              <p className="mt-6 flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-ink">
                <Plane className="size-4 text-primary" aria-hidden="true" />
                {t('travellerWith', { name: data.traveller.firstName })}
                {data.departureDate &&
                  ` · ${t('departure', { date: format.dateTime(new Date(`${data.departureDate}T00:00:00`), { dateStyle: 'medium' }) })}`}
              </p>
            )}

            {data.deliveryCode && (
              <section className="mt-6 rounded-2xl bg-ink p-6 text-white">
                <p className="flex items-center gap-2 text-sm text-white/70">
                  <KeyRound className="size-4" aria-hidden="true" />
                  {t('codeTitle')}
                </p>
                <p className="mt-2 font-mono text-4xl font-semibold tracking-[0.35em]" dir="ltr">
                  {data.deliveryCode}
                </p>
                <p className="mt-3 text-sm text-white/70">{t('codeBody')}</p>
              </section>
            )}

            <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
              <h2 className="mb-5 font-semibold text-ink">{t('history')}</h2>
              <ol className="flex flex-col gap-4">
                {STEPS.map((step) => {
                  const done = reached.has(step);
                  const at = when(step);
                  return (
                    <li key={step} className="flex items-center gap-3">
                      <span
                        className={`flex size-7 items-center justify-center rounded-full border-2 ${done ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}
                      >
                        {done && <Check className="size-4" aria-hidden="true" />}
                      </span>
                      <span className={done ? 'font-medium text-ink' : 'text-muted-foreground'}>
                        {ts(step)}
                      </span>
                      {at && (
                        <span className="ms-auto text-xs text-muted-foreground">
                          {format.dateTime(new Date(at), {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: 'tracking',
  });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}
