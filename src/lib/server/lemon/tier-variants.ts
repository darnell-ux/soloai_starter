/**
 * Map pricing tier keys to Lemon Squeezy variant ids from env (server-only).
 */

export type BillingTier = 'basic' | 'pro' | 'team';

const TIER_KEYS: Record<BillingTier, string> = {
	basic: 'LEMON_VARIANT_BASIC',
	pro: 'LEMON_VARIANT_PRO',
	team: 'LEMON_VARIANT_TEAM'
};

export function isBillingTier(s: string): s is BillingTier {
	return s === 'basic' || s === 'pro' || s === 'team';
}

export function variantIdForTier(tier: BillingTier): string | undefined {
	const key = TIER_KEYS[tier];
	const v = process.env[key]?.trim();
	if (!v || !/^\d+$/.test(v)) return undefined;
	return v;
}

export function tierForVariantId(variantId: string | undefined): BillingTier | undefined {
	if (!variantId) return undefined;
	const v = variantId.trim();
	for (const tier of Object.keys(TIER_KEYS) as BillingTier[]) {
		if (variantIdForTier(tier) === v) return tier;
	}
	return undefined;
}
