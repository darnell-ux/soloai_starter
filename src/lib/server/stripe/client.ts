import Stripe from 'stripe';
import { getEnv } from '../env';

let instance: Stripe | null = null;

export function getStripeOrThrow(): Stripe {
	const e = getEnv();
	if (!e.STRIPE_ENABLED) {
		throw new Error('stripe_not_configured');
	}
	const key = process.env.STRIPE_SECRET_KEY?.trim();
	if (!key) {
		throw new Error('stripe_not_configured');
	}
	if (!instance) {
		instance = new Stripe(key, { typescript: true, maxNetworkRetries: 2 });
	}
	return instance;
}

export function getStripeWebhookSecretOrThrow(): string {
	getEnv();
	const s = process.env.STRIPE_WEBHOOK_SECRET?.trim();
	if (!s) throw new Error('stripe_not_configured');
	return s;
}
