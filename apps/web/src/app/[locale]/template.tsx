import type { ReactNode } from 'react';

/**
 * Remounts on every top-level navigation, so each new page fades in. Opacity only and no
 * fill afterwards: a lingering transform or stacking context would break fixed and
 * negative-z children (drawers, hero glow).
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="[animation:fade-in_0.35s_ease_backwards]">{children}</div>;
}
