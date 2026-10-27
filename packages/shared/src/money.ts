/** Money is always an integer amount of the currency's minor unit (e.g. cents). */
export interface Money {
  amount: number;
  currency: string;
}

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'XOF', 'XAF']);

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
}

export function toMinor(major: number, currency: string): number {
  return Math.round(major * minorUnitFactor(currency));
}

export function toMajor(minor: number, currency: string): number {
  return minor / minorUnitFactor(currency);
}

export function formatMoney(minor: number, currency: string, locale = 'en'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    toMajor(minor, currency),
  );
}

export function gramsToKg(grams: number): number {
  return Math.round(grams / 10) / 100;
}
