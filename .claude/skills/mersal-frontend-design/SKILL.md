---
name: mersal-frontend-design
description: Mersal's design system and motion rules for apps/web. Use for any change to the web UI, including a new page, a component, a restyle, "make it look better", adding animation, a landing or marketing section, a dashboard card, an empty or loading state, or RTL fixes. Use it even for small tweaks to className strings, so new work matches the existing tokens, elevation, motion and RTL conventions instead of drifting.
---

# Mersal frontend design

Mersal (مرسال) is a peer-to-peer parcel marketplace between France and North Africa. The UI must
feel calm, trustworthy and precise, because people hand a stranger their parcel and money. Every
screen is shown to a prospective client (WASS'LA) in a live demo, in English, French and Arabic,
in light and dark mode, and can be re-skinned to the partner's colours with one click. Design for
all of these at once.

Stack: Next.js 16 App Router, Tailwind CSS 4 (CSS-first config in `apps/web/src/app/globals.css`),
next-intl, lucide-react, class-variance-authority. No animation library: motion is CSS keyframes,
transitions, a tiny IntersectionObserver, and SMIL for one SVG path.

## The rules that matter most

1. **Tokens only, never raw colours.** Use `text-ink`, `bg-primary`, `bg-tint`, `text-accent`,
   `bg-sand`, `border-border`, `text-muted-foreground` and the semantic `success|warning|danger|info`
   (+ `-tint`). Inside arbitrary values use `var(--brand-*)` and `color-mix(in oklab, …)`. A hex code in
   a component breaks the WASS'LA theme (`[data-brand='wassla']` in `packages/brand/src/tokens.css`).
   Brand colours are fixed. Do not add or change palette values unless the user asks.
1. **Every surface must work in light and dark.** Tokens are `light-dark(light, dark)` pairs and
   `<html>` follows the system unless `data-theme` pins it (see "Dark mode" below). So:
   `text-ink` is the text colour and flips to light in dark mode. Never use it as a dark
   background. Dark emphasis panels use `bg-deep` / `bg-deep-glow`, which stay dark in both themes,
   and only there may you use `text-white` / `bg-white`. Text on a solid `bg-ink`, `bg-success` or
   `bg-danger` fill is `text-surface`. Mix with `var(--surface)`, never `white`.
1. **Logical properties for everything directional.** Use `ms-/me-/ps-/pe-/start-/end-/text-start`,
   never `ml-/mr-/left-/right-/text-left`. Arrows get `rtl:rotate-180`. `origin-left` needs
   `rtl:origin-right`. SVG illustrations that have a direction get `rtl:-scale-x-100`. Keep any text
   out of flipped SVGs and put it in HTML next to the SVG.
1. **All copy goes through next-intl, in all three locales.** Add keys with
   `node scripts/merge-messages.mjs en a.json fr b.json ar c.json` from the repo root (it deep-merges
   and fails if the locales drift). Arabic copy is Modern Standard Arabic. Keep French typographic
   apostrophes (’).
1. **Honest content.** Illustrations may show the sample parcel that is already in
   `home.preview`, or abstract bars and placeholders. Never invent metrics, user counts,
   testimonials, partner logos or press quotes. Demo data is sample data.
1. **Motion explains or confirms.** Use one orchestrated moment per page at most (the home hero is
   the reference). Other motion should answer a user action or show that something changed. Every
   animation must still work under `prefers-reduced-motion` (see below).
1. **Verify visually** with the `mersal-ui-review` skill before saying a UI change is done. Check
   desktop, mobile, Arabic, and the WASS'LA theme when you touch colour.

## Visual language

- **Signature motif: the route arc.** The logo is a lowercase m drawn as a route to a destination
  dot. The dotted arc between two points (origin dot in primary or white, destination dot in accent)
  is the brand's one decorative device. Use `<RouteArc>` for it and don't invent other ornaments.
  It appears on the home hero card, the auth panel, the closing CTA band and the empty price panel.
  Don't add it to every card.
- **Surfaces.** The page background is `bg-background`. App areas sit on `bg-muted/40`. Cards are
  `rounded-2xl border border-border bg-surface shadow-xs`. Feature or marketing cards use
  `rounded-3xl`. A dark emphasis panel is `bg-deep-glow text-white shadow-md`, at most one per
  view. Warm sections use `bg-sand/60` with `border-y border-border`. Overlay backdrops use
  `bg-deep/60`.
- **Elevation** (tinted with the brand ink in light mode and black in dark mode, so themes match): `shadow-xs` resting card ·
  `shadow-sm` raised control or selected tile · `shadow-md` hover, popover or floating chip ·
  `shadow-lg` dialog, hero card or dropdown · `shadow-glow` under primary-filled icons and buttons.
  Never use `shadow-xl/2xl` or raw `rgba(0,0,0,…)`.
- **Radius hierarchy.** Controls use `rounded-lg`, tiles and list rows use `rounded-xl` or `rounded-2xl`,
  cards use `rounded-2xl`, hero and marketing panels use `rounded-3xl`, and pills and badges use
  `rounded-full`. Don't put one radius on everything.
- **Type.** Readex Pro (`font-display`, automatic on h1–h4) for headings and big numbers. IBM Plex
  Sans / Plex Sans Arabic for body. Page titles `text-2xl sm:text-[2rem]`. Marketing h1 up to
  `lg:text-[4.25rem] leading-[1.05]`. Use `tabular-nums` for money and counts. Use sentence case
  everywhere. Don't use `uppercase` or tracked-out labels. Arabic resets letter-spacing
  automatically.
- **Icon tiles.** For an icon that leads a block, use `flex size-10 items-center justify-center
rounded-xl bg-tint text-primary`. The strong version is `bg-primary text-primary-foreground
shadow-glow`. Terracotta (`text-accent`, `bg-accent/10`) is for icons and illustration only. For
  text in that hue use `text-accent-strong`.
- **Eyebrow pill.** Public page intros use the pill in `PageIntro`. Don't add eyebrows above
  every section heading.

## Component inventory (reuse before building)

| Need                        | Use                                                 | Notes                                                                                                                                              |
| --------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button / link button        | `Button` (`components/ui/button.tsx`)               | variants `primary secondary ghost inverse outlineInverse danger link`. Use `asChild` with `Link`. A trailing `ArrowRight` nudges forward on hover. |
| Plain link with arrow nudge | add `group/link` to the `Link`                      | e.g. "See the full journey"                                                                                                                        |
| Status pill                 | `Badge tone=… live`                                 | `live` adds a pulsing dot. `ShipmentStatusBadge` already sets it for MATCHING, PICKED_UP and IN_TRANSIT.                                           |
| Page title row              | `PageHeader`                                        | already animates in                                                                                                                                |
| KPI tile                    | `StatCard icon={Icon} index={i}`                    | `index` staggers a row                                                                                                                             |
| Empty list                  | `EmptyState title icon={Icon}`                      | put an action button in the children                                                                                                               |
| Loading a page/section      | `PageSpinner` (logo route draws itself), `Skeleton` | prefer `Skeleton` for list rows                                                                                                                    |
| Table                       | `Table`                                             | rows highlight on hover                                                                                                                            |
| Modal                       | `Dialog`                                            | backdrop fades, sheet rises                                                                                                                        |
| Card                        | `Card` or the class string above                    |                                                                                                                                                    |
| Public page intro           | `PageIntro`                                         | includes `HeroGlow` behind the header                                                                                                              |
| Closing CTA                 | `CtaBand`                                           | dark, glow, arc drawn on reveal                                                                                                                    |
| Brand arc                   | `RouteArc id tone trigger delay`                    | unique `id` per page. Use `trigger="reveal"` below the fold.                                                                                       |
| Hero background             | `HeroGlow tall?`                                    | render outside positioned containers                                                                                                               |
| Form error/success          | `FormAlert tone`                                    | pops in                                                                                                                                            |
| Field + label + error       | `Field` wrapping `Input/Select/Textarea`            | wires id and aria                                                                                                                                  |
| Light/dark switch           | `ThemeToggle`                                       | already in the public header, app header and auth top bar. Circle reveal via View Transitions.                                                     |
| Segmented tabs              | `SlidingThumb` as first child of the tab group      | buttons `relative`, active one `text-surface`. It follows `aria-selected` / `aria-pressed`.                                                        |
| Animated number             | `CountUp value format`                              | KPIs, balances, price totals. Format the rounded value: `(v) => money(Math.round(v), cur)`.                                                        |

More detail and copy-paste recipes are in `references/components.md`.

## Motion system

All of it is defined in `globals.css`. Read `references/motion.md` before adding motion.

- Easing: `ease-out-expo` for entrances, `ease-out-quart` for UI state, `ease-spring` for small
  playful pops such as icon tiles and checkmarks. Durations: 150–250 ms for state changes,
  300–450 ms for overlays, 600–900 ms for entrances.
- On-load entrances: `animate-fade-up`, `animate-fade-in`, `animate-word-in` (hero headline
  words). Stagger with inline `style={{ animationDelay: '…' }}`.
- Overlays: `animate-pop-in` (menus, with `origin-top-right rtl:origin-top-left`),
  `animate-sheet-up` (dialogs), `animate-slide-in` (drawers, RTL-aware via `--slide-from`).
- Feedback: `animate-check` (a check or badge appearing), `animate-ping-soft` (live dot or current
  step), `animate-grow-x` (progress or bars, with `origin-left rtl:origin-right`), `animate-draw`
  (SVG path with `pathLength={1}` and `[stroke-dasharray:1]`).
- Scroll reveal: add `data-reveal` to a block, or `data-reveal="group"` on a container and
  `reveal-item` on its children with `style={{ '--i': n } as CSSProperties}`. `reveal-draw`,
  `reveal-grow` and `reveal-pop` animate SVG strokes, lines and dots when their container reveals.
  Nothing is hidden until `MotionObserver` (mounted in `Providers`) runs. Content already on screen
  at load is never hidden.
- Don't put `data-reveal` on above-the-fold content. Use the `animate-*` load classes there.
- Pointer effects (mouse only, off under reduced motion), wired by `MotionObserver` with one
  delegated listener: `data-spotlight` on a clickable card or row adds a soft light that follows
  the cursor (the element needs `relative`). `data-tilt` leans the hero card toward the cursor.
  Use tilt for one hero object per page at most.
- `shine` adds a light sweep on hover to the page's main CTA. `shine-once` also plays it once
  after the hero sequence. Use it on one button per page.
- Navigation: `[locale]/template.tsx` fades each new page in, and `Shell` settles `<main>` on app
  route changes. Don't add page-level entrances on top.
- Hover lift is only for things you can click: `transition-[box-shadow,translate] duration-300
ease-out-quart hover:-translate-y-0.5 hover:shadow-md`.
- Reduced motion: the global media query makes every animation and transition instant.
  Infinite animations must look right in their **final** frame, or add `motion-reduce:animate-none`.
  SMIL ignores CSS, so wrap it in `.motion-only` and give it a static twin with
  `hidden motion-reduce:block`. `route-preview.tsx` shows how.

## Quality floor (check before you finish)

- Works at 390 px wide with no horizontal scroll. Touch targets are at least 40 px.
- Arabic: layout mirrors, arrows flip, numbers and references stay LTR (`dir="ltr"` on codes and
  emails), and names use `<bdi>`.
- Keyboard: visible focus everywhere. Custom radios and checkboxes keep a real input with
  `sr-only` and show focus with `has-focus-visible:ring-4 has-focus-visible:ring-primary/15`.
- Contrast: body text uses `text-ink` or `text-muted-foreground` on surface or tint. On deep
  panels, use `text-white` and `text-white/70`, never lower than `/60` for real text.
- Dark mode: screenshot the change with `--scheme=dark`. Look for anything that stayed white,
  went invisible (light text on a light fill) or lost its edge (add `border-border`).
- Empty, loading and error states exist for every data view.
- `pnpm --filter @mersal/web typecheck` and `pnpm --filter @mersal/web lint` pass. Run
  `npx prettier --write` on the files you touched.

## Dark mode

- Tokens live in `packages/brand/src/tokens.css` as `light-dark()` pairs, per brand. To add a
  token, give it both values there and expose it in the `@theme inline` block of `globals.css`.
- The theme is resolved in this order: the `theme` cookie, rendered as `<html data-theme>` by
  `app/[locale]/layout.tsx`, then the system preference. `lib/theme.ts` is server-safe.
  `lib/theme-client.ts` has `applyTheme`, `resolvedTheme` and `useResolvedTheme`. Use the hook
  only for things CSS can't reach, such as the sonner `Toaster`.
- The `dark:` variant exists (pinned dark or system dark) for the rare tweak that tokens can't
  express, such as swapping the toggle's sun and moon icons. Prefer tokens over `dark:` classes.

## Things that read as generic and should be avoided here

A stack of identical cards with the same shadow and no hierarchy. Gradient text. Glassmorphism
everywhere. An emoji used as an icon. All-caps micro labels. Fake stats bands ("10k+ parcels").
Random blobs that aren't the brand glow. Fade-up on every section of an app page. Bouncing CTAs.
Parallax. Confetti. When in doubt, remove one decoration.
