import type Stripe from 'stripe';
import { getUserBilling, setUserBilling, wasWebhookProcessed, markWebhookProcessed } from './billing-store';

function logStripeHandler(stage: string, eventId: string, kind: string): void {
	console.error('[stripe_webhook]', { stage, eventId, kind });
}

function subscriptionStatus(
	sub: Stripe.Subscription
):
	| 'active'
	| 'trialing'
	| 'past_due'
	| 'canceled'
	| 'unpaid'
	| 'incomplete'
	| 'incomplete_expired'
	| 'paused'
	| 'unknown' {
	const s = sub.status;
	if (s === 'active') return 'active';
	if (s === 'trialing') return 'trialing';
	if (s === 'past_due') return 'past_due';
	if (s === 'canceled') return 'canceled';
	if (s === 'unpaid') return 'unpaid';
	if (s === 'incomplete') return 'incomplete';
	if (s === 'incomplete_expired') return 'incomplete_expired';
	if (s === 'paused') return 'paused';
	return 'unknown';
}

export function handleStripeEvent(event: Stripe.Event): void {
	if (wasWebhookProcessed(event.id)) {
		logStripeHandler('idempotent_skip', event.id, event.type);
		return;
	}

	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session;
			const userId = session.client_reference_id || session.metadata?.userId;
			if (!userId || typeof userId !== 'string') {
				logStripeHandler('no_user', event.id, event.type);
				markWebhookProcessed(event.id, event.type);
				return;
			}
			const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
			const subId =
				typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
			if (customerId) {
				setUserBilling(userId, {
					subscriptionProvider: 'stripe',
					stripeCustomerId: customerId,
					...(subId
						? {
								stripeSubscriptionId: subId,
								status: 'active',
								subscriptionStatus: 'active'
							}
						: {})
				});
			}
			markWebhookProcessed(event.id, event.type);
			return;
		}
		case 'customer.subscription.created':
		case 'customer.subscription.updated': {
			const sub = event.data.object as Stripe.Subscription;
			const userId = sub.metadata?.userId;
			if (!userId) {
				logStripeHandler('no_user', event.id, event.type);
				markWebhookProcessed(event.id, event.type);
				return;
			}
			const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
			const item = sub.items.data[0];
			const priceId = item?.price?.id;
			const st = subscriptionStatus(sub);
			setUserBilling(userId, {
				subscriptionProvider: 'stripe',
				stripeCustomerId: customerId,
				stripeSubscriptionId: sub.id,
				status: st,
				subscriptionStatus: st,
				...(priceId ? { priceId } : {})
			});
			markWebhookProcessed(event.id, event.type);
			return;
		}
		case 'customer.subscription.deleted': {
			const sub = event.data.object as Stripe.Subscription;
			const userId = sub.metadata?.userId;
			if (!userId) {
				markWebhookProcessed(event.id, event.type);
				return;
			}
			const cur = getUserBilling(userId);
			setUserBilling(userId, {
				...cur,
				stripeSubscriptionId: sub.id,
				status: 'canceled',
				subscriptionStatus: 'canceled',
				subscriptionProvider: 'stripe'
			});
			markWebhookProcessed(event.id, event.type);
			return;
		}
		case 'invoice.paid':
		case 'invoice.payment_failed': {
			logStripeHandler('ack', event.id, event.type);
			markWebhookProcessed(event.id, event.type);
			return;
		}
		default: {
			logStripeHandler('unhandled', event.id, event.type);
			markWebhookProcessed(event.id, event.type);
		}
	}
}
