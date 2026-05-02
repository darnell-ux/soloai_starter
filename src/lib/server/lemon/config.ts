import { getEnv } from '../env';
import { LEMON_SQUEEZY_API_BASE } from './constants';

export function lemonSqueezyConfigured(): boolean {
	return getEnv().LEMON_SQUEEZY_ENABLED === true;
}

export function getLemonSqueezyApiKeyOrThrow(): string {
	getEnv();
	const k = process.env.LEMON_SQUEEZY_API_KEY?.trim();
	if (!k) throw new Error('lemon_not_configured');
	return k;
}

export function getLemonSqueezyWebhookSecretOrThrow(): string {
	getEnv();
	const s = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
	if (!s) throw new Error('lemon_not_configured');
	return s;
}

export function getLemonSqueezyStoreIdOrThrow(): string {
	const e = getEnv();
	const id = e.LEMON_SQUEEZY_STORE_ID?.trim();
	if (!id) throw new Error('lemon_not_configured');
	return id;
}

/**
 * Lightweight authenticated ping (≤ typical timeout budgets). Uses GET /users/me.
 */
export async function verifyLemonSqueezyApiAccess(signal?: AbortSignal): Promise<{ ok: true } | { ok: false }> {
	if (!lemonSqueezyConfigured()) return { ok: false };
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
		if (!res.ok) return { ok: false };
		return { ok: true };
	} catch {
		return { ok: false };
	}
}
