export type Theme = 'light' | 'dark';

/** Validates the `theme` cookie. Safe on the server; browser helpers are in theme-client.ts. */
export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}
