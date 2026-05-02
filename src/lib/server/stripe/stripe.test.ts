import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAllowedPriceIdForCheckout } from './pricing';

describe('stripe pricing', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('rejects bad price id format', () => {
		expect(isAllowedPriceIdForCheckout('')).toBe(false);
		expect(isAllowedPriceIdForCheckout('prod_123')).toBe(false);
	});

	it('accepts well-formed price_ ids when no allow-list is configured', () => {
		for (const key of ['STRIPE_PRICE_BASIC', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_TEAM'] as const) {
			vi.stubEnv(key, '');
		}
		expect(isAllowedPriceIdForCheckout('price_123')).toBe(true);
	});

	it('restricts checkout to union of STRIPE_PRICE_* env ids when set', () => {
		vi.stubEnv('STRIPE_PRICE_PRO', 'price_allowed_pro');
		expect(isAllowedPriceIdForCheckout('price_allowed_pro')).toBe(true);
		expect(isAllowedPriceIdForCheckout('price_other_xyz')).toBe(false);
	});
});
