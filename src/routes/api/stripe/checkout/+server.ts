import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { checkoutRateLimitHit } from '$lib/server/lemon/checkout-rate-limit';
import { getEnv } from '$lib/server/env';
import { createSubscriptionCheckoutSession } from '$lib/server/stripe/create-checkout';

export const POST: RequestHandler = async (event) => {
	if (!getEnv().STRIPE_ENABLED) {
		throw error(503, { message: 'stripe_unconfigured' });
	}
	if (!event.locals.user) {
		throw error(401, { message: 'unauthorized' });
	}
	const uid = String(event.locals.user.id);
	if (checkoutRateLimitHit(`stripe_co:${uid}`)) {
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
	const priceId = o && typeof o.priceId === 'string' ? o.priceId.trim() : '';
	if (!priceId) {
		throw error(400, { message: 'invalid_price' });
	}
	const u = event.locals.user;
	const r = await createSubscriptionCheckoutSession(
		String(u.id),
		String(u.email ?? ''),
		u.name != null ? String(u.name) : null,
		priceId
	);
	if (!r.ok) {
		if (r.reason === 'invalid_price') throw error(400, { message: 'invalid_price' });
		if (r.reason === 'unconfigured') throw error(503, { message: 'stripe_unconfigured' });
		throw error(502, { message: 'checkout_failed' });
	}
	return json({ url: r.url });
};
