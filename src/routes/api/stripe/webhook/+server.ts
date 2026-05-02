import { error, text } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getEnv } from '$lib/server/env';
import { getStripeWebhookSecretOrThrow } from '$lib/server/stripe/client';
import { handleStripeEvent } from '$lib/server/stripe/webhook-dispatch';
import Stripe from 'stripe';

export const config = {
	csrf: {
		checkOrigin: false
	}
};

export const POST: RequestHandler = async ({ request }) => {
	if (!getEnv().STRIPE_ENABLED) {
		throw error(503, { message: 'stripe_unconfigured' });
	}
	const raw = await request.text();
	const sig = request.headers.get('stripe-signature');
	if (!sig) {
		throw error(400, { message: 'missing_signature' });
	}
	let event: Stripe.Event;
	try {
		const secret = getStripeWebhookSecretOrThrow();
		event = Stripe.webhooks.constructEvent(raw, sig, secret);
	} catch {
		throw error(400, { message: 'invalid_signature' });
	}
	try {
		handleStripeEvent(event);
	} catch (e) {
		console.error('[stripe_webhook]', { stage: 'handler', kind: e instanceof Error ? e.name : 'unknown' });
		throw error(500, { message: 'webhook_handler_failed' });
	}
	return text('', { status: 200 });
};
