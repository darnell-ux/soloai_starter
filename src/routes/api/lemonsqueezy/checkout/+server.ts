import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { extractLocaleFromRequest } from '$lib/paraglide/runtime';
import { getEnv } from '$lib/server/env';
import { checkoutRateLimitHit } from '$lib/server/lemon/checkout-rate-limit';
import { createLemonHostedCheckout } from '$lib/server/lemon/create-checkout-session';
import { isBillingTier, variantIdForTier } from '$lib/server/lemon/tier-variants';

export const POST: RequestHandler = async (event) => {
	if (!getEnv().LEMON_SQUEEZY_ENABLED) {
		throw error(503, { message: 'lemonsqueezy_unconfigured' });
	}
	if (!event.locals.user) {
		throw error(401, { message: 'unauthorized' });
	}
	const uid = String(event.locals.user.id);
	if (checkoutRateLimitHit(`lemon_co:${uid}`)) {
		throw error(429, { message: 'rate_limited' });
	}

	const ct = event.request.headers.get('content-type')?.toLowerCase() ?? '';
	if (!ct.includes('application/json')) {
		throw error(415, { message: 'unsupported_media_type' });
	}
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, { message: 'invalid_json' });
	}
	const o = body as Record<string, unknown> | null;
	const tierRaw = o && typeof o.tier === 'string' ? o.tier.trim().toLowerCase() : '';
	if (!tierRaw || !isBillingTier(tierRaw)) {
		throw error(400, { message: 'invalid_tier' });
	}
	const variantId = variantIdForTier(tierRaw);
	if (!variantId) {
		throw error(400, { message: 'invalid_tier' });
	}

	const locale = extractLocaleFromRequest(event.request);
	const u = event.locals.user;
	const r = await createLemonHostedCheckout({
		variantId,
		email: String(u.email ?? ''),
		name: u.name != null ? String(u.name) : undefined,
		customData: {
			user_id: uid,
			tier: tierRaw,
			locale
		}
	});
	if (!r.ok) {
		throw error(500, { message: 'checkout_failed' });
	}
	return json({ url: r.url });
};
