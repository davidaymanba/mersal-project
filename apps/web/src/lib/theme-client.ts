'use client';

import { useSyncExternalStore } from 'react';
import { isTheme, type Theme } from './theme';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

/** The theme in effect: the pinned one on <html data-theme>, else the system preference. */
export function resolvedTheme(): Theme {
  const pinned = document.documentElement.dataset.theme;
  if (isTheme(pinned)) return pinned;
  return darkQuery().matches ? 'dark' : 'light';
}

/** Pins a theme for this visitor; the cookie lets the server render it on the next request. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['data-theme'] });
  const query = darkQuery();
  query.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    query.removeEventListener('change', onChange);
  };
}

/** Live resolved theme for components that can't style themselves with CSS (e.g. toasts). */
export function useResolvedTheme(): Theme {
  return useSyncExternalStore(subscribe, resolvedTheme, () => 'light');
}
