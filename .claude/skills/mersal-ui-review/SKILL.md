---
name: mersal-ui-review
description: Visual QA for the Mersal web app. It takes real screenshots of pages in English and Arabic, on desktop and mobile, signed out or as the demo sender, traveller or admin, and reviews them against the design system. Use it after any UI change before calling it done, when asked to "check how it looks", "take screenshots" or "review the design", or before a client demo.
---

# Mersal UI review

Type checks and tests don't show whether a page looks right. This skill does. It pairs with
`mersal-frontend-design`, which defines what "right" means.

## 1. Make sure the stack is up

```bash
lsof -iTCP:3000 -iTCP:4000 -sTCP:LISTEN -P   # web on 3000, API on 4000
```

If they aren't running, ask the user before starting them. `pnpm infra:up` and `pnpm dev` are
long-running, and the user usually has them open in their own terminal. Never run `pnpm demo:reset`
or `db:reset` without explicit consent, because they wipe the local database. Demo accounts come
from `pnpm demo:seed`.

## 2. Capture

Run from the repo root. Screenshots go to `.ui-review/`, which is git-ignored. If it isn't, write
to the session scratchpad with `--out=`.

```bash
S=.claude/skills/mersal-ui-review/scripts/shoot.mjs
# Public pages, both scripts, both sizes
node $S --locales=en,ar --viewports=desktop,mobile / /pricing /how-it-works /login
# Signed-in areas
node $S --as=sender /app /app/shipments /app/shipments/:first /app/messages
node $S --as=traveller --locales=en,ar /app/offers /app/wallet /app/trips
node $S --as=admin /admin /admin/shipments /admin/pricing
# Above-the-fold only (no scrolling), e.g. to judge the hero exactly as it loads
node $S --hero /
# Partner theme (white-label) check
node $S --theme=wassla / /app
# Dark mode (the browser reports a dark colour scheme; nothing is pinned)
node $S --scheme=dark --locales=en,ar / /pricing /login
node $S --scheme=dark --as=admin /admin
```

Then open each PNG with the Read tool and look at it. Read only the files that matter for the change.
Full-page images of long pages get downscaled, so take a `--hero` viewport shot for details.

## 3. Review checklist

Go through these for each screenshot and note what you find:

1. **Hierarchy.** Is one thing clearly the most important on screen? Do the headings, numbers and
   CTAs read in the right order?
2. **Consistency.** Do cards, radii, shadows and spacing match neighbouring pages (see the design
   skill's surfaces and elevation)? Are there any raw colours or stray greys?
3. **RTL (ar).** Is the layout mirrored? Do arrows point the right way? Are references, codes,
   emails and money still readable LTR? Is any text clipped by Arabic glyph height?
4. **Mobile (390 px).** Is there horizontal overflow? Are tap targets at least 40 px? Does the nav
   collapse into the menu? Do floating decorations hide where they would collide?
5. **States.** Are the empty, loading and error variants there and styled? Is anything blank
   because a `data-reveal` block didn't play? If so, scroll first or check `MotionObserver`.
6. **Theme.** With `--theme=wassla`, is every surface recoloured? Anything still teal means a
   hard-coded colour.
7. **Dark mode.** With `--scheme=dark`, is anything still white or blank? Is any text invisible
   (light on light)? Are card edges still visible? Do deep panels still stand out from the page?
8. **Honesty.** Are there invented numbers, testimonials or logos? Remove them.

Motion can't be judged from a PNG. When motion matters, describe what should happen and, if needed,
take two `--hero` shots after editing the wait time in the script, or record a Playwright video
(`recordVideo` in `browser.newContext`).

## 4. Report

Tell the user what you checked (pages × locales × viewports), what you fixed, and what still looks
off with the file path that causes it. Don't paste every screenshot. Mention only the ones that
show a problem or the key before/after.

## Known quirks

- Next's dev overlay shows an "N" bubble in the bottom-left corner. Ignore it.
- Full-page captures render the sticky sidebar only in the first viewport. That's expected.
- Elements that are `hidden` with an `sm:`/`lg:` `block` and that animate in can be missing from
  full-page captures. Confirm with `--hero` before calling it a bug.
