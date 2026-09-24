/**
 * After signup the page navigates to `data.redirectTo`. If load() omits it,
 * `goto(undefined)` lands on `/undefined`.
 */
import { describe, expect, it } from 'vitest';
import { localizeHref } from '$lib/paraglide/runtime';
import { load } from './+page.server';

function signupLoad(search = '') {
	const href = `https://app.test/signup${search}`;
	return load({
		locals: { user: null },
		url: new URL(href),
		request: new Request(href)
	} as unknown as Parameters<typeof load>[0]);
}

describe('signup redirectTo', () => {
	it('sends signup with no redirect param to the default route, not /undefined', async () => {
		const data = await signupLoad();
		const dest = localizeHref('/account', { locale: 'en' });

		expect(data.redirectTo).toBe(dest);
		expect(data.redirectTo).not.toBe('/undefined');
		expect(data.redirectTo.includes('undefined')).toBe(false);
	});
});
