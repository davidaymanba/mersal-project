import { expect, test, type Page } from '@playwright/test';
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

/** Matches a paid parcel Bordeaux → Sétif with the traveller and returns its id. */
async function matchedShipment(sender: Page, traveller: Page) {
  const catalog = await (await sender.request.get(`${API}/catalog`)).json();
  const city = (slug: string) => catalog.cities.find((c: { slug: string }) => c.slug === slug).id;
  await traveller.request.post(`${API}/trips`, {
    data: {
      originCityId: city('fr-bordeaux'),
      destinationCityId: city('dz-setif'),
      departureDate: isoDay(2),
      capacityGrams: 5000,
    },
  });
  const quote = await (
    await sender.request.post(`${API}/quotes`, {
      data: {
        originCityId: city('fr-bordeaux'),
        destinationCityId: city('dz-setif'),
        categoryCode: 'DOCUMENTS',
        weightGrams: 500,
        lengthCm: 30,
        widthCm: 22,
        heightCm: 3,
        declaredValue: 1000,
      },
    })
  ).json();
  const shipment = await (
    await sender.request.post(`${API}/shipments`, {
      data: {
        quoteId: quote.id,
        description: 'Signed contract',
        earliestDate: isoDay(0),
        latestDate: isoDay(5),
        recipientName: 'Amira',
        recipientPhone: '+213555343434',
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
  return shipment.id as string;
}

test('messages inbox, notification centre and the admin travellers list', async ({ browser }) => {
  test.setTimeout(90_000);
  // Sétif has no demo trips, so this run cannot disturb the sample data.
  retireRoute('dz-setif');
  const admin = await adminApi();
  const traveller = await (await browser.newContext()).newPage();
  await createApprovedTraveller(traveller, admin, 'Walid');
  const sender = await (await browser.newContext()).newPage();
  await createVerifiedUser(sender, { firstName: 'Houda' });
  const shipmentId = await matchedShipment(sender, traveller);
  await traveller.request.post(`${API}/shipments/${shipmentId}/messages`, {
    data: { body: 'Hello! Call me on 06 98 76 54 32 to meet.' },
  });

  // ── Inbox: unread badge, masked message, reply ──────────────────────────
  await sender.goto('/en/app/messages');
  const nav = sender.getByRole('navigation').getByRole('link', { name: /Messages/ });
  await expect(nav).toContainText('1');
  const row = sender
    .getByRole('navigation', { name: 'Conversations' })
    .getByRole('link', { name: /Walid B\./ });
  await expect(row).toContainText('1 unread');
  await row.click();
  await expect(sender.getByText('Hello! Call me on ••• to meet.')).toBeVisible();
  await expect(row).not.toContainText('unread');
  await sender.getByPlaceholder('Write a message…').fill('Great, see you at the station.');
  await sender.getByRole('button', { name: 'Send' }).click();
  await expect(sender.getByText('Great, see you at the station.')).toBeVisible();
  const inbox = await (await traveller.request.get(`${API}/conversations`)).json();
  expect(inbox.find((c: { shipmentId: string }) => c.shipmentId === shipmentId).unread).toBe(1);

  // ── Notification centre: filter and mark everything read ────────────────
  await sender.getByRole('button', { name: 'Notifications' }).click();
  await sender.getByRole('link', { name: 'See all notifications' }).click();
  await expect(sender.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible();
  await sender.getByRole('button', { name: /^Unread/ }).click();
  await expect(sender.getByText(/A verified traveller accepted your parcel/)).toBeVisible();
  await sender.getByRole('button', { name: 'Mark all as read' }).first().click();
  await expect(sender.getByText('No unread notifications.')).toBeVisible();

  // ── Admin: the new traveller with their trip and response rate ──────────
  const adminPage = await (await browser.newContext()).newPage();
  await login(adminPage, ADMIN.email, ADMIN.password);
  await adminPage.goto('/en/admin/travellers');
  await expect(adminPage.getByText('Verified travellers')).toBeVisible();
  await adminPage.getByLabel('Search').fill('Walid');
  const travellerRow = adminPage.getByRole('row').filter({ hasText: 'Walid Belkacem' }).first();
  await expect(travellerRow).toContainText('Verified traveller');
  await expect(travellerRow).toContainText('0 delivered · 1 active');
  await expect(travellerRow).toContainText('1 open trip');
  await travellerRow.getByRole('link').click();
  await expect(adminPage).toHaveURL(/\/en\/admin\/users\//);

  await admin.dispose();
});
