// Screenshots Mersal pages for visual review.
// Usage (from the repo root, with `pnpm dev` running):
//   node .claude/skills/mersal-ui-review/scripts/shoot.mjs [options] <route> [<route> ...]
// Options:
//   --as=guest|sender|traveller|admin   who is signed in (default guest)
//   --locales=en,ar                     locales to capture (default en)
//   --viewports=desktop,mobile          desktop 1440x900, mobile 390x844 (default desktop)
//   --out=<dir>                         output folder (default ./.ui-review)
//   --theme=wassla                      also set the partner theme cookie
//   --scheme=dark|light                 colour scheme the browser reports (default light)
//   --hero                              viewport-only shot (no scroll), for above-the-fold checks
// Routes are paths without the locale, e.g. / /pricing /app /app/shipments/:first /admin.
// ":first" is replaced by the first matching link found on the parent list page.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../../apps/web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const ACCOUNTS = {
  sender: ['nadia@demo.mersal.local', 'Demo2026!'],
  traveller: ['yacine@demo.mersal.local', 'Demo2026!'],
  admin: ['admin@mersal.local', 'Mersal!2026'],
};
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const opts = {
  as: 'guest',
  locales: 'en',
  viewports: 'desktop',
  out: '.ui-review',
  theme: '',
  scheme: 'light',
};
const routes = [];
let hero = false;
for (const arg of process.argv.slice(2)) {
  if (arg === '--hero') hero = true;
  else if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    opts[key] = value;
  } else routes.push(arg);
}
if (!routes.length) routes.push('/');
mkdirSync(opts.out, { recursive: true });

const browser = await chromium.launch();
const written = [];
try {
  for (const vpName of opts.viewports.split(',')) {
    const context = await browser.newContext({
      viewport: VIEWPORTS[vpName],
      colorScheme: opts.scheme,
      extraHTTPHeaders: { 'x-e2e-key': process.env.E2E_BYPASS_KEY ?? 'local-e2e' },
    });
    if (opts.theme) {
      await context.addCookies([{ name: 'brand', value: opts.theme, url: BASE }]);
    }
    const page = await context.newPage();

    if (opts.as !== 'guest') {
      const [email, password] = ACCOUNTS[opts.as];
      await page.goto(`${BASE}/en/login`);
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Log in' }).click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
    }

    for (const locale of opts.locales.split(',')) {
      for (const route of routes) {
        let path = route;
        if (path.includes(':first')) {
          const parent = path.split('/:first')[0];
          await page.goto(`${BASE}/${locale}${parent}`, { waitUntil: 'networkidle' });
          const href = await page
            .locator(`main a[href*="${parent}/"]:not([href$="/new"])`)
            .first()
            .getAttribute('href', { timeout: 10_000 })
            .catch(() => null);
          if (!href) {
            console.warn(`skip ${route}: no item link on ${parent}`);
            continue;
          }
          path = href.replace(/^\/(en|fr|ar)/, '');
        }

        await page.goto(`${BASE}/${locale}${path === '/' ? '' : path}`, {
          waitUntil: 'networkidle',
        });
        await page.waitForTimeout(2500); // let load animations finish
        if (!hero) {
          // Scroll through so data-reveal sections play, then come back to the top.
          const height = await page.evaluate(() => document.body.scrollHeight);
          for (let y = 0; y < height; y += 500) {
            await page.mouse.wheel(0, 500);
            await page.waitForTimeout(120);
          }
          await page.waitForTimeout(1500);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(300);
        }

        const slug = route.replace(/[/:]+/g, '-').replace(/^-|-$/g, '') || 'home';
        const tags = [opts.theme, opts.scheme === 'dark' ? 'dark' : ''].filter(Boolean);
        const file = `${opts.out}/${[slug, locale, vpName, ...tags].join('.')}.png`;
        await page.screenshot({ path: file, fullPage: !hero });
        written.push(file);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(written.join('\n'));
