/**
 * Allow-list for subscription Checkout `line_items[].price` ids.
 * Add your Dashboard price ids (e.g. price_...) here; test mode first.
 * Env vars STRIPE_PRICE_* (optional) are merged in so Checkout stays aligned with pricing UI.
 */
export const STRIPE_ALLOWED_PRICE_IDS = new Set<string>([
	// e.g. 'price_00000000000000'
]);

const ENV_PRICE_KEYS = [
	'STRIPE_PRICE_BASIC',
	'STRIPE_PRICE_PRO',
	'STRIPE_PRICE_TEAM'
] as const;

function allowedPriceIdsFromEnv(): Set<string> {
	const s = new Set<string>();
	for (const key of ENV_PRICE_KEYS) {
		const v = process.env[key]?.trim();
		if (v && /^price_[A-Za-z0-9_]+$/.test(v) && v.length <= 256) s.add(v);
	}
	return s;
}

export function isAllowedPriceIdForCheckout(priceId: string): boolean {
	if (!/^price_[A-Za-z0-9_]+$/.test(priceId) || priceId.length > 256) return false;
	const union = new Set<string>([...STRIPE_ALLOWED_PRICE_IDS, ...allowedPriceIdsFromEnv()]);
	if (union.size === 0) return true;
	return union.has(priceId);
}
