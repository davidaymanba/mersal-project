import type { Catalog, PlatformPolicies } from '@mersal/shared';
import { API_URL } from './api';

/** Server-side base URL: inside a container network the API is not reached through the public URL. */
const SERVER_API_URL = process.env.API_INTERNAL_URL ?? API_URL;

export const DEFAULT_POLICIES: PlatformPolicies = {
  holdHours: 48,
  disputeWindowHours: 48,
  payoutWeekday: 1,
};

/** Public catalog for server-rendered pages, refreshed every minute. Null when the API is unreachable. */
export async function getCatalog(): Promise<Catalog | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/catalog`, { next: { revalidate: 60 } });
    return res.ok ? ((await res.json()) as Catalog) : null;
  } catch {
    return null;
  }
}

export async function getPolicies(): Promise<PlatformPolicies> {
  return (await getCatalog())?.policies ?? DEFAULT_POLICIES;
}
