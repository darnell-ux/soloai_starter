import { extractLocaleFromRequest } from '$lib/paraglide/runtime';
import { paymentProcessorForLocale } from '$lib/server/billing/payment-provider';
import { getEnv } from '$lib/server/env';
import { getUserBilling } from '$lib/server/stripe/billing-store';
import { tierForVariantId } from '$lib/server/lemon/tier-variants';
import type { PageServerLoad } from './$types';

function envPrice(key: string): string | undefined {
	const v = process.env[key]?.trim();
	return v && /^price_[A-Za-z0-9_]+$/.test(v) && v.length <= 256 ? v : undefined;
}

function envVariant(key: string): string | undefined {
	const v = process.env[key]?.trim();
	return v && /^\d+$/.test(v) ? v : undefined;
}

function tierFromStripePriceId(priceId: string | undefined): string | null {
	if (!priceId) return null;
	const b = process.env.STRIPE_PRICE_BASIC?.trim();
	const p = process.env.STRIPE_PRICE_PRO?.trim();
	const t = process.env.STRIPE_PRICE_TEAM?.trim();
	if (b && priceId === b) return 'basic';
	if (p && priceId === p) return 'pro';
	if (t && priceId === t) return 'team';
	return null;
}

export const load: PageServerLoad = async ({ locals, request }) => {
	const env = getEnv();
	const locale = extractLocaleFromRequest(request);
	const processor = paymentProcessorForLocale(locale);

	const uid = locals.user ? String(locals.user.id) : '';
	const billing = uid ? getUserBilling(uid) : undefined;

	let currentTier: string | null = null;
	if (billing?.subscriptionTier) {
		currentTier = billing.subscriptionTier;
	} else if (billing?.priceId) {
		currentTier = tierFromStripePriceId(billing.priceId);
	} else if (billing?.lemonSqueezyVariantId) {
		currentTier = tierForVariantId(billing.lemonSqueezyVariantId) ?? null;
	}

	const plans = [
		{
			tier: 'basic' as const,
			priceId: envPrice('STRIPE_PRICE_BASIC'),
			lemonVariantId: envVariant('LEMON_VARIANT_BASIC'),
			title: 'Basic',
			description: 'Essential features for individuals getting started.'
		},
		{
			tier: 'pro' as const,
			priceId: envPrice('STRIPE_PRICE_PRO'),
			lemonVariantId: envVariant('LEMON_VARIANT_PRO'),
			title: 'Pro',
			description: 'Full power for growing teams and daily use.'
		},
		{
			tier: 'team' as const,
			priceId: envPrice('STRIPE_PRICE_TEAM'),
			lemonVariantId: envVariant('LEMON_VARIANT_TEAM'),
			title: 'Team',
			description: 'Scale with collaboration and priority support.'
		}
	];

	const hasStripePlan = plans.some((p) => Boolean(p.priceId));
	const hasLemonPlan = plans.some((p) => Boolean(p.lemonVariantId));

	return {
		locale,
		checkoutProcessor: processor,
		stripeCheckoutEnabled: env.STRIPE_ENABLED,
		lemonCheckoutEnabled: env.LEMON_SQUEEZY_ENABLED,
		hasStripePlan,
		hasLemonPlan,
		isLoggedIn: Boolean(locals.user),
		currentTier,
		plans
	};
};
