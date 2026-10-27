import { expect, test } from '@playwright/test';

test('public pages render in every language, Arabic right-to-left', async ({ page }) => {
  const titles = {
    en: 'One parcel, one traveller, every step confirmed.',
    fr: 'Un colis, un voyageur, chaque étape confirmée.',
    ar: 'طرد واحد، مسافر واحد، وكل خطوة مؤكَّدة.',
  };
  for (const [locale, title] of Object.entries(titles)) {
    await page.goto(`/${locale}/how-it-works`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }

  await page.goto('/en/services');
  await expect(page.getByRole('heading', { name: /France.*Algeria/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

  await page.goto('/en/help');
  await page.getByText('How is the price calculated?').click();
  await expect(page.getByText(/greater, the real weight or the volumetric weight/)).toBeVisible();
  await expect(page.locator('#prohibited').getByRole('listitem').first()).toBeVisible();

  await page.goto('/fr/terms');
  await expect(page.getByRole('heading', { level: 1, name: 'Conditions d’utilisation' })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('Version de travail');
});

test('the mobile menu navigates and unknown pages get a translated 404', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Services' }).click();
  await expect(page).toHaveURL(/\/en\/services$/);
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');

  const response = await page.goto('/fr/cette-page-n-existe-pas');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
});
