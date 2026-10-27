import { expect, test } from '@playwright/test';
import {
  adminApi,
  ADMIN,
  API,
  createApprovedTraveller,
  createVerifiedUser,
  login,
  retireRoute,
  sql,
} from './helpers';

const isoDay = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test('full parcel lifecycle: pay, match, chat, pick up, deliver, hold, payout', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const admin = await adminApi();

  // ── A verified traveller with a trip Marseille → Constantine ─────────────
  const travellerContext = await browser.newContext();
  const traveller = await travellerContext.newPage();
  await createApprovedTraveller(traveller, admin, 'Nassim');
  const catalog = await (await traveller.request.get(`${API}/catalog`)).json();
  const city = (slug: string) => catalog.cities.find((c: { slug: string }) => c.slug === slug).id;
  retireRoute('dz-constantine');
  expect(
    (
      await traveller.request.post(`${API}/trips`, {
        data: {
          originCityId: city('fr-marseille'),
          destinationCityId: city('dz-constantine'),
          departureDate: isoDay(2),
          capacityGrams: 6000,
        },
      })
    ).ok(),
  ).toBeTruthy();

  // ── Sender creates a parcel and pays from the shipment page ──────────────
  const senderContext = await browser.newContext();
  const sender = await senderContext.newPage();
  await createVerifiedUser(sender, { firstName: 'Ines' });
  const quote = await (
    await sender.request.post(`${API}/quotes`, {
      data: {
        originCityId: city('fr-marseille'),
        destinationCityId: city('dz-constantine'),
        categoryCode: 'BOOKS',
        weightGrams: 2000,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 10,
        declaredValue: 3000,
      },
    })
  ).json();
  const shipment = await (
    await sender.request.post(`${API}/shipments`, {
      data: {
        quoteId: quote.id,
        description: 'University books for my brother',
        earliestDate: isoDay(0),
        latestDate: isoDay(7),
        recipientName: 'Walid',
        recipientPhone: '+213555444333',
        restrictedItemsAck: true,
      },
    })
  ).json();

  await sender.goto(`/en/app/shipments/${shipment.id}`);
  await sender.getByRole('button', { name: /^Pay / }).click();
  await expect(sender.getByText('Demo mode — no real card is charged.')).toBeVisible();
  await sender.getByRole('dialog').getByRole('button', { name: /^Pay / }).click();
  await expect(sender.getByText('Payment confirmed.')).toBeVisible();
  await expect(sender.getByText(/proposing your parcel to verified travellers/)).toBeVisible();

  // ── Traveller accepts the proposal created automatically after payment ───
  await traveller.goto('/en/app/offers');
  await expect(traveller.getByText('University books for my brother')).toBeVisible({
    timeout: 15_000,
  });
  await traveller.getByRole('button', { name: 'Accept' }).click();
  await expect(traveller.getByRole('heading', { name: 'Confirm pickup' })).toBeVisible();

  // ── Chat: contact details are masked ─────────────────────────────────────
  await sender.reload();
  await expect(sender.getByRole('heading', { name: 'Pickup code' })).toBeVisible();
  const pickupCode = (await sender
    .locator('p.font-mono')
    .filter({ hasText: /^\d{6}$/ })
    .first()
    .textContent())!.trim();
  await sender
    .getByPlaceholder('Write a message…')
    .fill('Meet at the station, call 06 11 22 33 44');
  await sender.getByRole('button', { name: 'Send' }).click();
  await expect(traveller.getByText('Meet at the station, call •••')).toBeVisible({
    timeout: 25_000,
  });

  // ── Pickup with the sender's code (a wrong code first) ───────────────────
  await traveller.getByLabel('Code').fill('000000');
  await traveller.getByRole('button', { name: 'Confirm pickup' }).click();
  await expect(traveller.getByText('4 attempts left')).toBeVisible();
  await traveller.getByLabel('Code').fill(pickupCode);
  await traveller.getByRole('button', { name: 'Confirm pickup' }).click();
  await expect(traveller.getByText('Pickup confirmed.')).toBeVisible();
  await traveller.getByRole('button', { name: "I'm on my way" }).click();
  await expect(traveller.getByText('In transit').first()).toBeVisible();

  // ── Recipient's public tracking page shows the delivery code ─────────────
  const trackingPath = (await (await sender.request.get(`${API}/shipments/${shipment.id}`)).json())
    .trackingPath as string;
  const recipient = await browser.newPage();
  await recipient.goto(`/fr${trackingPath}`);
  await expect(recipient.getByText('Votre code de livraison')).toBeVisible();
  const deliveryCode = (await recipient
    .locator('p.font-mono')
    .filter({ hasText: /^\d{6}$/ })
    .textContent())!.trim();

  // ── Delivery with the recipient's code → earning on hold ─────────────────
  await traveller.getByLabel('Code').fill(deliveryCode);
  await traveller.getByRole('button', { name: 'Confirm delivery' }).click();
  await expect(traveller.getByText('Delivery confirmed.')).toBeVisible();
  await traveller.goto('/en/app/wallet');
  await expect(traveller.getByText('Earning on hold')).toBeVisible();

  // ── Hold period ends (fast-forwarded), traveller adds bank details ───────
  sql(
    `update "LedgerEntry" set "releaseAt" = now() - interval '1 minute' where "shipmentId" = '${shipment.id}'`,
  );
  expect((await admin.post(`${API}/admin/payouts/release-holds`)).ok()).toBeTruthy();
  await traveller.reload();
  await expect(traveller.getByText('Earning available')).toBeVisible();
  await traveller.getByLabel('Account holder').fill('Nassim Belkacem');
  await traveller.getByLabel('IBAN').fill('FR76 3000 6000 0112 3456 7890 189');
  await traveller.getByRole('button', { name: 'Save bank details' }).click();
  await expect(traveller.getByText(/Payouts go to Nassim Belkacem/)).toBeVisible();

  // ── Admin runs the weekly payout from the dashboard ──────────────────────
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await login(adminPage, ADMIN.email, ADMIN.password);
  await adminPage.goto('/en/admin/payouts');
  await adminPage.getByRole('button', { name: 'Run payouts now' }).click();
  await expect(adminPage.getByText(/Payouts: \d+ paid/)).toBeVisible();

  await traveller.reload();
  await expect(traveller.getByText('Payout sent')).toBeVisible();

  // Sender sees the parcel completed.
  await sender.goto(`/en/app/shipments/${shipment.id}`);
  await expect(sender.getByText('Completed').first()).toBeVisible();

  for (const context of [travellerContext, senderContext, adminContext]) await context.close();
  await admin.dispose();
});
