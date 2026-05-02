import { expect, test } from '@playwright/test';

const pages: { path: string; title: RegExp }[] = [
	{ path: '/', title: /Home \| SaaS/ },
	{ path: '/features', title: /Features \| SaaS/ },
	{ path: '/pricing', title: /Pricing \| SaaS/ },
	{ path: '/contact', title: /Contact \| SaaS/ },
	{ path: '/privacy', title: /Privacy \| SaaS/ },
	{ path: '/terms', title: /Terms \| SaaS/ },
	{ path: '/login', title: /Log in \| SaaS/ },
	{ path: '/signup', title: /Sign up \| SaaS/ },
	{ path: '/forgot-password', title: /Forgot password \| SaaS/ }
];

test('/account redirects to login when signed out', async ({ page }) => {
	await page.goto('/account');
	await expect(page).toHaveURL(/\/login/);
	expect(page.url()).toMatch(/redirectTo=/);
});

for (const { path, title } of pages) {
	test(`${path} loads with matching document title`, async ({ page }) => {
		const response = await page.goto(path);
		expect(response?.ok()).toBeTruthy();
		await expect(page).toHaveTitle(title);
		const h1 = page.locator('main h1');
		await expect(h1).toBeVisible();
	});
}

test('unknown path shows error page', async ({ page }) => {
	const response = await page.goto('/this-route-does-not-exist-xyz');
	expect(response?.status()).toBe(404);
	await expect(page).toHaveTitle(/Not found \| SaaS/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Page not found/);
});
