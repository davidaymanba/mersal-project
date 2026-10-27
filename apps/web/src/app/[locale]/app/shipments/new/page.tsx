'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ShipmentDetailsSchema,
  type CreateShipmentSchema,
  type QuoteRequest,
  type QuoteResponse,
  type ShipmentView,
} from '@mersal/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormAlert } from '@/components/auth/form-alert';
import { QuoteCalculator } from '@/components/pricing/quote-calculator';
import { PhotoPicker } from '@/components/shipments/photo-picker';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { gramsToKgText, useCatalog, useLocalized, useMoney } from '@/lib/catalog';
import { useErrorMessage, useFieldError } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';

type StoredQuote = QuoteResponse & { inputs: QuoteRequest; used: boolean };
type DetailsForm = Omit<z.input<typeof CreateShipmentSchema>, 'quoteId'>;

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

function Steps({ step }: { step: 1 | 2 }) {
  const t = useTranslations('shipments.new.steps');
  return (
    <ol className="mb-8 flex items-center gap-3 text-sm">
      {(['quote', 'details'] as const).map((key, index) => {
        const n = (index + 1) as 1 | 2;
        const done = n < step;
        return (
          <li key={key} className="flex items-center gap-3">
            {index > 0 && <span className="h-px w-8 bg-border" />}
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                n === step
                  ? 'bg-primary text-primary-foreground'
                  : done
                    ? 'bg-success-tint text-success'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : n}
            </span>
            <span className={n === step ? 'font-medium text-ink' : 'text-muted-foreground'}>
              {t(key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function DetailsStep({ quote, onEditQuote }: { quote: StoredQuote; onEditQuote: () => void }) {
  const t = useTranslations('shipments.new');
  const te = useTranslations('errors');
  const router = useRouter();
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const fieldError = useFieldError();
  const localized = useLocalized();
  const money = useMoney();
  const { data: catalog } = useCatalog();
  const [photos, setPhotos] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const category = catalog?.categories.find((c) => c.code === quote.inputs.categoryCode);
  const origin = catalog?.cities.find((c) => c.id === quote.inputs.originCityId);
  const destination = catalog?.cities.find((c) => c.id === quote.inputs.destinationCityId);

  const schema = useMemo(() => ShipmentDetailsSchema.omit({ quoteId: true }), []);
  const form = useForm<DetailsForm>({
    resolver: zodResolver(schema),
    defaultValues: { earliestDate: today(), latestDate: plusDays(14) },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (category?.requiresPhotos && photos.length === 0) {
      setFormError(te('photos_required'));
      return;
    }
    if (values.latestDate < values.earliestDate) {
      form.setError('latestDate', { type: 'server', message: te('invalid_dates') });
      return;
    }
    try {
      const shipment = await api<ShipmentView>('/shipments', {
        body: { ...values, quoteId: quote.id },
      });
      if (photos.length) {
        const data = new FormData();
        photos.forEach((p) => data.append('photos', p));
        await api(`/shipments/${shipment.id}/photos`, { form: data });
      }
      await queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success(t('created'));
      router.replace(`/app/shipments/${shipment.id}`);
    } catch (error) {
      setFormError(describe(error));
    }
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-8 rounded-2xl border border-border bg-surface shadow-xs p-6 sm:p-8"
        noValidate
      >
        {formError && <FormAlert>{formError}</FormAlert>}

        <Field
          label={t('description')}
          hint={t('descriptionHint')}
          error={fieldError(errors.description)}
        >
          <Textarea rows={3} {...form.register('description')} />
        </Field>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium text-ink">{t('dates')}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('earliest')} error={fieldError(errors.earliestDate)}>
              <Input type="date" min={today()} {...form.register('earliestDate')} />
            </Field>
            <Field label={t('latest')} error={fieldError(errors.latestDate)}>
              <Input type="date" min={today()} {...form.register('latestDate')} />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground">{t('datesHint')}</p>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-sm font-medium text-ink">{t('recipient')}</legend>
          <Field label={t('recipientName')} error={fieldError(errors.recipientName)}>
            <Input autoComplete="off" {...form.register('recipientName')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('recipientPhone')} error={fieldError(errors.recipientPhone, 'phone')}>
              <Input
                type="tel"
                dir="ltr"
                placeholder="+213555123456"
                {...form.register('recipientPhone')}
              />
            </Field>
            <Field
              label={t('recipientEmail')}
              error={fieldError(errors.recipientEmail as never, 'email')}
            >
              <Input type="email" dir="ltr" {...form.register('recipientEmail')} />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-ink">{t('photos')}</legend>
          <p className="mb-3 text-sm text-muted-foreground">
            {category?.requiresPhotos ? t('photosHint') : t('photosOptional')}
          </p>
          <PhotoPicker files={photos} onChange={setPhotos} addLabel={t('addPhoto')} />
        </fieldset>

        <div>
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary)]"
              {...form.register('restrictedItemsAck')}
            />
            <span>
              {t('restrictedAck')}{' '}
              <Link
                href="/pricing#restricted"
                target="_blank"
                className="font-medium text-primary hover:underline"
              >
                {t('seeList')}
              </Link>
            </span>
          </label>
          {errors.restrictedItemsAck && (
            <p className="mt-1 text-sm text-danger">{fieldError(errors.restrictedItemsAck)}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="sm:self-start"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && <Spinner />}
          {t('submit')}
        </Button>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl bg-deep-glow p-6 text-white shadow-md">
          <p className="flex items-center gap-2 font-semibold">
            {localized(origin?.names)}
            <ArrowRight className="size-4 text-white/60 rtl:rotate-180" aria-hidden="true" />
            {localized(destination?.names)}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {localized(category?.names)} · {gramsToKgText(quote.inputs.weightGrams)} kg
          </p>
          <p className="mt-6 font-display text-4xl font-semibold tabular-nums">
            {money(quote.total, quote.currency)}
          </p>
          <Button variant="link" className="mt-4 text-white" onClick={onEditQuote}>
            <Pencil aria-hidden="true" />
            {t('changePrice')}
          </Button>
        </div>
      </aside>
    </div>
  );
}

export default function NewShipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>;
}) {
  const { quote: quoteId } = use(searchParams);
  const t = useTranslations('shipments.new');
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const stored = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => api<StoredQuote>(`/quotes/${quoteId}`),
    enabled: !!quoteId,
  });

  if (quoteId && stored.isPending) return <PageSpinner />;

  const quote = stored.data;
  const usable = quote && !quote.used && Date.parse(quote.expiresAt) > Date.now();
  const step = usable && !editing ? 2 : 1;

  return (
    <>
      <PageHeader title={t('title')} description={step === 1 ? t('priceStepBody') : undefined} />
      <Steps step={step} />
      {step === 2 && quote ? (
        <DetailsStep quote={quote} onEditQuote={() => setEditing(true)} />
      ) : (
        <>
          {quote && !usable && !editing && (
            <div className="mb-6">
              <FormAlert tone="info">{t('quoteExpired')}</FormAlert>
            </div>
          )}
          <QuoteCalculator
            initial={quote?.inputs}
            action={(q) => (
              <Button
                variant="inverse"
                size="lg"
                className="w-full"
                onClick={() => {
                  setEditing(false);
                  router.replace(`/app/shipments/new?quote=${q.id}`);
                }}
              >
                {t('continue')}
                <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
              </Button>
            )}
          />
          <p className="mt-6 text-sm">
            <Link
              href="/app/shipments"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-ink"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              {t('title')}
            </Link>
          </p>
        </>
      )}
    </>
  );
}
