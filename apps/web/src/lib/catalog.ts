'use client';

import type { Catalog, LocalizedText } from '@mersal/shared';
import { useQuery } from '@tanstack/react-query';
import { useFormatter, useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { api } from './api';

export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: () => api<Catalog>('/catalog'),
    staleTime: 5 * 60_000,
  });
}

/** Picks the current locale's text from a { en, fr, ar } object. */
export function useLocalized() {
  const locale = useLocale() as keyof LocalizedText;
  return useCallback(
    (names: LocalizedText | null | undefined) => (names ? names[locale] || names.en : ''),
    [locale],
  );
}

export function useCountryName() {
  const locale = useLocale();
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);
  return useCallback((code: string) => names.of(code) ?? code, [names]);
}

/** Formats minor units as currency in the current locale. */
export function useMoney() {
  const format = useFormatter();
  return useCallback(
    (minor: number | null | undefined, currency = 'EUR') =>
      minor == null ? '—' : format.number(minor / 100, { style: 'currency', currency }),
    [format],
  );
}

export { categoryIcon, gramsToKgText } from './catalog-format';
