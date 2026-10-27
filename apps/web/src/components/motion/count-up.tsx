'use client';

import { useEffect, useRef, useState } from 'react';

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * Counts from the previous value (0 on mount) to `value`, formatting every frame. The text
 * settles on the exact formatted value; reduced motion shows it straight away.
 */
export function CountUp({
  value,
  format,
  duration = 1200,
  delay = 0,
}: {
  value: number;
  format: (value: number) => string;
  duration?: number;
  delay?: number;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    let frame = 0;
    let begin: number | null = null;
    const tick = (now: number) => {
      begin ??= now + delay;
      const progress = Math.max(0, Math.min(1, (now - begin) / duration));
      const current = start + (value - start) * easeOutExpo(progress);
      from.current = current;
      setShown(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, delay]);

  return <span className="tabular-nums">{format(shown)}</span>;
}
