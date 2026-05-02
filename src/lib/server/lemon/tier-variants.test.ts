import { afterEach, describe, expect, it, vi } from 'vitest';
import { isBillingTier, tierForVariantId, variantIdForTier } from './tier-variants';

describe('lemon tier variants', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('validates tier keys', () => {
		expect(isBillingTier('pro')).toBe(true);
		expect(isBillingTier('enterprise')).toBe(false);
	});

	it('resolves variant id from env', () => {
		vi.stubEnv('LEMON_VARIANT_PRO', '999001');
		expect(variantIdForTier('pro')).toBe('999001');
		expect(tierForVariantId('999001')).toBe('pro');
	});
});
