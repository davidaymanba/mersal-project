# Motion reference

Everything below lives in `apps/web/src/app/globals.css` (tokens inside `@theme inline`, keyframes
at top level, helpers in `@layer components`) and `apps/web/src/components/motion/motion-observer.tsx`.

## Tokens

| Token              | Utility          | Use                                 |
| ------------------ | ---------------- | ----------------------------------- |
| `--ease-out-expo`  | `ease-out-expo`  | entrances, drawing, sliding         |
| `--ease-out-quart` | `ease-out-quart` | hover, press, state changes         |
| `--ease-spring`    | `ease-spring`    | small overshoot: icon tiles, checks |

| Animation                | Class                                     | Typical use                                                 |
| ------------------------ | ----------------------------------------- | ----------------------------------------------------------- |
| fade-up 0.7s             | `animate-fade-up`                         | load-time entrance of a block                               |
| fade-in 0.5s             | `animate-fade-in`                         | backdrops, tables, empty states                             |
| word-in 0.9s             | `animate-word-in`                         | hero headline, one span per word                            |
| pop-in 0.18s             | `animate-pop-in`                          | dropdowns, menus, alerts                                    |
| sheet-up 0.32s           | `animate-sheet-up`                        | dialog panel                                                |
| slide-in 0.36s           | `animate-slide-in`                        | side drawer (direction from `--slide-from`)                 |
| grow-x 0.9s              | `animate-grow-x`                          | progress fill, bars (`origin-left rtl:origin-right`)        |
| grow-y                   | `animate-[grow-y_0.5s_ease-out_both]`     | vertical connector between steps                            |
| draw 1.8s                | `animate-draw`                            | SVG stroke, needs `pathLength={1}` + `[stroke-dasharray:1]` |
| float 7s ∞               | `animate-float`                           | one floating chip at most per view                          |
| ping-soft 2.2s ∞         | `animate-ping-soft`                       | live dot, current step, parcel marker                       |
| shimmer ∞                | `skeleton` class                          | loading placeholders                                        |
| check-in 0.45s           | `animate-check`                           | check marks, count badges, selection ticks                  |
| route-loop / parcel-land | inline `[animation:…]`                    | `PageSpinner` only                                          |
| route-progress           | inline, with `--route-progress`           | partial route draw in the hero card                         |
| bell-ring                | `animate-[bell-ring_4s_ease-in-out_1s_3]` | notification bell, plays 3 times only                       |

Effects driven by attributes or classes rather than `animate-*`:

| Effect              | How                                                   | Use                                   |
| ------------------- | ----------------------------------------------------- | ------------------------------------- |
| Theme switch reveal | `ThemeToggle` (View Transitions + `clip-path` circle) | only the toggle                       |
| Spotlight           | `data-spotlight` on a `relative` element              | clickable cards, list rows, KPI tiles |
| Tilt                | `data-tilt`                                           | one hero object per page              |
| Shine               | `shine`, plus `shine-once` (with `--shine-delay`)     | the page's main CTA                   |
| Count up            | `<CountUp value format duration? delay?>`             | money and counts that load in         |
| Sliding tab         | `<SlidingThumb />` inside the tab group               | segmented controls                    |
| Scroll progress     | `.scroll-progress` (scroll-driven, `@supports`)       | already in the public header          |
| Logo redraw         | `group/logo` on the link around `<Logo>`              | header and sidebar logo links         |
| Page fade           | `app/[locale]/template.tsx`                           | automatic                             |

## Recipes

**Staggered load entrance**

```tsx
{items.map((item, i) => (
  <li key={item.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
```

Cap the index so long lists don't take seconds to appear.

**Scroll reveal of a section**

```tsx
<h2 data-reveal>…</h2>
<div data-reveal="group" className="grid gap-5 md:grid-cols-3">
  {cards.map((c, i) => (
    <article key={c.key} className="reveal-item …" style={{ '--i': i } as CSSProperties}>
```

**Line that draws when its section reveals**

```tsx
<div data-reveal="group" className="relative">
  <div className="absolute inset-x-[16%] top-10 h-0 border-t-2 border-dashed border-primary/30">
    <div className="reveal-grow absolute inset-x-0 -top-0.5 h-0.5 origin-left bg-primary rtl:origin-right" />
  </div>
```

**Re-animating on new data.** Put `key={data.id}` on the wrapper so its `animate-*` replays
(see the price panel in `quote-calculator.tsx`).

**Page transitions in the app shell.** `Shell` runs a WAAPI fade/translate on `<main>` when the
pathname changes. Don't add another page-level animation inside app pages.

**Dropdown.** Use `absolute end-0 mt-2 origin-top-right animate-pop-in rounded-xl border border-border
bg-surface shadow-lg rtl:origin-top-left`.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` sets all animation and transition durations to ~0 and
delays to 0. So:

- `both` fill-mode animations jump to their end state, which is fine.
- Infinite loops stop after one instant iteration, so their final keyframe must be a good resting
  state. If it isn't, add `motion-reduce:animate-none`.
- `.motion-only` is hidden. Use it for SMIL (`<animateMotion>`), which CSS can't slow down. Then
  render a static twin with `hidden motion-reduce:block`.
- `MotionObserver` does nothing, so `data-reveal` content is simply visible.

## Pitfalls seen in this codebase

- `CountUp` renders one text node that settles on the exact formatted value. Tests that look for
  the final text (`getByText('€44.00')`) still pass because Playwright retries. Don't add a
  second, screen-reader-only copy, because that makes such locators match twice.
- A finished animation with `both` fill keeps overriding its property. For effects that hover
  must take over later (the shine), use `backwards`.
- `template.tsx` and other page-level wrappers must animate opacity only, with no lasting fill.
  A transform or a stacking context there breaks `fixed` drawers and the `-z-10` hero glow.

- Playwright full-page screenshots don't scroll, so `data-reveal` content below the fold looks
  blank. Scroll first (the review script does this), or use viewport screenshots.
- `transform` utilities in Tailwind 4 use the individual `translate`/`scale`/`rotate` properties.
  The keyframes animate those same properties, so a keyframe and a hover utility on the same
  element fight each other. Put hover motion on a parent or child.
- SVG `transform-origin` needs `[transform-box:fill-box] origin-center` to scale around a circle.
- A `-z-10` decoration needs an `isolate` (or positioned with z-index) parent, or it slips behind
  the page background.
