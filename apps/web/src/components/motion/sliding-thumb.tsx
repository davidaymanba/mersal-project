'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Sliding highlight for a segmented control. Drop it as the first child of a `relative` group
 * of buttons; it follows whichever button has aria-selected="true" or aria-pressed="true".
 * Buttons keep their own text colour (`text-surface` when active) and need `relative`.
 */
export function SlidingThumb() {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const thumb = ref.current;
    const group = thumb?.parentElement;
    if (!thumb || !group) return;

    const place = () => {
      const active = group.querySelector<HTMLElement>(
        '[aria-selected="true"], [aria-pressed="true"]',
      );
      if (!active) {
        thumb.style.opacity = '0';
        return;
      }
      thumb.style.opacity = '1';
      thumb.style.width = `${active.offsetWidth}px`;
      thumb.style.height = `${active.offsetHeight}px`;
      thumb.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    };

    place();
    // Only animate moves after the first placement.
    const frame = requestAnimationFrame(() => thumb.setAttribute('data-ready', ''));
    const mutations = new MutationObserver(place);
    mutations.observe(group, {
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-selected', 'aria-pressed'],
    });
    const resize = new ResizeObserver(place);
    resize.observe(group);
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 rounded-md bg-ink opacity-0 shadow-sm data-ready:transition-[transform,width,height,opacity] data-ready:duration-300 data-ready:ease-out-expo"
    />
  );
}
