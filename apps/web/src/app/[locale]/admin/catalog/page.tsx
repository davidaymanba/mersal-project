'use client';

import type { LocalizedText } from '@mersal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/auth/form-alert';
import { SlidingThumb } from '@/components/motion/sliding-thumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { PageHeader, Table } from '@/components/ui/page';
import { PageSpinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { gramsToKgText, useCountryName, useLocalized } from '@/lib/catalog';
import { useErrorMessage } from '@/lib/use-error-message';
import { cn } from '@/lib/utils';

interface AdminCatalog {
  corridors: {
    id: string;
    code: string;
    originCountry: string;
    destinationCountry: string;
    currency: string;
    active: boolean;
    pricingVersions: { id: string; version: number }[];
  }[];
  cities: {
    id: string;
    countryCode: string;
    slug: string;
    names: LocalizedText;
    active: boolean;
  }[];
  categories: {
    id: string;
    code: string;
    names: LocalizedText;
    requiresPhotos: boolean;
    maxWeightGrams: number | null;
    active: boolean;
  }[];
  restrictedItems: {
    id: string;
    level: 'PROHIBITED' | 'RESTRICTED';
    names: LocalizedText;
    active: boolean;
  }[];
}

const TABS = ['corridors', 'cities', 'categories', 'restricted'] as const;
const COUNTRIES = ['FR', 'DZ', 'MA', 'TN', 'BE', 'ES', 'IT', 'DE', 'GB', 'CA'];
const emptyNames = (): LocalizedText => ({ en: '', fr: '', ar: '' });

function useCatalogMutation() {
  const queryClient = useQueryClient();
  const describe = useErrorMessage();
  const t = useTranslations('admin.catalog');
  return useMutation({
    mutationFn: ({
      path,
      method,
      body,
    }: {
      path: string;
      method: 'POST' | 'PATCH';
      body: unknown;
    }) => api(path, { method, body }),
    onSuccess: async (_, vars) => {
      toast.success(vars.method === 'POST' ? t('added') : t('updated'));
      await queryClient.invalidateQueries({ queryKey: ['admin', 'catalog'] });
      await queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (e) => toast.error(describe(e)),
  });
}

function NamesInputs({
  value,
  onChange,
}: {
  value: LocalizedText;
  onChange: (v: LocalizedText) => void;
}) {
  const t = useTranslations('admin.catalog');
  return (
    <>
      <Field label={t('nameEn')}>
        <Input value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} />
      </Field>
      <Field label={t('nameFr')}>
        <Input value={value.fr} onChange={(e) => onChange({ ...value, fr: e.target.value })} />
      </Field>
      <Field label={t('nameAr')}>
        <Input
          dir="rtl"
          value={value.ar}
          onChange={(e) => onChange({ ...value, ar: e.target.value })}
        />
      </Field>
    </>
  );
}

function AddForm({
  children,
  onSubmit,
  disabled,
}: {
  children: ReactNode;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const t = useTranslations('admin.catalog');
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
      className="mb-6 grid items-end gap-4 rounded-2xl border border-border bg-surface shadow-xs p-5 sm:grid-cols-2 lg:grid-cols-5"
    >
      {children}
      <Button type="submit" disabled={disabled}>
        <Plus aria-hidden="true" />
        {t('add')}
      </Button>
    </form>
  );
}

function ToggleButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const t = useTranslations('admin.catalog');
  return (
    <Button variant="secondary" size="sm" onClick={onToggle}>
      {active ? t('disable') : t('enable')}
    </Button>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  const t = useTranslations('admin.catalog');
  return (
    <Badge tone={active ? 'success' : 'neutral'}>{active ? t('active') : t('inactive')}</Badge>
  );
}

export default function AdminCatalogPage() {
  const t = useTranslations('admin.catalog');
  const tp = useTranslations('admin.pricing');
  const tpr = useTranslations('pricing');
  const localized = useLocalized();
  const country = useCountryName();
  const mutation = useCatalogMutation();
  const [tab, setTab] = useState<(typeof TABS)[number]>('corridors');
  const catalog = useQuery({
    queryKey: ['admin', 'catalog'],
    queryFn: () => api<AdminCatalog>('/admin/catalog'),
  });

  const [corridor, setCorridor] = useState({
    originCountry: 'FR',
    destinationCountry: 'DZ',
    currency: 'EUR',
  });
  const [city, setCity] = useState({ countryCode: 'DZ', names: emptyNames() });
  const [category, setCategory] = useState({
    code: '',
    names: emptyNames(),
    requiresPhotos: false,
    maxWeightKg: '',
  });
  const [restricted, setRestricted] = useState({
    level: 'PROHIBITED' as 'PROHIBITED' | 'RESTRICTED',
    names: emptyNames(),
  });

  if (!catalog.data) return <PageSpinner />;
  const c = catalog.data;
  const send = (path: string, method: 'POST' | 'PATCH', body: unknown, onDone?: () => void) =>
    mutation.mutate({ path, method, body }, { onSuccess: onDone });
  const namesValid = (n: LocalizedText) => n.en.trim() && n.fr.trim() && n.ar.trim();

  return (
    <>
      <PageHeader title={t('title')} />
      <div
        className="relative mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1 sm:w-fit"
        role="tablist"
      >
        <SlidingThumb />
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === key ? 'text-surface' : 'text-muted-foreground hover:text-ink',
            )}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'corridors' && (
        <>
          <div className="mb-4">
            <FormAlert tone="info">{t('corridorHint')}</FormAlert>
          </div>
          <AddForm
            disabled={mutation.isPending || corridor.originCountry === corridor.destinationCountry}
            onSubmit={() => send('/admin/catalog/corridors', 'POST', corridor)}
          >
            {(['originCountry', 'destinationCountry'] as const).map((key) => (
              <Field key={key} label={key === 'originCountry' ? t('origin') : t('destination')}>
                <Select
                  value={corridor[key]}
                  onChange={(e) => setCorridor({ ...corridor, [key]: e.target.value })}
                >
                  {COUNTRIES.map((code) => (
                    <option key={code} value={code}>
                      {country(code)}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
            <Field label={t('currency')}>
              <Input
                dir="ltr"
                value={corridor.currency}
                maxLength={3}
                onChange={(e) =>
                  setCorridor({ ...corridor, currency: e.target.value.toUpperCase() })
                }
              />
            </Field>
          </AddForm>
          <Table>
            <thead>
              <tr>
                <th>{t('code')}</th>
                <th>{t('origin')}</th>
                <th>{t('destination')}</th>
                <th>{t('tariff')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.corridors.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono text-xs" dir="ltr">
                    {row.code} · {row.currency}
                  </td>
                  <td>{country(row.originCountry)}</td>
                  <td>{country(row.destinationCountry)}</td>
                  <td>
                    {row.pricingVersions[0] ? (
                      <Link
                        href={`/admin/pricing/${row.pricingVersions[0].id}`}
                        className="text-primary hover:underline"
                      >
                        {tp('version', { version: row.pricingVersions[0].version })}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{tp('noTariff')}</span>
                    )}
                  </td>
                  <td className="flex items-center justify-end gap-3">
                    <ActiveBadge active={row.active} />
                    <ToggleButton
                      active={row.active}
                      onToggle={() =>
                        send(`/admin/catalog/corridors/${row.id}`, 'PATCH', { active: !row.active })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {tab === 'cities' && (
        <>
          <AddForm
            disabled={mutation.isPending || !namesValid(city.names)}
            onSubmit={() =>
              send('/admin/catalog/cities', 'POST', city, () =>
                setCity({ ...city, names: emptyNames() }),
              )
            }
          >
            <Field label={t('country')}>
              <Select
                value={city.countryCode}
                onChange={(e) => setCity({ ...city, countryCode: e.target.value })}
              >
                {COUNTRIES.map((code) => (
                  <option key={code} value={code}>
                    {country(code)}
                  </option>
                ))}
              </Select>
            </Field>
            <NamesInputs value={city.names} onChange={(names) => setCity({ ...city, names })} />
          </AddForm>
          <Table>
            <thead>
              <tr>
                <th>{t('nameEn')}</th>
                <th>{t('nameFr')}</th>
                <th>{t('nameAr')}</th>
                <th>{t('country')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.cities.map((row) => (
                <tr key={row.id}>
                  <td className="text-ink">{row.names.en}</td>
                  <td>{row.names.fr}</td>
                  <td dir="rtl" className="text-start">
                    {row.names.ar}
                  </td>
                  <td>{country(row.countryCode)}</td>
                  <td className="flex items-center justify-end gap-3">
                    <ActiveBadge active={row.active} />
                    <ToggleButton
                      active={row.active}
                      onToggle={() =>
                        send(`/admin/catalog/cities/${row.id}`, 'PATCH', { active: !row.active })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {tab === 'categories' && (
        <>
          <AddForm
            disabled={
              mutation.isPending ||
              !namesValid(category.names) ||
              !/^[A-Z_]{2,40}$/.test(category.code)
            }
            onSubmit={() =>
              send(
                '/admin/catalog/categories',
                'POST',
                {
                  code: category.code,
                  names: category.names,
                  requiresPhotos: category.requiresPhotos,
                  maxWeightGrams: category.maxWeightKg
                    ? Math.round(Number(category.maxWeightKg) * 1000)
                    : null,
                },
                () =>
                  setCategory({
                    code: '',
                    names: emptyNames(),
                    requiresPhotos: false,
                    maxWeightKg: '',
                  }),
              )
            }
          >
            <Field label={t('code')}>
              <Input
                dir="ltr"
                value={category.code}
                placeholder="SPORTS_GEAR"
                onChange={(e) => setCategory({ ...category, code: e.target.value.toUpperCase() })}
              />
            </Field>
            <NamesInputs
              value={category.names}
              onChange={(names) => setCategory({ ...category, names })}
            />
            <Field label={t('maxWeight')}>
              <Input
                inputMode="decimal"
                dir="ltr"
                value={category.maxWeightKg}
                onChange={(e) => setCategory({ ...category, maxWeightKg: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand-primary)]"
                checked={category.requiresPhotos}
                onChange={(e) => setCategory({ ...category, requiresPhotos: e.target.checked })}
              />
              {t('requiresPhotos')}
            </label>
          </AddForm>
          <Table>
            <thead>
              <tr>
                <th>{t('code')}</th>
                <th>{t('nameEn')}</th>
                <th>{t('requiresPhotos')}</th>
                <th>{t('maxWeight')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.categories.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono text-xs" dir="ltr">
                    {row.code}
                  </td>
                  <td className="text-ink">{localized(row.names)}</td>
                  <td>{row.requiresPhotos ? '✓' : '—'}</td>
                  <td>{row.maxWeightGrams ? `${gramsToKgText(row.maxWeightGrams)} kg` : '—'}</td>
                  <td className="flex items-center justify-end gap-3">
                    <ActiveBadge active={row.active} />
                    <ToggleButton
                      active={row.active}
                      onToggle={() =>
                        send(`/admin/catalog/categories/${row.id}`, 'PATCH', {
                          active: !row.active,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {tab === 'restricted' && (
        <>
          <AddForm
            disabled={mutation.isPending || !namesValid(restricted.names)}
            onSubmit={() =>
              send('/admin/catalog/restricted-items', 'POST', restricted, () =>
                setRestricted({ ...restricted, names: emptyNames() }),
              )
            }
          >
            <Field label={t('level')}>
              <Select
                value={restricted.level}
                onChange={(e) =>
                  setRestricted({
                    ...restricted,
                    level: e.target.value as 'PROHIBITED' | 'RESTRICTED',
                  })
                }
              >
                <option value="PROHIBITED">{tpr('prohibited')}</option>
                <option value="RESTRICTED">{tpr('restricted')}</option>
              </Select>
            </Field>
            <NamesInputs
              value={restricted.names}
              onChange={(names) => setRestricted({ ...restricted, names })}
            />
          </AddForm>
          <Table>
            <thead>
              <tr>
                <th>{t('level')}</th>
                <th>{t('nameEn')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.restrictedItems.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Badge tone={row.level === 'PROHIBITED' ? 'danger' : 'warning'}>
                      {row.level === 'PROHIBITED' ? tpr('prohibited') : tpr('restricted')}
                    </Badge>
                  </td>
                  <td className="text-ink">{localized(row.names)}</td>
                  <td className="flex items-center justify-end gap-3">
                    <ActiveBadge active={row.active} />
                    <ToggleButton
                      active={row.active}
                      onToggle={() =>
                        send(`/admin/catalog/restricted-items/${row.id}`, 'PATCH', {
                          active: !row.active,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </>
  );
}
