'use client';

import { MatchingConfigSchema, type MatchingConfigInput } from '@mersal/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { useErrorMessage } from '@/lib/use-error-message';

const WEIGHT_KEYS = [
  'reliability',
  'dateProximity',
  'capacityFit',
  'rating',
  'responseRate',
  'originMatch',
] as const;
type Form = Record<
  | 'offerTtlMinutes'
  | 'maxAttempts'
  | 'dateToleranceDays'
  | 'minReliability'
  | (typeof WEIGHT_KEYS)[number],
  string
>;

export default function AdminMatchingPage() {
  const t = useTranslations('admin.matching');
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const config = useQuery({
    queryKey: ['admin', 'matching', 'config'],
    queryFn: () => api<MatchingConfigInput>('/admin/matching/config'),
  });
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config.data) return;
    const c = config.data;
    setForm({
      offerTtlMinutes: String(c.offerTtlMinutes),
      maxAttempts: String(c.maxAttempts),
      dateToleranceDays: String(c.dateToleranceDays),
      minReliability: String(c.minReliability),
      ...(Object.fromEntries(WEIGHT_KEYS.map((k) => [k, String(c.weights[k])])) as Record<
        (typeof WEIGHT_KEYS)[number],
        string
      >),
    });
  }, [config.data]);

  if (!form) return <PageSpinner />;

  const num = (v: string) => Number(v.replace(',', '.'));
  const parsed = MatchingConfigSchema.safeParse({
    offerTtlMinutes: num(form.offerTtlMinutes),
    maxAttempts: num(form.maxAttempts),
    dateToleranceDays: num(form.dateToleranceDays),
    minReliability: num(form.minReliability),
    weights: Object.fromEntries(WEIGHT_KEYS.map((k) => [k, num(form[k])])),
  });
  const totalWeight = WEIGHT_KEYS.reduce((sum, k) => sum + (num(form[k]) || 0), 0);

  async function save() {
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api('/admin/matching/config', { method: 'PUT', body: parsed.data });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'matching', 'config'] });
      toast.success(t('saved'));
    } catch (err) {
      setError(describe(err));
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof Form, label: string) => (
    <Field key={key} label={label}>
      <Input
        inputMode="decimal"
        dir="ltr"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner /> : <Save aria-hidden="true" />}
            {t('save')}
          </Button>
        }
      />
      {error && (
        <div className="mb-6">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
          {field('offerTtlMinutes', t('offerTtl'))}
          {field('maxAttempts', t('maxAttempts'))}
          {field('dateToleranceDays', t('tolerance'))}
          {field('minReliability', t('minReliability'))}
        </section>
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">{t('weights')}</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">{t('weightsHint')}</p>
          <div className="flex flex-col gap-4">
            {WEIGHT_KEYS.map((key) => {
              const share = totalWeight ? (num(form[key]) / totalWeight) * 100 : 0;
              return (
                <div key={key} className="grid grid-cols-[1fr_6rem] items-center gap-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-ink">{t(`weight.${key}`)}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {Math.round(share)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                  <Input
                    inputMode="decimal"
                    dir="ltr"
                    aria-label={t(`weight.${key}`)}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
