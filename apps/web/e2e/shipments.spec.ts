import { expect, test } from '@playwright/test';
import { ADMIN, createVerifiedUser, login } from './helpers';

test('a sender prices a parcel on the public calculator and creates a shipment', async ({
  page,
}) => {
  await createVerifiedUser(page);

  await page.goto('/en/pricing');
  await page.getByLabel('From', { exact: true }).selectOption({ label: 'Paris' });
  await page.getByLabel('To', { exact: true }).selectOption({ label: 'Algiers' });
  await page.getByText('Clothing & textiles').click();
  await page.getByLabel('Weight (kg)', { exact: true }).fill('2.5');
  await page.getByLabel('Length', { exact: true }).fill('40');
  await page.getByLabel('Width', { exact: true }).fill('30');
  await page.getByLabel('Height', { exact: true }).fill('15');
  await page.getByLabel('Declared value (€)', { exact: true }).fill('150');
  await page.getByText('Express', { exact: true }).click();
  await page.getByRole('button', { name: 'Calculate price' }).click();

  // 3.6 kg volumetric → €32 bracket, ×1.35 express = €43.20, + €0.75 value cover, rounded to €0.50
  await expect(page.getByText('€44.00')).toBeVisible();
  await expect(page.getByText('Priced on volumetric weight: 3.6 kg')).toBeVisible();
  await page.getByRole('link', { name: 'Send this parcel' }).click();

  await expect(page.getByLabel("What's inside?")).toBeVisible();
  await page.getByLabel("What's inside?").fill('Winter coats and scarves for my family');
  await page.getByLabel('Full name', { exact: true }).fill('Karim Benali');
  await page.getByLabel('Phone number', { exact: true }).fill('+213555123456');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create shipment' }).click();

  await expect(page).toHaveURL(/\/en\/app\/shipments\/[a-z0-9]+$/);
  await expect(page.getByText('Awaiting payment').first()).toBeVisible();
  await expect(page.getByText(/MRS-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toBeVisible();
  await expect(page.getByText('€44.00', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pay €44.00' })).toBeVisible();

  await page.goto('/en/app/shipments');
  await expect(page.getByText('Algiers').first()).toBeVisible();
});

test('the calculator explains routes that are not served and category limits', async ({ page }) => {
  await page.goto('/fr/pricing');
  await page.getByLabel('Départ', { exact: true }).selectOption({ label: 'Paris' });
  await page.getByLabel('Arrivée', { exact: true }).selectOption({ label: 'Alger' });
  await page.getByText('Documents', { exact: true }).click();
  await page.getByLabel('Poids (kg)', { exact: true }).fill('3');
  await page.getByLabel('Longueur', { exact: true }).fill('30');
  await page.getByLabel('Largeur', { exact: true }).fill('21');
  await page.getByLabel('Hauteur', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Calculer le prix' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText(
    'limite de poids plus basse',
  );
});

test('an admin simulates a tariff change before publishing it', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/en\/admin$/);
  await page.goto('/en/admin/pricing');
  await page
    .getByRole('link', { name: /Active/ })
    .first()
    .click();
  await expect(page.getByText('Active and archived versions are read-only.')).toBeVisible();
  await page.getByRole('button', { name: 'Simulate' }).click();
  await expect(page.getByText('Traveller earning')).toBeVisible();
});
