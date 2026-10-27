import { expect, test } from '@playwright/test';
import { ADMIN, login, pngFile, readDemoCode } from './helpers';

test('a new user signs up, verifies contact details and becomes a verified traveller', async ({
  browser,
}) => {
  const email = `e2e.${Date.now()}@example.com`;
  const phone = `+3361${String(Date.now()).slice(-7)}`;

  // ── Traveller signs up ────────────────────────────────────────────────────
  const travellerContext = await browser.newContext();
  const traveller = await travellerContext.newPage();
  await traveller.goto('/en/signup?mode=traveller');
  await traveller.getByLabel('First name').fill('Samira');
  await traveller.getByLabel('Last name').fill('Haddad');
  await traveller.getByLabel('Email').fill(email);
  await traveller.getByLabel('Password').fill('Travel2026!');
  await traveller.getByRole('checkbox').check();
  await traveller.getByRole('button', { name: 'Create account' }).click();

  // ── Email verification (code shown in demo mode) ──────────────────────────
  await expect(traveller.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await traveller.getByLabel('Verification code').fill(await readDemoCode(traveller));
  await traveller.getByRole('button', { name: 'Confirm email' }).click();

  // Lands on the verification page; phone is still missing.
  await expect(traveller.getByRole('heading', { name: 'Traveller verification' })).toBeVisible();
  await traveller.getByRole('link', { name: 'Phone number confirmed' }).click();

  // ── Phone verification ────────────────────────────────────────────────────
  await traveller.getByLabel('Phone number').fill(phone);
  await traveller.getByRole('button', { name: 'Send code' }).click();
  await traveller.getByLabel('Code', { exact: true }).fill(await readDemoCode(traveller));
  await traveller.getByRole('button', { name: 'Confirm number' }).click();
  await expect(traveller.getByText(phone)).toBeVisible();

  // ── Identity documents ────────────────────────────────────────────────────
  await traveller.goto('/en/app/verification');
  const fileInputs = traveller.locator('input[type=file]');
  await fileInputs.nth(0).setInputFiles(pngFile('passport.png'));
  await fileInputs.nth(1).setInputFiles(pngFile('selfie.png'));
  await traveller.getByRole('button', { name: 'Send for review' }).click();
  await expect(traveller.getByText('Under review').first()).toBeVisible();

  // ── Admin approves ────────────────────────────────────────────────────────
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await expect(admin).toHaveURL(/\/en\/admin$/);
  await admin.getByRole('link', { name: /Verifications/ }).click();
  await admin.getByRole('link', { name: 'Samira Haddad' }).first().click();
  await expect(admin.getByRole('img', { name: 'Selfie' })).toBeVisible();
  await admin.getByRole('button', { name: 'Approve' }).click();
  await expect(admin.getByText('Verification approved.')).toBeVisible();

  // ── Traveller sees the result ─────────────────────────────────────────────
  await traveller.reload();
  await expect(traveller.getByText('You are verified')).toBeVisible();
  await traveller.getByRole('button', { name: 'Notifications' }).click();
  await expect(traveller.getByText('Your identity check was approved.')).toBeVisible();

  await travellerContext.close();
  await adminContext.close();
});

test('protected areas redirect to login and back', async ({ page }) => {
  await page.goto('/fr/app/settings');
  await expect(page).toHaveURL(/\/fr\/login\?next=/);
  await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible();
});

test('wrong password shows a translated error', async ({ page }) => {
  await page.goto('/ar/login');
  await page.getByLabel('البريد الإلكتروني').fill(ADMIN.email);
  await page.getByLabel('كلمة المرور').fill('wrong-password');
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText(
    'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  );
});
