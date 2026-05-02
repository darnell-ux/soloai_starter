import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { resolveDemoPlan } from '$lib/server/billing/demo-plan-targets';
import { paymentProcessorForLocale } from '$lib/server/billing/payment-provider';
import { getEnv } from '$lib/server/env';
import { createLemonHostedCheckout } from '$lib/server/lemon/create-checkout-session';
import { createAnonymousStripeSubscriptionCheckout } from '$lib/server/stripe/create-checkout';

export const POST: RequestHandler = async ({ request }) => {
	const ct = request.headers.get('content-type')?.toLowerCase() ?? '';
	if (!ct.includes('application/json')) {
		throw error(415, { message: 'unsupported_media_type' });
	}
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, { message: 'invalid_json' });
	}
	const o = body as Record<string, unknown> | null;
	const locale = typeof o?.locale === 'string' ? o.locale.trim() : 'en';
	const planId = typeof o?.planId === 'string' ? o.planId.trim() : '';
	if (!planId) {
		throw error(400, { message: 'invalid_plan' });
	}

	const processor = paymentProcessorForLocale(locale);
	const targets = resolveDemoPlan(planId);

	if (processor === 'stripe') {
		const priceId = targets.stripePriceId;
		if (!priceId) {
			throw error(400, { message: 'missing_stripe_price' });
		}
		if (!getEnv().STRIPE_ENABLED) {
			throw error(503, { message: 'stripe_unconfigured' });
		}
		const r = await createAnonymousStripeSubscriptionCheckout(priceId);
		if (!r.ok) {
			if (r.reason === 'invalid_price') throw error(400, { message: 'invalid_price' });
			if (r.reason === 'unconfigured') throw error(503, { message: 'stripe_unconfigured' });
			throw error(502, { message: 'checkout_failed' });
		}
		return json({ url: r.url, provider: 'stripe' as const });
	}

	const variantId = targets.lemonVariantId;
	if (!variantId) {
		throw error(400, { message: 'missing_lemon_variant' });
	}
	if (!getEnv().LEMON_SQUEEZY_ENABLED) {
		throw error(503, { message: 'lemonsqueezy_unconfigured' });
	}
	const lr = await createLemonHostedCheckout({ variantId });
	if (!lr.ok) {
		throw error(502, { message: 'checkout_failed' });
	}
	return json({ url: lr.url, provider: 'lemonsqueezy' as const });
};
