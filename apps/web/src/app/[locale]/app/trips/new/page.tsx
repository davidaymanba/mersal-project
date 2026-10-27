'use client';

import { TripInputSchema, type TripView } from '@mersal/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { CitySelect, useRoutes } from '@/components/catalog/city-select';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { categoryIcon, useCatalog, useLocalized } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';

const today = () => new Date().toISOString().slice(0, 10);

export default function NewTripPage() {
  const t = useTranslations('trips.new');
  const tp = useTranslations('pricing.form');
  const localized = useLocalized();
  const router = useRouter();
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const catalog = useCatalog();
  const [form, setForm] = useState({
    originCityId: '',
    destinationCityId: '',
    departureDate: '',
    arrivalDate: '',
    capacityKg: '5',
    maxItems: '3',
    maxLengthCm: '',
    categoryCodes: [] as string[],
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { origins, destinations } = useRoutes(catalog.data, form.originCityId);

  if (!catalog.data) return <PageSpinner />;

  const parsed = TripInputSchema.safeParse({
    originCityId: form.originCityId,
    destinationCityId: form.destinationCityId,
    departureDate: form.departureDate,
    arrivalDate: form.arrivalDate || undefined,
    capacityGrams: Math.round(Number(form.capacityKg.replace(',', '.')) * 1000),
    maxItems: Number(form.maxItems),
    maxLengthCm: form.maxLengthCm ? Number(form.maxLengthCm) : undefined,
    categoryCodes: form.categoryCodes,
    notes: form.notes || undefined,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!parsed.success) return;
    setError(null);
    setSubmitting(true);
    try {
      const trip = await api<TripView>('/trips', { body: parsed.data });
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success(t('published'));
      router.replace(`/app/trips/${trip.id}`);
    } catch (err) {
      setError(describe(err));
    } finally {
      setSubmitting(false);
    }
  }

  const toggleCategory = (code: string) =>
    setForm((f) => ({
      ...f,
      categoryCodes: f.categoryCodes.includes(code)
        ? f.categoryCodes.filter((c) => c !== code)
        : [...f.categoryCodes, code],
    }));

  return (
    <>
      <PageHeader title={t('title')} />
      <form
        onSubmit={submit}
        className="flex max-w-3xl flex-col gap-8 rounded-2xl border border-border bg-surface shadow-xs p-6 sm:p-8"
      >
        {error && <FormAlert>{error}</FormAlert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <CitySelect
            label={t('from')}
            value={form.originCityId}
            onChange={(v) => setForm({ ...form, originCityId: v, destinationCityId: '' })}
            cities={origins}
            placeholder={tp('chooseCity')}
          />
          <CitySelect
            label={t('to')}
            value={form.destinationCityId}
            onChange={(v) => setForm({ ...form, destinationCityId: v })}
            cities={destinations}
            placeholder={tp('chooseCity')}
            disabled={!form.originCityId}
          />
          <Field label={t('departure')}>
            <Input
              type="date"
              min={today()}
              value={form.departureDate}
              onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
            />
          </Field>
          <Field label={t('arrival')}>
            <Input
              type="date"
              min={form.departureDate || today()}
              value={form.arrivalDate}
              onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={t('capacity')} hint={t('capacityHint')}>
            <Input
              inputMode="decimal"
              dir="ltr"
              value={form.capacityKg}
              onChange={(e) => setForm({ ...form, capacityKg: e.target.value })}
            />
          </Field>
          <Field label={t('maxItems')}>
            <Input
              inputMode="numeric"
              dir="ltr"
              value={form.maxItems}
              onChange={(e) => setForm({ ...form, maxItems: e.target.value })}
            />
          </Field>
          <Field label={t('maxLength')}>
            <Input
              inputMode="numeric"
              dir="ltr"
              value={form.maxLengthCm}
              onChange={(e) => setForm({ ...form, maxLengthCm: e.target.value })}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink">{t('categories')}</legend>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">{t('categoriesHint')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {catalog.data.categories.map((category) => {
              const Icon = categoryIcon(category.icon);
              const checked = form.categoryCodes.includes(category.code);
              return (
                <label
                  key={category.code}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                    checked ? 'border-primary bg-tint/60' : 'border-border hover:bg-muted',
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleCategory(category.code)}
                  />
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      checked ? 'text-primary' : 'text-muted-foreground',
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-ink">{localized(category.names)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field label={t('notes')}>
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          className="sm:self-start"
          disabled={!parsed.success || submitting}
        >
          {submitting && <Spinner />}
          {t('submit')}
        </Button>
      </form>
    </>
  );
}
