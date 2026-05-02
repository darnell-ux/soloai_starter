import { getEnv } from '../env';
import { getUserBilling } from './billing-store';
import { getStripeOrThrow } from './client';

export type CreatePortalResult =
	| { ok: true; url: string }
	| { ok: false; reason: 'no_customer' | 'stripe_error' | 'unconfigured' };

export async function createCustomerPortalSession(
	userId: string,
	returnUrl: string
): Promise<CreatePortalResult> {
	const env = getEnv();
	if (!env.STRIPE_ENABLED) {
		return { ok: false, reason: 'unconfigured' };
	}
	const billing = getUserBilling(userId);
	const customerId = billing?.stripeCustomerId;
	if (!customerId) {
		return { ok: false, reason: 'no_customer' };
	}
	try {
		const stripe = getStripeOrThrow();
		const session = await stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: returnUrl
		});
		return { ok: true, url: session.url };
	} catch (e) {
		console.error('[stripe_portal]', { stage: 'create', kind: e instanceof Error ? e.name : 'unknown' });
		return { ok: false, reason: 'stripe_error' };
	}
}
