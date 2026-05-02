/**
 * Demo / marketing checkout plan resolution. Prefer explicit ids in request;
 * otherwise optional process.env overrides (not part of strict env validation).
 */
function fromEnv(key: string): string | undefined {
	const v = process.env[key];
	if (v === undefined || v.trim() === '') return undefined;
	return v.trim();
}

export type ResolvedDemoPlan = {
	stripePriceId: string | undefined;
	lemonVariantId: string | undefined;
};

export function resolveDemoPlan(planId: string): ResolvedDemoPlan {
	const p = planId.trim();
	if (/^price_[A-Za-z0-9_]+$/.test(p) && p.length <= 256) {
		return { stripePriceId: p, lemonVariantId: undefined };
	}
	if (/^\d+$/.test(p)) {
		return { stripePriceId: undefined, lemonVariantId: p };
	}
	const basicStripe = fromEnv('STRIPE_PRICE_BASIC');
	const proStripe = fromEnv('STRIPE_PRICE_PRO');
	const teamStripe = fromEnv('STRIPE_PRICE_TEAM');
	const basicLemon = fromEnv('LEMON_VARIANT_BASIC');
	const proLemon = fromEnv('LEMON_VARIANT_PRO');
	const teamLemon = fromEnv('LEMON_VARIANT_TEAM');
	const low = p.toLowerCase();
	if (low.includes('basic')) {
		return { stripePriceId: basicStripe, lemonVariantId: basicLemon };
	}
	if (low.includes('team')) {
		return { stripePriceId: teamStripe, lemonVariantId: teamLemon };
	}
	if (low.includes('pro') || p === 'pro_123') {
		return { stripePriceId: proStripe, lemonVariantId: proLemon };
	}
	return { stripePriceId: proStripe, lemonVariantId: proLemon };
}
