import { expect, test } from '@playwright/test';
import {
  adminApi,
  API,
  createApprovedTraveller,
  createVerifiedUser,
  retireRoute,
  sql,
} from './helpers';

const isoDay = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test('a traveller publishes a trip, receives a matching parcel and accepts it', async ({
  browser,
}) => {
  const admin = await adminApi();

  // ── Traveller publishes a trip from the UI ────────────────────────────────
  const travellerContext = await browser.newContext();
  const traveller = await travellerContext.newPage();
  await createApprovedTraveller(traveller, admin, 'Yanis');
  retireRoute('dz-oran');
  await traveller.goto('/en/app/trips/new');
  await traveller.getByLabel('Departure city', { exact: true }).selectOption({ label: 'Lyon' });
  await traveller.getByLabel('Arrival city', { exact: true }).selectOption({ label: 'Oran' });
  await traveller.getByLabel('Departure date', { exact: true }).fill(isoDay(4));
  await traveller.getByLabel('Space available (kg)', { exact: true }).fill('8');
  await traveller.getByRole('button', { name: 'Publish trip' }).click();
  await expect(traveller.getByText('Trip published.')).toBeVisible();
  await expect(traveller.getByRole('heading', { name: /Lyon/ })).toBeVisible();

  // ── Sender creates a parcel on the same route ─────────────────────────────
  const senderContext = await browser.newContext();
  const sender = await senderContext.newPage();
  await createVerifiedUser(sender, { firstName: 'Amel' });
  const catalog = await (await sender.request.get(`${API}/catalog`)).json();
  const city = (slug: string) => catalog.cities.find((c: { slug: string }) => c.slug === slug).id;
  const quote = await (
    await sender.request.post(`${API}/quotes`, {
      data: {
        originCityId: city('fr-lyon'),
        destinationCityId: city('dz-oran'),
        categoryCode: 'GIFTS',
        weightGrams: 1500,
        lengthCm: 25,
        widthCm: 20,
        heightCm: 10,
        declaredValue: 4000,
      },
    })
  ).json();
  const shipment = await (
    await sender.request.post(`${API}/shipments`, {
      data: {
        quoteId: quote.id,
        description: 'Birthday gifts for my sister',
        earliestDate: isoDay(1),
        latestDate: isoDay(10),
        recipientName: 'Sara',
        recipientPhone: '+213555777888',
        restrictedItemsAck: true,
      },
    })
  ).json();

  // Payment arrives in Phase 4; until then mark it paid and start matching directly.
  sql(`update "Shipment" set status='PAID' where id='${shipment.id}'`);
  const run = await (
    await admin.post(`${API}/admin/matching/shipments/${shipment.id}/rerun`)
  ).json();
  expect(run.result).toBe('OFFERED');

  // ── Traveller accepts from the proposals inbox ────────────────────────────
  await traveller.goto('/en/app/offers');
  await expect(traveller.getByText('Birthday gifts for my sister')).toBeVisible();
  await expect(traveller.getByText(/Expires in/)).toBeVisible();
  await traveller.getByRole('button', { name: 'Accept' }).click();
  await expect(traveller).toHaveURL(new RegExp(`/en/app/shipments/${shipment.id}$`));
  await expect(traveller.getByText('Traveller assigned').first()).toBeVisible();
  await expect(traveller.getByRole('heading', { name: 'Sender' })).toBeVisible();

  // ── Sender sees who carries the parcel ────────────────────────────────────
  await sender.goto(`/en/app/shipments/${shipment.id}`);
  await expect(sender.getByRole('heading', { name: 'Your traveller' })).toBeVisible();
  await expect(sender.getByText('Yanis B.')).toBeVisible();

  await travellerContext.close();
  await senderContext.close();
  await admin.dispose();
});

test('unverified users are guided to verification before publishing trips', async ({ page }) => {
  await createVerifiedUser(page);
  await page.goto('/en/app/trips');
  await expect(page.getByText('Verify your identity to publish trips')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start verification' })).toBeVisible();
});
