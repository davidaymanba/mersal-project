export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface ApiIssue {
  path: string;
  code: string;
  message: string;
}

/** Error returned by the API: `code` is a stable key the UI translates (errors.<code>). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
  }
}

// These endpoints manage the session themselves and must not trigger a refresh.
const SESSION_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

/**
 * Calls the Mersal API with the session cookies. On 401 it refreshes the session once
 * (concurrent requests share the same refresh) and retries.
 */
export async function api<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const hasJson = options.body !== undefined;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (hasJson || options.form ? 'POST' : 'GET'),
      credentials: 'include',
      headers: hasJson ? { 'content-type': 'application/json' } : undefined,
      body: options.form ?? (hasJson ? JSON.stringify(options.body) : undefined),
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'network', 'Network error');
  }

  if (
    res.status === 401 &&
    retry &&
    !SESSION_ENDPOINTS.includes(path) &&
    (await refreshSession())
  ) {
    return api<T>(path, options, false);
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      issues?: ApiIssue[];
    };
    throw new ApiError(
      res.status,
      data.code ?? 'generic',
      data.message ?? res.statusText,
      data.issues,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Absolute URL for an API-relative file path such as `/files?key=…`. */
export const apiUrl = (path: string) => `${API_URL}${path}`;
