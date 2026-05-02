import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const BILLING_FILE = join(process.cwd(), 'data', 'stripe-billing.json');
const EVENTS_FILE = join(process.cwd(), 'data', 'stripe-webhook-events.json');
const LEMON_EVENTS_FILE = join(process.cwd(), 'data', 'lemon-webhook-events.json');

export type SubscriptionProvider = 'stripe' | 'lemonsqueezy';

/** Unified subscription lifecycle (Stripe + Lemon Squeezy). */
export type UnifiedSubscriptionStatus =
	| 'active'
	| 'trialing'
	| 'on_trial'
	| 'past_due'
	| 'canceled'
	| 'cancelled'
	| 'unpaid'
	| 'incomplete'
	| 'incomplete_expired'
	| 'paused'
	| 'expired'
	| 'unknown';

export type UserBilling = {
	/** @example cus_xxx */
	stripeCustomerId?: string;
	/** @example sub_xxx */
	stripeSubscriptionId?: string;
	/** Stripe price id when checkout was via Stripe */
	priceId?: string;
	/** Which provider last wrote subscription lifecycle fields */
	subscriptionProvider?: SubscriptionProvider;
	/** Canonical status for UI and access checks */
	subscriptionStatus?: UnifiedSubscriptionStatus;
	/** Plan tier key: basic | pro | team */
	subscriptionTier?: string;
	/** ISO 8601 renewal or end instant when known */
	subscriptionEndDate?: string;
	/** Lemon Squeezy customer id (numeric string) */
	lemonSqueezyCustomerId?: string;
	lemonSqueezySubscriptionId?: string;
	lemonSqueezyOrderId?: string;
	lemonSqueezyVariantId?: string;
	/** Signed customer portal URL from last subscription payload (short-lived) */
	lemonCustomerPortalUrl?: string;
	/** @deprecated Prefer subscriptionStatus; kept for Stripe webhook compatibility */
	status?: UnifiedSubscriptionStatus;
	updatedAt: string;
};

type BillingStoreShape = Record<string, UserBilling>;
type EventDedupeShape = Record<string, string>;

function readJsonFile<T>(path: string, empty: T): T {
	try {
		const raw = readFileSync(path, 'utf8');
		const j = JSON.parse(raw) as unknown;
		if (!j || typeof j !== 'object') return empty;
		return j as T;
	} catch {
		return empty;
	}
}

function writeJsonFile(path: string, data: unknown): void {
	const dir = dirname(path);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

export function getUserBilling(userId: string): UserBilling | undefined {
	const all = readJsonFile<BillingStoreShape>(BILLING_FILE, {});
	return all[userId];
}

export function setUserBilling(userId: string, partial: Partial<UserBilling>): void {
	const all = readJsonFile<BillingStoreShape>(BILLING_FILE, {});
	const cur = all[userId] ?? { updatedAt: new Date().toISOString() };
	const next: UserBilling = {
		...cur,
		...partial,
		updatedAt: new Date().toISOString()
	};
	all[userId] = next;
	writeJsonFile(BILLING_FILE, all);
}

export function wasWebhookProcessed(stripeEventId: string): boolean {
	const all = readJsonFile<EventDedupeShape>(EVENTS_FILE, {});
	return Boolean(all[stripeEventId]);
}

export function markWebhookProcessed(stripeEventId: string, eventType: string): void {
	const all = readJsonFile<EventDedupeShape>(EVENTS_FILE, {});
	if (all[stripeEventId]) return;
	all[stripeEventId] = eventType;
	writeJsonFile(EVENTS_FILE, all);
}

export function wasLemonWebhookProcessed(dedupeKey: string): boolean {
	const all = readJsonFile<EventDedupeShape>(LEMON_EVENTS_FILE, {});
	return Boolean(all[dedupeKey]);
}

export function markLemonWebhookProcessed(dedupeKey: string, eventName: string): void {
	const all = readJsonFile<EventDedupeShape>(LEMON_EVENTS_FILE, {});
	if (all[dedupeKey]) return;
	all[dedupeKey] = eventName;
	writeJsonFile(LEMON_EVENTS_FILE, all);
}
