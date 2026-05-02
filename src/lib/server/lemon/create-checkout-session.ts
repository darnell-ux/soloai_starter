import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { getEnv } from '../env';
import { getLemonSqueezyStoreIdOrThrow } from './config';
import { ensureLemonSqueezySdk } from './sdk';

export type LemonCheckoutInput = {
	variantId: string;
	email?: string;
	name?: string;
	/** Merged into checkout `custom` (appears on webhooks as `meta.custom_data`). */
	customData?: Record<string, string | number | boolean | null>;
};

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function checkoutUrlFromResponse(data: unknown): string | undefined {
	if (!data || typeof data !== 'object') return undefined;
	const root = data as { data?: { attributes?: { url?: string } } };
	const url = root.data?.attributes?.url;
	return typeof url === 'string' && url.startsWith('http') ? url : undefined;
}

/**
 * Hosted Lemon Squeezy checkout (server-only). Uses official SDK + bounded retries on 429/5xx.
 */
export async function createLemonHostedCheckout(
	input: LemonCheckoutInput
): Promise<{ ok: true; url: string } | { ok: false; reason: 'api_error' }> {
	const env = getEnv();
	if (!env.LEMON_SQUEEZY_ENABLED || !env.LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL || !env.LEMON_SQUEEZY_CHECKOUT_CANCEL_URL) {
		return { ok: false, reason: 'api_error' };
	}
	const vid = input.variantId.trim();
	if (!/^\d+$/.test(vid)) {
		return { ok: false, reason: 'api_error' };
	}

	ensureLemonSqueezySdk();
	const storeId = getLemonSqueezyStoreIdOrThrow();
	const testMode = env.LEMON_SQUEEZY_ENVIRONMENT === 'sandbox';

	const custom: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(input.customData ?? {})) {
		if (v !== undefined && v !== null) custom[k] = v;
	}
	custom.app_cancel_url = env.LEMON_SQUEEZY_CHECKOUT_CANCEL_URL;

	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const res = await createCheckout(storeId, vid, {
				checkoutOptions: { embed: false },
				productOptions: {
					redirectUrl: env.LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL
				},
				checkoutData: {
					...(input.email ? { email: input.email } : {}),
					...(input.name ? { name: input.name } : {}),
					custom
				},
				testMode
			});

			if (!res.error && res.data) {
				const url = checkoutUrlFromResponse(res.data);
				if (url) return { ok: true, url };
			}

			const sc = res.statusCode ?? 0;
			if (sc === 429 || (sc >= 500 && sc <= 599)) {
				await sleep(250 * (attempt + 1));
				continue;
			}
			console.error('[lemon_checkout]', { stage: 'sdk', attempt: String(attempt), kind: 'provider_error' });
			return { ok: false, reason: 'api_error' };
		} catch {
			await sleep(200 * (attempt + 1));
		}
	}
	return { ok: false, reason: 'api_error' };
}
