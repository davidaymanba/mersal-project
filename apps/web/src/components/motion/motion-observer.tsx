'use client';

import { useEffect } from 'react';

/**
 * Drives `data-reveal` scroll reveals and the `data-spotlight` / `data-tilt` pointer effects
 * (styles in globals.css). It marks <html data-motion> only once it is watching, so
 * server-rendered content is never hidden without JS, and it does nothing when the visitor
 * prefers reduced motion.
 */
export function MotionObserver() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-revealed', '');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0 },
    );

    const watch = (scope: ParentNode) =>
      scope.querySelectorAll('[data-reveal]:not([data-revealed])').forEach((el) => io.observe(el));

    // Whatever is already on screen at first paint stays put instead of flashing out and back in.
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.setAttribute('data-revealed', '');
      }
    });
    watch(document);
    root.setAttribute('data-motion', '');

    // Client navigations add new sections; pick them up as they mount.
    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches('[data-reveal]')) io.observe(node);
          watch(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // One delegated listener serves every spotlight and tilt element on the page.
    const MAX_TILT = 6;
    let tilted: HTMLElement | null = null;
    const release = () => {
      if (!tilted) return;
      tilted.removeAttribute('data-tilting');
      tilted.style.setProperty('--rx', '0deg');
      tilted.style.setProperty('--ry', '0deg');
      tilted = null;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;

      const spot = event.target.closest<HTMLElement>('[data-spotlight]');
      if (spot) {
        const box = spot.getBoundingClientRect();
        spot.style.setProperty('--mx', `${event.clientX - box.left}px`);
        spot.style.setProperty('--my', `${event.clientY - box.top}px`);
      }

      const tilt = event.target.closest<HTMLElement>('[data-tilt]');
      if (tilt !== tilted) release();
      if (tilt) {
        const box = tilt.getBoundingClientRect();
        const px = (event.clientX - box.left) / box.width - 0.5;
        const py = (event.clientY - box.top) / box.height - 0.5;
        tilt.setAttribute('data-tilting', '');
        tilt.style.setProperty('--ry', `${(px * MAX_TILT * 2).toFixed(2)}deg`);
        tilt.style.setProperty('--rx', `${(-py * MAX_TILT * 2).toFixed(2)}deg`);
        tilted = tilt;
      }
    };
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', release);

    return () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', release);
      release();
      root.removeAttribute('data-motion');
    };
  }, []);

  return null;
}
