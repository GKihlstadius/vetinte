import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('renders hero, search input, and category pills', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('som faktiskt passar dig');
    await expect(page.getByPlaceholder(/Vilka hörlurar är bäst/)).toBeVisible();

    await page.waitForResponse((r) => r.url().includes('/api/products') && r.status() === 200);
    await expect(page.getByRole('button', { name: /^Alla/ })).toBeVisible();
  });

  test('clicking a category pill filters the popular grid', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse((r) => r.url().includes('/api/products') && r.status() === 200);

    const skincarePill = page.getByRole('button', { name: /Hudvård/i }).first();
    await skincarePill.click();

    const heading = page.getByRole('heading', { name: /Hudvård just nu/i });
    await expect(heading).toBeVisible();
  });

  test('rotating headline word changes over time', async ({ page }) => {
    await page.goto('/');
    const heading = page.getByRole('heading', { level: 1 });
    const first = (await heading.textContent()) ?? '';
    let changed = false;
    for (let i = 0; i < 5 && !changed; i++) {
      await page.waitForTimeout(2600);
      const next = (await heading.textContent()) ?? '';
      if (next !== first) changed = true;
    }
    expect(changed).toBe(true);
  });
});
