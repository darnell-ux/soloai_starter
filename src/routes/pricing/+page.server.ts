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

/**
 * Optional display price (base monthly USD) shown in-app before checkout, e.g.
 * `PRICE_BASIC_USD=29`. Purely for display — the actual charge comes from the
 * Stripe price / Lemon variant. Left unset → the card shows "Pricing shown at
 * checkout" rather than a fabricated number.
 */
function envAmount(key: string): number | null {
	const v = process.env[key]?.trim();
	if (!v) return null;
	const n = Number.parseFloat(v);
	return Number.isFinite(n) && n >= 0 ? n : null;
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
			description: 'Essential features for individuals getting started.',
			amountUsd: envAmount('PRICE_BASIC_USD'),
			interval: 'month' as const
		},
		{
			tier: 'pro' as const,
			priceId: envPrice('STRIPE_PRICE_PRO'),
			lemonVariantId: envVariant('LEMON_VARIANT_PRO'),
			title: 'Pro',
			description: 'Full power for growing teams and daily use.',
			amountUsd: envAmount('PRICE_PRO_USD'),
			interval: 'month' as const
		},
		{
			tier: 'team' as const,
			priceId: envPrice('STRIPE_PRICE_TEAM'),
			lemonVariantId: envVariant('LEMON_VARIANT_TEAM'),
			title: 'Team',
			description: 'Scale with collaboration and priority support.',
			amountUsd: envAmount('PRICE_TEAM_USD'),
			interval: 'month' as const
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
