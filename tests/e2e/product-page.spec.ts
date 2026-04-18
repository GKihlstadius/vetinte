import { test, expect } from '@playwright/test';

test.describe('product page', () => {
  test('renders product header and reviews section', async ({ page }) => {
    await page.goto('/p/sony-wh-1000xm5');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('WH-1000XM5');
    await expect(page.getByText('Sony', { exact: true })).toBeVisible();
    await expect(page.getByText('audio/headphones/over-ear')).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Recensioner$/i })).toBeVisible();
  });

  test('shows specs section when product has specs_json populated', async ({ page }) => {
    await page.goto('/p/sony-wh-1000xm5');
    await expect(page.getByRole('heading', { name: /^Specifikationer$/i })).toBeVisible();
  });

  test('shows sign-in prompt when not authenticated', async ({ page }) => {
    await page.goto('/p/sony-wh-1000xm5');
    await expect(page.getByText('Logga in', { exact: false }).first()).toBeVisible();
  });

  test('back link returns to home', async ({ page }) => {
    await page.goto('/p/sony-wh-1000xm5');
    await page.getByRole('link', { name: /Tillbaka/i }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('navigation from card to product page', () => {
  test('clicking a popular product card opens its product page', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse((r) => r.url().includes('/api/products') && r.status() === 200);
    const firstCardLink = page.locator('a[href^="/p/"]').first();
    await expect(firstCardLink).toBeVisible();
    const href = await firstCardLink.getAttribute('href');
    await firstCardLink.click();
    if (href) await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
});
