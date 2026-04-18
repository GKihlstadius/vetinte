import { test, expect } from '@playwright/test';

test.describe('auth & profile pages', () => {
  test('topnav shows "Skapa konto" when logged out', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Skapa konto' })).toBeVisible();
  });

  test('sign-in page renders both Google and email form', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: 'Logga in på Betyget' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Fortsätt med Google/i })).toBeVisible();
    await expect(page.getByPlaceholder('din@email.se')).toBeVisible();
  });

  test('profile page redirects to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/sign-in/);
  });
});
