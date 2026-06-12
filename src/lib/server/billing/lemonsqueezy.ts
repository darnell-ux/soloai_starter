/**
 * LS02 — Lemon Squeezy billing (Merchant of Record for non-`en` locales).
 * Server-only; API keys never exposed to the client.
 */
import { getServerConfig } from '$lib/server/config';
import { LEMON_SQUEEZY_API_BASE } from '$lib/server/lemon/constants';
import {
	getLemonSqueezyApiKeyOrThrow,
	getLemonSqueezyStoreIdOrThrow,
	getLemonSqueezyWebhookSecretOrThrow,
	lemonSqueezyConfigured
} from '$lib/server/lemon/config';
import { ensureLemonSqueezySdk } from '$lib/server/lemon/sdk';

export type { LemonCheckoutInput } from '$lib/server/lemon/create-checkout-session';
export { createLemonHostedCheckout } from '$lib/server/lemon/create-checkout-session';
export { ensureLemonSqueezySdk };

export function isLemonSqueezyEnabled(): boolean {
	return lemonSqueezyConfigured();
}

/** `sandbox` → Lemon test mode; `production` → live checkout. */
export function isLemonSqueezyTestMode(): boolean {
	const cfg = getServerConfig();
	return cfg.LEMON_SQUEEZY_ENVIRONMENT === 'sandbox';
}

export function getLemonSqueezyStoreId(): string {
	return getLemonSqueezyStoreIdOrThrow();
}

export function getLemonSqueezyWebhookSecret(): string {
	return getLemonSqueezyWebhookSecretOrThrow();
}

/**
 * Lightweight authenticated ping (GET /users/me). Does not log credentials.
 */
export async function verifyLemonSqueezyApiAccess(
	signal?: AbortSignal
): Promise<{ ok: true } | { ok: false }> {
	if (!isLemonSqueezyEnabled()) return { ok: false };
	let key: string;
	try {
		key = getLemonSqueezyApiKeyOrThrow();
	} catch {
		return { ok: false };
	}
	try {
		const res = await fetch(`${LEMON_SQUEEZY_API_BASE}/users/me`, {
			method: 'GET',
			headers: {
				Accept: 'application/vnd.api+json',
				Authorization: `Bearer ${key}`
			},
			signal: signal ?? AbortSignal.timeout(30_000)
		});
		return res.ok ? { ok: true } : { ok: false };
	} catch {
		return { ok: false };
	}
}
