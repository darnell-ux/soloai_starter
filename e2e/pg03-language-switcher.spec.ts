import { expect, test } from '@playwright/test';

test('language switcher exposes locales and updates selection', async ({ page }) => {
	await page.goto('/');
	const sel = page.locator('#language-select');
	await expect(sel).toBeVisible();
	await sel.selectOption('es');
	await expect(sel).toHaveValue('es');
	await sel.selectOption('en');
	await expect(sel).toHaveValue('en');
});
