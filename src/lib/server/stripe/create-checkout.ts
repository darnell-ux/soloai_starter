import { getEnv } from '../env';
import { getUserBilling, setUserBilling } from './billing-store';
import { getStripeOrThrow } from './client';
import { isAllowedPriceIdForCheckout } from './pricing';

function appendCheckoutSessionIdTemplate(successUrl: string): string {
	if (successUrl.includes('{CHECKOUT_SESSION_ID}')) return successUrl;
	return successUrl + (successUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}';
}

export type CreateSubscriptionCheckoutResult =
	| { ok: true; url: string }
	| { ok: false; reason: 'invalid_price' | 'stripe_error' | 'unconfigured' };

/**
 * @param userId app user id (Better Auth)
 */
export async function createSubscriptionCheckoutSession(
	userId: string,
	email: string,
	name: string | null | undefined,
	priceId: string
): Promise<CreateSubscriptionCheckoutResult> {
	const env = getEnv();
	if (!env.STRIPE_ENABLED || !env.STRIPE_SUCCESS_URL || !env.STRIPE_CANCEL_URL) {
		return { ok: false, reason: 'unconfigured' };
	}
	if (!isAllowedPriceIdForCheckout(priceId)) {
		return { ok: false, reason: 'invalid_price' };
	}

	const stripe = getStripeOrThrow();
	const existing = getUserBilling(userId);
	let customerId = existing?.stripeCustomerId;

	try {
		if (customerId) {
			try {
				await stripe.customers.retrieve(customerId);
			} catch {
				customerId = undefined;
			}
		}
		if (!customerId) {
			const c = await stripe.customers.create({
				email,
				name: name && name.trim() ? name.trim() : undefined,
				metadata: { userId }
			});
			customerId = c.id;
			setUserBilling(userId, { stripeCustomerId: customerId });
		}

		const session = await stripe.checkout.sessions.create(
			{
				mode: 'subscription',
				customer: customerId,
				client_reference_id: userId,
				line_items: [{ price: priceId, quantity: 1 }],
				success_url: appendCheckoutSessionIdTemplate(env.STRIPE_SUCCESS_URL!),
				cancel_url: env.STRIPE_CANCEL_URL!,
				metadata: { userId },
				subscription_data: {
					metadata: { userId }
				}
			},
			{ idempotencyKey: `co_${userId}_${priceId}_${Date.now()}`.slice(0, 256) }
		);
		if (!session.url) {
			return { ok: false, reason: 'stripe_error' };
		}
		return { ok: true, url: session.url };
	} catch (e) {
		console.error('[stripe_checkout]', { stage: 'create', kind: e instanceof Error ? e.name : 'unknown' });
		return { ok: false, reason: 'stripe_error' };
	}
}

/** Hosted Stripe Checkout without linking to an app user (marketing/demo flows). */
export async function createAnonymousStripeSubscriptionCheckout(
	priceId: string
): Promise<CreateSubscriptionCheckoutResult> {
	const env = getEnv();
	if (!env.STRIPE_ENABLED || !env.STRIPE_SUCCESS_URL || !env.STRIPE_CANCEL_URL) {
		return { ok: false, reason: 'unconfigured' };
	}
	if (!isAllowedPriceIdForCheckout(priceId)) {
		return { ok: false, reason: 'invalid_price' };
	}
	try {
		const stripe = getStripeOrThrow();
		const session = await stripe.checkout.sessions.create({
			mode: 'subscription',
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: appendCheckoutSessionIdTemplate(env.STRIPE_SUCCESS_URL!),
			cancel_url: env.STRIPE_CANCEL_URL!,
			metadata: { source: 'taxnexus_demo' }
		});
		if (!session.url) {
			return { ok: false, reason: 'stripe_error' };
		}
		return { ok: true, url: session.url };
	} catch (e) {
		console.error('[stripe_checkout]', { stage: 'anonymous_create', kind: e instanceof Error ? e.name : 'unknown' });
		return { ok: false, reason: 'stripe_error' };
	}
}
