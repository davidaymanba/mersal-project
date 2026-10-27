import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  adminApi,
  ADMIN,
  API,
  createApprovedTraveller,
  createVerifiedUser,
  login,
  retireRoute,
} from './helpers';

const isoDay = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/** Runs a parcel Toulouse → Annaba through payment, matching, pickup and delivery via the API. */
async function deliveredShipment(sender: Page, traveller: Page) {
  const catalog = await (await sender.request.get(`${API}/catalog`)).json();
  const city = (slug: string) => catalog.cities.find((c: { slug: string }) => c.slug === slug).id;
  await traveller.request.post(`${API}/trips`, {
    data: {
      originCityId: city('fr-toulouse'),
      destinationCityId: city('dz-annaba'),
      departureDate: isoDay(1),
      capacityGrams: 5000,
    },
  });
  const quote = await (
    await sender.request.post(`${API}/quotes`, {
      data: {
        originCityId: city('fr-toulouse'),
        destinationCityId: city('dz-annaba'),
        categoryCode: 'GIFTS',
        weightGrams: 1500,
        lengthCm: 25,
        widthCm: 20,
        heightCm: 15,
        declaredValue: 8000,
      },
    })
  ).json();
  const shipment = await (
    await sender.request.post(`${API}/shipments`, {
      data: {
        quoteId: quote.id,
        description: 'Ceramic tea set',
        earliestDate: isoDay(0),
        latestDate: isoDay(5),
        recipientName: 'Lina',
        recipientPhone: '+213555121212',
        restrictedItemsAck: true,
      },
    })
  ).json();
  const payment = await (
    await sender.request.post(`${API}/shipments/${shipment.id}/payment`)
  ).json();
  await sender.request.post(`${API}/payments/${payment.paymentId}/confirm-demo`);

  let offerId: string | undefined;
  await expect
    .poll(async () => {
      const offers = (await (await traveller.request.get(`${API}/offers`)).json()) as {
        id: string;
        shipment: { id: string };
      }[];
      offerId = offers.find((o) => o.shipment.id === shipment.id)?.id;
      return offerId;
    })
    .toBeTruthy();
  await traveller.request.post(`${API}/offers/${offerId}/accept`);
  const codes = await (await sender.request.get(`${API}/shipments/${shipment.id}`)).json();
  await traveller.request.post(`${API}/shipments/${shipment.id}/pickup`, {
    data: { code: codes.pickupCode },
  });
  await traveller.request.post(`${API}/shipments/${shipment.id}/deliver`, {
    data: { code: codes.deliveryCode },
  });
  return shipment.id as string;
}

test('a sender reports a damaged parcel, admin refunds part of it, sender reviews the traveller', async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const admin: APIRequestContext = await adminApi();
  retireRoute('dz-annaba');
  const traveller = await (await browser.newContext()).newPage();
  await createApprovedTraveller(traveller, admin, 'Rayan');
  const sender = await (await browser.newContext()).newPage();
  await createVerifiedUser(sender, { firstName: 'Meriem' });
  const shipmentId = await deliveredShipment(sender, traveller);

  // ── Sender reports a problem during the complaint window ────────────────
  await sender.goto(`/en/app/shipments/${shipmentId}`);
  await sender.getByRole('button', { name: 'Report a problem' }).click();
  const dialog = sender.getByRole('dialog');
  await dialog.getByLabel('What went wrong?').selectOption('DAMAGED');
  await dialog.getByLabel('Describe the problem').fill('Two cups arrived broken inside the box.');
  await dialog.getByRole('button', { name: 'Send report' }).click();
  await expect(sender.getByRole('heading', { name: 'Reported problem' })).toBeVisible();
  await expect(sender.getByText('In dispute').first()).toBeVisible();

  // ── Admin resolves with a partial refund ────────────────────────────────
  const adminPage = await (await browser.newContext()).newPage();
  await login(adminPage, ADMIN.email, ADMIN.password);
  await adminPage.goto('/en/admin/disputes');
  await adminPage.getByRole('row').filter({ hasText: 'Damaged' }).first().getByRole('link').click();
  await expect(adminPage.getByText('Two cups arrived broken inside the box.')).toBeVisible();
  await adminPage.getByRole('button', { name: 'Start review' }).click();
  await adminPage.getByLabel('Decision', { exact: true }).selectOption('PARTIAL_REFUND');
  await adminPage.getByLabel('Refund amount (€)').fill('6');
  await adminPage
    .getByLabel('Decision note (shown to both parties)')
    .fill('Two cups broken: refunding their value.');
  await adminPage.getByRole('button', { name: 'Resolve' }).click();
  await expect(adminPage.getByText('Dispute resolved.')).toBeVisible();

  // ── Sender sees the outcome and reviews the traveller ───────────────────
  await sender.reload();
  await expect(sender.getByText(/Partly refunded \(€6\.00\)/)).toBeVisible();
  await expect(sender.getByText('Completed').first()).toBeVisible();
  await sender.getByRole('radio', { name: '4 stars' }).click();
  await sender.getByLabel('Comment (optional)').fill('Kind traveller, packaging could be better.');
  await sender.getByRole('button', { name: 'Send review' }).click();
  await expect(sender.getByRole('heading', { name: 'Your review' })).toBeVisible();

  // ── Traveller's wallet shows the split ──────────────────────────────────
  await traveller.goto('/en/app/wallet');
  await expect(traveller.getByText('Dispute resolved — refunded to sender')).toBeVisible();
  await expect(traveller.getByText('Dispute resolved — released')).toBeVisible();

  await admin.dispose();
});

test('admin insights: overview chart, CSV reports, settings and audit log', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page.getByRole('heading', { name: 'Activity, last 30 days' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Activity, last 30 days' })).toBeVisible();

  const csv = await page.request.get(`${API}/admin/reports/shipments.csv`);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toContain('reference,created_at,status');

  await page.goto('/en/admin/settings');
  await page.getByLabel('Weekly payout day').selectOption({ label: 'Friday' });
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved.')).toBeVisible();
  await page.getByLabel('Weekly payout day').selectOption({ label: 'Monday' });
  await page.getByRole('button', { name: 'Save settings' }).click();

  await page.goto('/en/admin/audit');
  await expect(page.getByText('settings.update').first()).toBeVisible();
});
