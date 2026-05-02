import { createHash } from 'node:crypto';
import type { LemonWebhookEnvelope } from '$lib/types/lemonsqueezy';
import {
	getUserBilling,
	markLemonWebhookProcessed,
	setUserBilling,
	wasLemonWebhookProcessed
} from '$lib/server/stripe/billing-store';
import type { UnifiedSubscriptionStatus } from '$lib/server/stripe/billing-store';
import { tierForVariantId } from './tier-variants';

function logLemon(stage: string, eventName: string, kind: string): void {
	console.error('[lemon_webhook]', { stage, eventName, kind });
}

function dedupeKeyFromRaw(rawBody: string): string {
	return createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

function readUserId(meta: unknown): string | undefined {
	if (!meta || typeof meta !== 'object') return undefined;
	const m = meta as Record<string, unknown>;
	const cd = m.custom_data;
	if (!cd || typeof cd !== 'object') return undefined;
	const c = cd as Record<string, unknown>;
	const u = c.user_id ?? c.userId;
	if (typeof u === 'string' && u.trim()) return u.trim();
	if (typeof u === 'number' && Number.isFinite(u)) return String(u);
	return undefined;
}

function readTier(meta: unknown): string | undefined {
	if (!meta || typeof meta !== 'object') return undefined;
	const m = meta as Record<string, unknown>;
	const cd = m.custom_data;
	if (!cd || typeof cd !== 'object') return undefined;
	const c = cd as Record<string, unknown>;
	const t = c.tier ?? c.plan;
	return typeof t === 'string' && t.trim() ? t.trim().toLowerCase() : undefined;
}

function strAttr(attrs: Record<string, unknown>, snake: string, camel?: string): string | undefined {
	const v = attrs[snake] ?? (camel ? attrs[camel] : undefined);
	if (typeof v === 'string' && v.length > 0) return v;
	if (typeof v === 'number' && Number.isFinite(v)) return String(v);
	return undefined;
}

function mapLemonStatus(raw: string | undefined): UnifiedSubscriptionStatus {
	switch (raw) {
		case 'active':
			return 'active';
		case 'on_trial':
			return 'on_trial';
		case 'past_due':
			return 'past_due';
		case 'cancelled':
			return 'cancelled';
		case 'expired':
			return 'expired';
		case 'paused':
			return 'paused';
		case 'unpaid':
			return 'unpaid';
		default:
			return 'unknown';
	}
}

function portalUrl(attrs: Record<string, unknown>): string | undefined {
	const urls = attrs.urls;
	if (!urls || typeof urls !== 'object') return undefined;
	const u = urls as Record<string, unknown>;
	const p = u.customer_portal ?? u.customerPortal;
	return typeof p === 'string' && p.startsWith('http') ? p : undefined;
}

function applySubscriptionPayload(
	userId: string,
	body: LemonWebhookEnvelope,
	attrs: Record<string, unknown>,
	meta: unknown,
	eventName: string
): void {
	const statusRaw = strAttr(attrs, 'status');
	const variantId = strAttr(attrs, 'variant_id', 'variantId');
	const tierMeta = readTier(meta);
	const tierFromVariant = tierForVariantId(variantId);
	const tier = tierMeta && ['basic', 'pro', 'team'].includes(tierMeta) ? tierMeta : tierFromVariant;

	const renews = strAttr(attrs, 'renews_at', 'renewsAt');
	const ends = strAttr(attrs, 'ends_at', 'endsAt');
	const subscriptionEndDate = ends || renews || undefined;

	const subFromAttrs = strAttr(attrs, 'subscription_id', 'subscriptionId');
	const subId =
		subFromAttrs ??
		(body.data?.type === 'subscriptions' && body.data?.id != null ? String(body.data.id) : undefined);

	const patch: Parameters<typeof setUserBilling>[1] = {
		subscriptionProvider: 'lemonsqueezy',
		subscriptionStatus: mapLemonStatus(statusRaw),
		status: mapLemonStatus(statusRaw),
		lemonSqueezyCustomerId: strAttr(attrs, 'customer_id', 'customerId'),
		lemonSqueezySubscriptionId: subId,
		lemonSqueezyOrderId: strAttr(attrs, 'order_id', 'orderId'),
		lemonSqueezyVariantId: variantId,
		...(tier ? { subscriptionTier: tier } : {}),
		...(subscriptionEndDate ? { subscriptionEndDate } : {}),
		...(portalUrl(attrs) ? { lemonCustomerPortalUrl: portalUrl(attrs) } : {})
	};

	if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
		patch.subscriptionStatus = eventName === 'subscription_expired' ? 'expired' : 'cancelled';
		patch.status = patch.subscriptionStatus;
	}
	if (eventName === 'subscription_paused') {
		patch.subscriptionStatus = 'paused';
		patch.status = 'paused';
	}
	if (eventName === 'subscription_payment_failed') {
		patch.subscriptionStatus = 'past_due';
		patch.status = 'past_due';
	}
	if (eventName === 'subscription_payment_success' || eventName === 'subscription_payment_recovered') {
		patch.subscriptionStatus = 'active';
		patch.status = 'active';
	}

	setUserBilling(userId, patch);
}

/**
 * Process verified Lemon Squeezy webhook body. Idempotent per raw body hash.
 */
export function handleLemonSqueezyWebhook(rawBody: string, body: LemonWebhookEnvelope): void {
	const key = dedupeKeyFromRaw(rawBody);
	if (wasLemonWebhookProcessed(key)) {
		logLemon('idempotent_skip', String(body.meta?.event_name ?? ''), 'duplicate');
		return;
	}

	const eventName = typeof body.meta?.event_name === 'string' ? body.meta.event_name : '';
	const userId = readUserId(body.meta);

	if (!eventName) {
		markLemonWebhookProcessed(key, 'unknown');
		return;
	}

	if (!userId) {
		logLemon('no_user', eventName, 'missing_custom_data');
		markLemonWebhookProcessed(key, eventName);
		return;
	}

	const attrs = body.data?.attributes;
	if (!attrs || typeof attrs !== 'object') {
		logLemon('no_attributes', eventName, body.data?.type ?? 'unknown_type');
		markLemonWebhookProcessed(key, eventName);
		return;
	}
	const attrRec = attrs as Record<string, unknown>;

	switch (eventName) {
		case 'subscription_created':
		case 'subscription_updated':
		case 'subscription_resumed':
		case 'subscription_unpaused':
		case 'subscription_cancelled':
		case 'subscription_expired':
		case 'subscription_paused':
		case 'subscription_payment_failed':
		case 'subscription_payment_success':
		case 'subscription_payment_recovered':
			applySubscriptionPayload(userId, body, attrRec, body.meta, eventName);
			break;
		case 'order_created': {
			const orderId = body.data?.id != null ? String(body.data.id) : strAttr(attrRec, 'identifier');
			if (orderId) {
				setUserBilling(userId, {
					subscriptionProvider: 'lemonsqueezy',
					lemonSqueezyOrderId: String(orderId)
				});
			}
			break;
		}
		default:
			logLemon('unhandled', eventName, body.data?.type ?? '');
	}

	markLemonWebhookProcessed(key, eventName);
}
