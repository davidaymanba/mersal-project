'use client';

import { QuoteRequestSchema, type QuoteRequest, type QuoteResponse } from '@mersal/shared';
import { Clock, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { FormAlert } from '@/components/auth/form-alert';
import { CitySelect, useRoutes } from '@/components/catalog/city-select';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { categoryIcon, gramsToKgText, useCatalog, useLocalized, useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';
import { QuoteLines } from './quote-lines';

interface FormState {
  originCityId: string;
  destinationCityId: string;
  categoryCode: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  declaredValue: string;
  urgency: 'STANDARD' | 'EXPRESS';
  options: string[];
}

const toForm = (initial?: Partial<QuoteRequest>): FormState => ({
  originCityId: initial?.originCityId ?? '',
  destinationCityId: initial?.destinationCityId ?? '',
  categoryCode: initial?.categoryCode ?? '',
  weightKg: initial?.weightGrams ? gramsToKgText(initial.weightGrams) : '',
  lengthCm: initial?.lengthCm?.toString() ?? '',
  widthCm: initial?.widthCm?.toString() ?? '',
  heightCm: initial?.heightCm?.toString() ?? '',
  declaredValue: initial?.declaredValue != null ? String(initial.declaredValue / 100) : '',
  urgency: initial?.urgency ?? 'STANDARD',
  options: initial?.options ?? [],
});

const num = (value: string) => Number(value.replace(',', '.'));

function toRequest(form: FormState) {
  return QuoteRequestSchema.safeParse({
    originCityId: form.originCityId,
    destinationCityId: form.destinationCityId,
    categoryCode: form.categoryCode,
    weightGrams: Math.round(num(form.weightKg) * 1000),
    lengthCm: Math.round(num(form.lengthCm)),
    widthCm: Math.round(num(form.widthCm)),
    heightCm: Math.round(num(form.heightCm)),
    declaredValue: Math.round(num(form.declaredValue || '0') * 100),
    urgency: form.urgency,
    options: form.options,
  });
}

export function QuoteCalculator({
  initial,
  action,
}: {
  initial?: Partial<QuoteRequest>;
  /** Rendered under the price once a quote exists (e.g. "Send this parcel"). */
  action?: (quote: QuoteResponse) => ReactNode;
}) {
  const t = useTranslations('pricing');
  const localized = useLocalized();
  const money = useMoney();
  const describe = useErrorMessage();
  const catalog = useCatalog();
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [stale, setStale] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { origins, destinations } = useRoutes(catalog.data, form.originCityId);

  const corridor = useMemo(() => {
    const origin = catalog.data?.cities.find((c) => c.id === form.originCityId);
    const destination = catalog.data?.cities.find((c) => c.id === form.destinationCityId);
    return catalog.data?.corridors.find(
      (c) =>
        c.originCountry === origin?.countryCode &&
        c.destinationCountry === destination?.countryCode,
    );
  }, [catalog.data, form.originCityId, form.destinationCityId]);
  const optionNames = useMemo(
    () => new Map(corridor?.options.map((o) => [o.code, o.names])),
    [corridor],
  );

  if (!catalog.data) return <PageSpinner />;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Changing the origin can make the destination and options invalid.
      if (key === 'originCityId') {
        next.destinationCityId = '';
        next.options = [];
      }
      return next;
    });
    if (quote) setStale(true);
  };

  const parsed = toRequest(form);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!parsed.success) return;
    setError(null);
    setSubmitting(true);
    try {
      setQuote(await api<QuoteResponse>('/quotes', { body: parsed.data }));
      setStale(false);
    } catch (err) {
      setError(describe(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        onSubmit={submit}
        className="flex flex-col gap-8 rounded-2xl border border-border bg-surface p-6 sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CitySelect
            label={t('form.from')}
            value={form.originCityId}
            onChange={(v) => update('originCityId', v)}
            cities={origins}
            placeholder={t('form.chooseCity')}
          />
          <CitySelect
            label={t('form.to')}
            value={form.destinationCityId}
            onChange={(v) => update('destinationCityId', v)}
            cities={destinations}
            placeholder={
              form.originCityId && !destinations.length ? t('form.noRoutes') : t('form.chooseCity')
            }
            disabled={!form.originCityId}
          />
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-ink">{t('form.category')}</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {catalog.data.categories.map((category) => {
              const Icon = categoryIcon(category.icon);
              const selected = form.categoryCode === category.code;
              return (
                <label
                  key={category.code}
                  className={cn(
                    'flex cursor-pointer flex-col gap-2 rounded-xl border p-3 text-sm transition-colors',
                    selected
                      ? 'border-primary bg-tint/60 ring-2 ring-primary/15'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="category"
                    className="sr-only"
                    checked={selected}
                    onChange={() => update('categoryCode', category.code)}
                  />
                  <Icon
                    className={cn('size-5', selected ? 'text-primary' : 'text-muted-foreground')}
                    aria-hidden="true"
                  />
                  <span className="leading-snug font-medium text-ink">
                    {localized(category.names)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
          <Field label={t('form.weight')}>
            <Input
              inputMode="decimal"
              dir="ltr"
              placeholder="2.5"
              value={form.weightKg}
              onChange={(e) => update('weightKg', e.target.value)}
            />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink">{t('form.dimensions')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['lengthCm', 'widthCm', 'heightCm'] as const).map((key) => (
                <Input
                  key={key}
                  inputMode="numeric"
                  aria-label={t(`form.${key.replace('Cm', '') as 'length'}`)}
                  placeholder={t(`form.${key.replace('Cm', '') as 'length'}`)}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              ))}
            </div>
          </fieldset>
        </div>

        <Field
          label={t('form.declaredValue')}
          hint={t('form.declaredValueHint')}
          className="sm:max-w-xs"
        >
          <Input
            inputMode="decimal"
            dir="ltr"
            placeholder="0"
            value={form.declaredValue}
            onChange={(e) => update('declaredValue', e.target.value)}
          />
        </Field>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-ink">{t('form.urgency')}</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(['STANDARD', 'EXPRESS'] as const).map((urgency) => {
              const selected = form.urgency === urgency;
              const Icon = urgency === 'EXPRESS' ? Zap : Clock;
              return (
                <label
                  key={urgency}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors',
                    selected
                      ? 'border-primary bg-tint/60 ring-2 ring-primary/15'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="urgency"
                    className="sr-only"
                    checked={selected}
                    onChange={() => update('urgency', urgency)}
                  />
                  <Icon
                    className={cn(
                      'mt-0.5 size-5 shrink-0',
                      selected ? 'text-primary' : 'text-muted-foreground',
                    )}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block font-medium text-ink">
                      {t(`form.urgencyOptions.${urgency}.title`)}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {t(`form.urgencyOptions.${urgency}.body`)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {corridor && corridor.options.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-sm font-medium text-ink">{t('form.options')}</legend>
            <div className="flex flex-col gap-2">
              {corridor.options.map((option) => (
                <label
                  key={option.code}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--brand-primary)]"
                    checked={form.options.includes(option.code)}
                    onChange={(e) =>
                      update(
                        'options',
                        e.target.checked
                          ? [...form.options, option.code]
                          : form.options.filter((o) => o !== option.code),
                      )
                    }
                  />
                  <span className="flex-1 text-ink">{localized(option.names)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    +{money(option.price, corridor.currency)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error && <FormAlert>{error}</FormAlert>}
        <Button
          type="submit"
          size="lg"
          className="sm:self-start"
          disabled={!parsed.success || submitting}
        >
          {submitting && <Spinner />}
          {quote ? t('form.recalculate') : t('form.submit')}
        </Button>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div
          className={cn(
            'rounded-2xl bg-ink p-6 text-white transition-opacity',
            stale && 'opacity-60',
          )}
        >
          <p className="text-sm text-white/70">{t('result.title')}</p>
          {quote ? (
            <>
              <p className="mt-2 font-display text-5xl font-semibold tabular-nums">
                {money(quote.total, quote.currency)}
              </p>
              <div className="mt-6 rounded-xl bg-white p-4">
                <QuoteLines
                  lines={quote.lines}
                  currency={quote.currency}
                  chargeableGrams={quote.chargeableGrams}
                  optionNames={optionNames}
                />
              </div>
              {quote.volumetricGrams > num(form.weightKg) * 1000 &&
                quote.chargeableGrams === quote.volumetricGrams && (
                  <p className="mt-4 text-sm text-white/70">
                    {t('result.volumetric', { kg: gramsToKgText(quote.volumetricGrams) })}
                  </p>
                )}
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/70">
                <Clock className="size-4" aria-hidden="true" />
                {t('result.validFor', {
                  minutes: Math.max(
                    1,
                    Math.round((Date.parse(quote.expiresAt) - Date.now()) / 60_000),
                  ),
                })}
              </p>
              {!stale && action && <div className="mt-6">{action(quote)}</div>}
            </>
          ) : (
            <p className="mt-4 leading-relaxed text-white/70">{t('result.placeholder')}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
