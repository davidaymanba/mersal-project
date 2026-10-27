// Deep-merges a translation fragment into apps/web/messages/<locale>.json and checks that
// every locale ends up with exactly the same keys.
// Usage: node scripts/merge-messages.mjs <locale> <fragment.json> [...<locale> <fragment.json>]
import { readFileSync, writeFileSync } from 'node:fs';

const LOCALES = ['en', 'fr', 'ar'];
const path = (locale) => `apps/web/messages/${locale}.json`;

function merge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = merge(target[key] && typeof target[key] === 'object' ? target[key] : {}, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const [locale, fragment] = [args[i], args[i + 1]];
  const messages = JSON.parse(readFileSync(path(locale), 'utf8'));
  merge(messages, JSON.parse(readFileSync(fragment, 'utf8')));
  writeFileSync(path(locale), `${JSON.stringify(messages, null, 2)}\n`);
}

const reference = new Set(keys(JSON.parse(readFileSync(path('en'), 'utf8'))));
let ok = true;

// next-intl uses "." for nesting, so a dot inside a key breaks message loading.
const dotted = (obj) =>
  Object.entries(obj).flatMap(([k, v]) => [
    ...(k.includes('.') ? [k] : []),
    ...(v && typeof v === 'object' && !Array.isArray(v) ? dotted(v) : []),
  ]);
for (const locale of LOCALES) {
  const bad = dotted(JSON.parse(readFileSync(path(locale), 'utf8')));
  if (bad.length) {
    ok = false;
    console.error(`${locale}: keys must not contain "." → ${bad.join(', ')}`);
  }
}
for (const locale of LOCALES.slice(1)) {
  const own = new Set(keys(JSON.parse(readFileSync(path(locale), 'utf8'))));
  const missing = [...reference].filter((k) => !own.has(k));
  const extra = [...own].filter((k) => !reference.has(k));
  if (missing.length || extra.length) {
    ok = false;
    console.error(
      `${locale}: missing ${missing.join(', ') || '-'} | extra ${extra.join(', ') || '-'}`,
    );
  }
}
console.log(ok ? `messages in sync (${reference.size} keys)` : 'messages out of sync');
process.exit(ok ? 0 : 1);
