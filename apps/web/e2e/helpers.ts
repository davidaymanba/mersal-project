import { execSync } from 'node:child_process';
import { expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { deflateSync } from 'node:zlib';

export const ADMIN = { email: 'admin@mersal.local', password: 'Mersal!2026' };

/** Reads the one-time code shown in demo mode ("… your code is 123456"). */
export async function readDemoCode(page: Page): Promise<string> {
  const alert = page.getByText(/\b\d{6}\b/).last();
  await expect(alert).toBeVisible();
  const match = /\b(\d{6})\b/.exec((await alert.textContent()) ?? '');
  if (!match) throw new Error('Demo code not found');
  return match[1]!;
}

const API = process.env.E2E_API_URL ?? 'http://localhost:4000/api';

/** Creates a user with a confirmed email through the API; the page's context is then signed in. */
export async function createVerifiedUser(
  page: Page,
  overrides: { firstName?: string; lastName?: string } = {},
) {
  const email = `e2e.${Date.now()}.${Math.floor(Math.random() * 1000)}@example.com`;
  const password = 'Travel2026!';
  const register = await page.request.post(`${API}/auth/register`, {
    data: {
      email,
      password,
      firstName: overrides.firstName ?? 'Nadia',
      lastName: overrides.lastName ?? 'Saidi',
      locale: 'en',
      acceptTerms: true,
    },
  });
  expect(register.ok()).toBeTruthy();
  const { devCode } = (await register.json()) as { devCode: string };
  const verify = await page.request.post(`${API}/auth/email/verify`, { data: { code: devCode } });
  expect(verify.ok()).toBeTruthy();
  return { email, password };
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/en/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** A tiny valid PNG, enough for upload flows. */
export function pngFile(name: string): { name: string; mimeType: string; buffer: Buffer } {
  const crc = (buf: Buffer) => {
    let c = ~0;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (~c >>> 0) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(4, 0);
  header.writeUInt32BE(4, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const raw = Buffer.alloc(4 * (1 + 4 * 3), 0x80);
  for (let row = 0; row < 4; row++) raw[row * 13] = 0;
  const buffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return { name, mimeType: 'image/png', buffer };
}

/** Runs SQL against the local dev database (test setup only). */
export function sql(query: string): string {
  return execSync(
    `docker exec mersal-postgres-1 psql -U mersal -d mersal -tAc ${JSON.stringify(query)}`,
  )
    .toString()
    .trim();
}

/**
 * Test isolation for a destination city: earlier runs leave open trips (published or already
 * under way) and parcels still waiting for a traveller, which the matching engine would (correctly) pick up.
 */
export function retireRoute(destinationSlug: string) {
  const city = `(select id from "City" where slug = '${destinationSlug}')`;
  sql(
    `update "MatchOffer" set status = 'CANCELLED' where status = 'PENDING' and "shipmentId" in (select id from "Shipment" where "destinationCityId" = ${city})`,
  );
  sql(
    `update "Shipment" set status = 'CANCELLED' where status in ('PAID', 'MATCHING', 'NO_MATCH') and "destinationCityId" = ${city}`,
  );
  sql(
    `update "Trip" set status = 'CANCELLED' where status = 'PUBLISHED' and "destinationCityId" = ${city}`,
  );
  sql(
    `update "Trip" set status = 'COMPLETED' where status = 'IN_PROGRESS' and "destinationCityId" = ${city}`,
  );
}

/** Registers a traveller and takes them through email, phone and identity verification via the API. */
export async function createApprovedTraveller(
  page: Page,
  admin: APIRequestContext,
  firstName = 'Yanis',
) {
  const user = await createVerifiedUser(page, { firstName, lastName: 'Belkacem' });
  const phone = `+3367${String(Date.now()).slice(-7)}`;
  const sent = await page.request.post(`${API}/auth/phone/send`, { data: { phone } });
  const { devCode } = (await sent.json()) as { devCode: string };
  expect(
    (await page.request.post(`${API}/auth/phone/verify`, { data: { code: devCode } })).ok(),
  ).toBeTruthy();
  const image = pngFile('id.png');
  const submitted = await page.request.post(`${API}/verification`, {
    multipart: {
      documentType: 'PASSPORT',
      documentCountry: 'FR',
      documentFront: image,
      selfie: { ...image, name: 'selfie.png' },
    },
  });
  expect(submitted.ok()).toBeTruthy();
  const { id } = (await submitted.json()) as { id: string };
  expect((await admin.post(`${API}/admin/verifications/${id}/approve`)).ok()).toBeTruthy();
  return user;
}

/** An API client signed in as the seeded admin. */
export async function adminApi(): Promise<APIRequestContext> {
  const context = await request.newContext({
    extraHTTPHeaders: { 'x-e2e-key': process.env.E2E_BYPASS_KEY ?? 'local-e2e' },
  });
  const res = await context.post(`${API}/auth/login`, { data: ADMIN });
  expect(res.ok()).toBeTruthy();
  return context;
}

export { API };
