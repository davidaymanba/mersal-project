'use client';

import type { Catalog } from '@mersal/shared';
import { useMemo } from 'react';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/input';
import { useCountryName, useLocalized } from '@/lib/catalog';

/** Cities that start a served route, and the cities reachable from the chosen origin. */
export function useRoutes(catalog: Catalog | undefined, originCityId: string) {
  return useMemo(() => {
    if (!catalog) return { origins: [], destinations: [], corridor: undefined };
    const originCountries = new Set(catalog.corridors.map((c) => c.originCountry));
    const origins = catalog.cities.filter((c) => originCountries.has(c.countryCode));
    const origin = catalog.cities.find((c) => c.id === originCityId);
    const reachable = new Set(
      catalog.corridors
        .filter((c) => c.originCountry === origin?.countryCode)
        .map((c) => c.destinationCountry),
    );
    const destinations = catalog.cities.filter((c) => reachable.has(c.countryCode));
    return { origins, destinations };
  }, [catalog, originCityId]);
}

export function CitySelect({
  label,
  value,
  onChange,
  cities,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  cities: Catalog['cities'];
  placeholder: string;
  disabled?: boolean;
}) {
  const localized = useLocalized();
  const countryName = useCountryName();
  const byCountry = useMemo(() => {
    const groups = new Map<string, Catalog['cities']>();
    for (const city of cities)
      groups.set(city.countryCode, [...(groups.get(city.countryCode) ?? []), city]);
    return [...groups.entries()];
  }, [cities]);

  return (
    <Field label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {byCountry.map(([country, list]) => (
          <optgroup key={country} label={countryName(country)}>
            {list.map((city) => (
              <option key={city.id} value={city.id}>
                {localized(city.names)}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </Field>
  );
}
