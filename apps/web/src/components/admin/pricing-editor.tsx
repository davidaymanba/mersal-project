'use client';

import {
  PricingRulesSchema,
  type LocalizedText,
  type PricingRules,
  type QuoteCalculation,
} from '@mersal/shared';
import { Play, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import { QuoteLines } from '@/components/pricing/quote-lines';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { useCatalog, useLocalized, useMoney } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';

/** Editor state uses the units admins think in: euros, kilograms and percentages. */
export interface EditorState {
  currency: string;
  minimumPrice: string;
  commissionPercent: string;
  roundTo: string;
  volumetricDivisor: string;
  maxWeightKg: string;
  brackets: { upToKg: string; price: string }[];
  extraPerKg: string;
  categoryMultipliers: Record<string, string>;
  freeUpTo: string;
  feePercent: string;
  standard: string;
  express: string;
  options: { code: string; names: LocalizedText; price: string }[];
}

const eur = (minor: number) => String(minor / 100);
const toMinor = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);
const toNumber = (v: string) => Number(v.replace(',', '.'));

export function rulesToState(rules: PricingRules): EditorState {
  return {
    currency: rules.currency,
    minimumPrice: eur(rules.minimumPrice),
    commissionPercent: String(rules.commissionBps / 100),
    roundTo: eur(rules.roundTo),
    volumetricDivisor: String(rules.volumetricDivisor),
    maxWeightKg: String(rules.maxWeightGrams / 1000),
    brackets: rules.brackets.map((b) => ({
      upToKg: String(b.upToGrams / 1000),
      price: eur(b.price),
    })),
    extraPerKg: eur(rules.extraPerKg),
    categoryMultipliers: Object.fromEntries(
      Object.entries(rules.categoryMultipliers).map(([k, v]) => [k, String(v)]),
    ),
    freeUpTo: eur(rules.declaredValue.freeUpTo),
    feePercent: String(rules.declaredValue.feeBps / 100),
    standard: String(rules.urgencyMultipliers.STANDARD),
    express: String(rules.urgencyMultipliers.EXPRESS),
    options: rules.options.map((o) => ({ code: o.code, names: o.names, price: eur(o.price) })),
  };
}

export function stateToRules(state: EditorState) {
  return PricingRulesSchema.safeParse({
    currency: state.currency,
    minimumPrice: toMinor(state.minimumPrice),
    commissionBps: Math.round(toNumber(state.commissionPercent) * 100),
    roundTo: toMinor(state.roundTo),
    volumetricDivisor: Math.round(toNumber(state.volumetricDivisor)),
    maxWeightGrams: Math.round(toNumber(state.maxWeightKg) * 1000),
    brackets: state.brackets.map((b) => ({
      upToGrams: Math.round(toNumber(b.upToKg) * 1000),
      price: toMinor(b.price),
    })),
    extraPerKg: toMinor(state.extraPerKg),
    categoryMultipliers: Object.fromEntries(
      Object.entries(state.categoryMultipliers)
        .filter(([, v]) => v.trim() !== '' && toNumber(v) !== 1)
        .map(([k, v]) => [k, toNumber(v)]),
    ),
    declaredValue: {
      freeUpTo: toMinor(state.freeUpTo),
      feeBps: Math.round(toNumber(state.feePercent) * 100),
    },
    urgencyMultipliers: { STANDARD: toNumber(state.standard), EXPRESS: toNumber(state.express) },
    options: state.options.map((o) => ({
      code: o.code.trim().toUpperCase(),
      names: o.names,
      price: toMinor(o.price),
    })),
  });
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
  suffix,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <span className="relative">
        <Input
          inputMode="decimal"
          dir="ltr"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={suffix ? 'pe-10' : undefined}
        />
        {suffix && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-border bg-surface shadow-xs p-6', className)}>
      <h2 className="mb-5 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function PricingEditor({
  state,
  onChange,
  readOnly,
}: {
  state: EditorState;
  onChange: (state: EditorState) => void;
  readOnly: boolean;
}) {
  const t = useTranslations('admin.pricing.editor');
  const tp = useTranslations('pricing.form');
  const localized = useLocalized();
  const { data: catalog } = useCatalog();
  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) =>
    onChange({ ...state, [key]: value });
  const cur = state.currency === 'EUR' ? '€' : state.currency;

  return (
    <div className="flex flex-col gap-6">
      <Panel title={t('general')}>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label={t('minimumPrice')}
            value={state.minimumPrice}
            onChange={(v) => set('minimumPrice', v)}
            disabled={readOnly}
            suffix={cur}
          />
          <NumberField
            label={t('commission')}
            value={state.commissionPercent}
            onChange={(v) => set('commissionPercent', v)}
            disabled={readOnly}
            suffix="%"
          />
          <NumberField
            label={t('roundTo')}
            value={state.roundTo}
            onChange={(v) => set('roundTo', v)}
            disabled={readOnly}
            suffix={cur}
          />
          <NumberField
            label={t('volumetricDivisor')}
            value={state.volumetricDivisor}
            onChange={(v) => set('volumetricDivisor', v)}
            disabled={readOnly}
          />
          <NumberField
            label={t('maxWeight')}
            value={state.maxWeightKg}
            onChange={(v) => set('maxWeightKg', v)}
            disabled={readOnly}
            suffix="kg"
          />
        </div>
      </Panel>

      <Panel title={t('brackets')}>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-3 text-xs font-medium text-muted-foreground uppercase">
            <span>{t('upTo')}</span>
            <span>{t('price')}</span>
          </div>
          {state.brackets.map((bracket, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_2.5rem] items-center gap-3">
              <Input
                inputMode="decimal"
                dir="ltr"
                value={bracket.upToKg}
                disabled={readOnly}
                aria-label={t('upTo')}
                onChange={(e) =>
                  set(
                    'brackets',
                    state.brackets.map((b, i) =>
                      i === index ? { ...b, upToKg: e.target.value } : b,
                    ),
                  )
                }
              />
              <Input
                inputMode="decimal"
                dir="ltr"
                value={bracket.price}
                disabled={readOnly}
                aria-label={t('price')}
                onChange={(e) =>
                  set(
                    'brackets',
                    state.brackets.map((b, i) =>
                      i === index ? { ...b, price: e.target.value } : b,
                    ),
                  )
                }
              />
              {!readOnly && state.brackets.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove"
                  onClick={() =>
                    set(
                      'brackets',
                      state.brackets.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              variant="link"
              size="sm"
              className="self-start"
              onClick={() => set('brackets', [...state.brackets, { upToKg: '', price: '' }])}
            >
              <Plus aria-hidden="true" />
              {t('addBracket')}
            </Button>
          )}
        </div>
        <div className="mt-4 sm:max-w-xs">
          <NumberField
            label={t('extraPerKg')}
            value={state.extraPerKg}
            onChange={(v) => set('extraPerKg', v)}
            disabled={readOnly}
            suffix={cur}
          />
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title={t('declaredValue')}>
          <div className="grid gap-4">
            <NumberField
              label={t('freeUpTo')}
              value={state.freeUpTo}
              onChange={(v) => set('freeUpTo', v)}
              disabled={readOnly}
              suffix={cur}
            />
            <NumberField
              label={t('feePercent')}
              value={state.feePercent}
              onChange={(v) => set('feePercent', v)}
              disabled={readOnly}
              suffix="%"
            />
          </div>
        </Panel>
        <Panel title={t('urgency')}>
          <div className="grid gap-4">
            <NumberField
              label={tp('urgencyOptions.STANDARD.title')}
              value={state.standard}
              onChange={(v) => set('standard', v)}
              disabled={readOnly}
              suffix="×"
            />
            <NumberField
              label={tp('urgencyOptions.EXPRESS.title')}
              value={state.express}
              onChange={(v) => set('express', v)}
              disabled={readOnly}
              suffix="×"
            />
          </div>
        </Panel>
      </div>

      <Panel title={t('categoryMultipliers')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {catalog?.categories.map((category) => (
            <NumberField
              key={category.code}
              label={localized(category.names)}
              value={state.categoryMultipliers[category.code] ?? '1'}
              onChange={(v) =>
                set('categoryMultipliers', { ...state.categoryMultipliers, [category.code]: v })
              }
              disabled={readOnly}
              suffix="×"
            />
          ))}
        </div>
      </Panel>

      <Panel title={t('options')}>
        <div className="flex flex-col gap-3">
          {state.options.map((option, index) => (
            <div key={index} className="grid items-end gap-3 sm:grid-cols-[8rem_1fr_7rem]">
              <Label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Code</span>
                <Input
                  dir="ltr"
                  value={option.code}
                  disabled={readOnly}
                  onChange={(e) =>
                    set(
                      'options',
                      state.options.map((o, i) =>
                        i === index ? { ...o, code: e.target.value } : o,
                      ),
                    )
                  }
                />
              </Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(['en', 'fr', 'ar'] as const).map((lang) => (
                  <Input
                    key={lang}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    aria-label={lang}
                    placeholder={lang.toUpperCase()}
                    value={option.names[lang]}
                    disabled={readOnly}
                    onChange={(e) =>
                      set(
                        'options',
                        state.options.map((o, i) =>
                          i === index ? { ...o, names: { ...o.names, [lang]: e.target.value } } : o,
                        ),
                      )
                    }
                  />
                ))}
              </div>
              <NumberField
                label={t('price')}
                value={option.price}
                onChange={(v) =>
                  set(
                    'options',
                    state.options.map((o, i) => (i === index ? { ...o, price: v } : o)),
                  )
                }
                disabled={readOnly}
                suffix={cur}
              />
            </div>
          ))}
          {!readOnly && (
            <Button
              variant="link"
              size="sm"
              className="self-start"
              onClick={() =>
                set('options', [
                  ...state.options,
                  { code: '', names: { en: '', fr: '', ar: '' }, price: '0' },
                ])
              }
            >
              <Plus aria-hidden="true" />
              {t('options')}
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

export function PricingSimulator({ state }: { state: EditorState }) {
  const t = useTranslations('admin.pricing.editor');
  const tp = useTranslations('pricing.form');
  const localized = useLocalized();
  const money = useMoney();
  const describe = useErrorMessage();
  const { data: catalog } = useCatalog();
  const [parcel, setParcel] = useState({
    categoryCode: 'CLOTHING',
    weightKg: '2',
    l: '30',
    w: '20',
    h: '15',
    value: '50',
    urgency: 'STANDARD' as 'STANDARD' | 'EXPRESS',
  });
  const [result, setResult] = useState<QuoteCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const optionNames = useMemo(
    () => new Map(state.options.map((o) => [o.code, o.names])),
    [state.options],
  );

  async function run() {
    const rules = stateToRules(state);
    if (!rules.success) {
      setError(rules.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '));
      return;
    }
    setRunning(true);
    setError(null);
    try {
      setResult(
        await api<QuoteCalculation>('/admin/pricing/simulate', {
          body: {
            rules: rules.data,
            parcel: {
              categoryCode: parcel.categoryCode,
              weightGrams: Math.round(toNumber(parcel.weightKg) * 1000),
              lengthCm: Math.round(toNumber(parcel.l)),
              widthCm: Math.round(toNumber(parcel.w)),
              heightCm: Math.round(toNumber(parcel.h)),
              declaredValue: toMinor(parcel.value || '0'),
              urgency: parcel.urgency,
              options: [],
            },
          },
        }),
      );
    } catch (err) {
      setError(describe(err));
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-primary/30 bg-tint/30 p-6">
      <h2 className="font-semibold text-ink">{t('simulator')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('simulatorBody')}</p>
      <div className="mt-5 grid gap-3">
        <Select
          value={parcel.categoryCode}
          onChange={(e) => setParcel({ ...parcel, categoryCode: e.target.value })}
          aria-label={tp('category')}
        >
          {catalog?.categories.map((c) => (
            <option key={c.code} value={c.code}>
              {localized(c.names)}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={tp('weight')}
            value={parcel.weightKg}
            onChange={(v) => setParcel({ ...parcel, weightKg: v })}
            disabled={false}
          />
          <NumberField
            label={tp('declaredValue')}
            value={parcel.value}
            onChange={(v) => setParcel({ ...parcel, value: v })}
            disabled={false}
          />
        </div>
        <div className="grid grid-cols-3 gap-2" dir="ltr">
          {(['l', 'w', 'h'] as const).map((k) => (
            <Input
              key={k}
              inputMode="numeric"
              value={parcel[k]}
              aria-label={k}
              onChange={(e) => setParcel({ ...parcel, [k]: e.target.value })}
            />
          ))}
        </div>
        <Select
          value={parcel.urgency}
          onChange={(e) =>
            setParcel({ ...parcel, urgency: e.target.value as 'STANDARD' | 'EXPRESS' })
          }
          aria-label={tp('urgency')}
        >
          <option value="STANDARD">{tp('urgencyOptions.STANDARD.title')}</option>
          <option value="EXPRESS">{tp('urgencyOptions.EXPRESS.title')}</option>
        </Select>
        <Button onClick={run} disabled={running}>
          {running ? <Spinner /> : <Play aria-hidden="true" />}
          {t('run')}
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {result && (
        <div className="mt-5 rounded-xl bg-surface p-4">
          <p className="font-display text-3xl font-semibold text-ink">
            {money(result.total, result.currency)}
          </p>
          <div className="mt-3">
            <QuoteLines
              lines={result.lines}
              currency={result.currency}
              chargeableGrams={result.chargeableGrams}
              optionNames={optionNames}
              showRounding
            />
          </div>
          <dl className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('commissionLine')}</dt>
              <dd className="text-ink tabular-nums">{money(result.commission, result.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('earningLine')}</dt>
              <dd className="text-ink tabular-nums">
                {money(result.travellerEarning, result.currency)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
