'use client';

import { SettingsSchema, type PlatformSettings } from '@mersal/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { weekdayDate } from '@/lib/catalog-format';
import { useErrorMessage } from '@/lib/use-error-message';

type Key = keyof PlatformSettings;
/** Message keys can't contain dots (next-intl nesting), so settings map to camelCase labels. */
const labelKey = (key: Key) =>
  key.replace(/\.(\w)/g, (_, c: string) => c.toUpperCase()) as 'walletHoldHours';
const KEYS: Key[] = [
  'wallet.holdHours',
  'disputes.windowHours',
  'payouts.weekday',
  'quotes.ttlMinutes',
  'wallet.demoHoldMinutes',
  'matching.demoOfferTtlMinutes',
];

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings');
  const format = useFormatter();
  const describe = useErrorMessage();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () =>
      api<{ values: PlatformSettings; demoMode: boolean; paymentProvider: string }>(
        '/admin/settings',
      ),
  });
  const [form, setForm] = useState<Record<Key, string> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data)
      setForm(
        Object.fromEntries(KEYS.map((k) => [k, String(settings.data.values[k])])) as Record<
          Key,
          string
        >,
      );
  }, [settings.data]);

  if (!settings.data || !form) return <PageSpinner />;
  const parsed = SettingsSchema.safeParse(
    Object.fromEntries(KEYS.map((k) => [k, Number(form[k])])),
  );
  const weekdayName = (n: number) => format.dateTime(weekdayDate(n), { weekday: 'long' });

  async function save() {
    if (!parsed.success) return;
    setSaving(true);
    try {
      await api('/admin/settings', { method: 'PUT', body: parsed.data });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      toast.success(t('saved'));
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button onClick={save} disabled={!parsed.success || saving}>
            {saving ? <Spinner /> : <Save aria-hidden="true" />}
            {t('save')}
          </Button>
        }
      />
      <div className="mb-6 flex flex-col gap-3">
        {settings.data.demoMode && <FormAlert tone="info">{t('demoMode')}</FormAlert>}
        <p className="text-sm text-muted-foreground">
          {t('provider', {
            provider: settings.data.paymentProvider === 'stripe' ? 'Stripe' : 'Demo',
          })}
        </p>
      </div>
      <section className="grid gap-5 rounded-2xl border border-border bg-surface shadow-xs p-6 sm:grid-cols-2">
        {KEYS.map((key) =>
          key === 'payouts.weekday' ? (
            <Field key={key} label={t(`fields.${labelKey(key)}`)}>
              <Select
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <option key={d} value={d}>
                    {weekdayName(d)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field key={key} label={t(`fields.${labelKey(key)}`)}>
              <Input
                inputMode="numeric"
                dir="ltr"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ),
        )}
      </section>
    </>
  );
}
