# Component recipes

Paths are relative to `apps/web/src`.

## Page skeletons

**App or admin page** (inside `Shell`, which already provides sidebar, header, page transition):

```tsx
<>
  <PageHeader title={t('title')} description={t('subtitle')} actions={<Button …/>} />
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatCard index={0} icon={Wallet} label={…} value={…} />
  </div>
  <section className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-xs">…</section>
</>
```

Data views follow `if (!data) return <PageSpinner />` → `if (!items.length) return <EmptyState …>`
→ content.

**Public page** (server component):

```tsx
<>
  <SiteHeader />
  <main id="main">
    <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6">
      <PageIntro eyebrow={…} title={…} subtitle={…} />
      …
    </div>
    <section className="border-y border-border bg-sand/60">…data-reveal content…</section>
    <CtaBand title={…} body={…}><Button variant="inverse" size="lg" asChild>…</Button></CtaBand>
  </main>
  <SiteFooter />
</>
```

`SiteHeader` is transparent at the top and frosts once scrolled (`site-header-frame.tsx`), so the
`HeroGlow` from `PageIntro` shows through behind it.

## Selection tiles (radio cards)

From `components/pricing/quote-calculator.tsx`:

```tsx
<label className={cn(
  'relative flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3 text-sm transition-[border-color,background-color,box-shadow,translate] duration-200 ease-out-quart has-focus-visible:ring-4 has-focus-visible:ring-primary/15',
  selected ? 'border-primary bg-tint/60 shadow-sm ring-2 ring-primary/15'
           : 'border-border hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-sm',
)}>
  {selected && <span className="absolute end-2 top-2 flex size-5 animate-check items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
  <input type="radio" className="sr-only" … />
```

## Segmented tabs

Used on shipments, offers, notifications and admin filters:

```tsx
<div role="tablist" className="relative mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1 sm:w-fit">
  <SlidingThumb />
  {tabs.map((key) => (
    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      className={cn('relative flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
        tab === key ? 'text-surface' : 'text-muted-foreground hover:text-ink')}>
```

`SlidingThumb` (`components/motion/sliding-thumb.tsx`) is the `bg-ink` pill that slides under the
selected button. Filter toggles that use `aria-pressed` work the same way.

## Dark emphasis panel

```tsx
<div className="rounded-2xl bg-deep-glow p-6 text-white shadow-md">
  <p className="text-sm text-white/70">{label}</p>
  <p className="mt-2 font-display text-4xl font-semibold tabular-nums">{value}</p>
</div>
```

For a larger marketing panel, add `relative isolate overflow-hidden` and a `RouteArc tone="dark"`
behind the content (`-z-10`). For a big number, use
`<CountUp value={total} format={(v) => money(Math.round(v), currency)} />`. Buttons inside the
panel are `variant="inverse"` (white with deep text) or `variant="outlineInverse"`.

## Timeline / stepper

`ShipmentTimeline` (`components/shipments/shipment-status.tsx`) is a vertical rail with a gradient
line, the newest event pinging, and entries fading up in order. The home hero card
(`components/home/route-preview.tsx`) is the illustrated version, with check-in marks, connectors
growing and a pulsing current step.

## Avatars

`Avatar` in `components/shell/user-menu.tsx` is a gradient tint disc with initials and a
`ring-2 ring-surface` so it can overlap.

## Badges in navigation

The `Shell` nav accepts `badge: <Badge tone="warning">{n}</Badge>`. Keep counts short (`9+`).

## Charts

`components/charts/line-chart.tsx` and `bar-list.tsx` already animate in (stroke draw and bar
grow). Colours come from `SERIES_COLORS` in `components/charts/palette.ts`, the one sanctioned
place for chart hex values. Don't add series colours anywhere else.
