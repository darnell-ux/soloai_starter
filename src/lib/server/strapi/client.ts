import { getEnv } from '$lib/server/env';
import { getServerSecret } from '$lib/server/secrets';

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;

function strapiHeaders(): HeadersInit {
	const h: Record<string, string> = { Accept: 'application/json' };
	const token = getServerSecret('STRAPI_API_TOKEN');
	if (token) h.Authorization = `Bearer ${token}`;
	return h;
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * Official Strapi REST GET with bounded retries + timeout. Server-only; never leaks secrets.
 */
export async function strapiGetJson<T>(
	path: string,
	searchParams: Record<string, string | undefined>,
	options?: { timeoutMs?: number; retries?: number }
): Promise<T | null> {
	const env = getEnv();
	const base = env.STRAPI_API_URL.replace(/\/$/, '');
	const url = path.startsWith('http')
		? new URL(path)
		: new URL(path.replace(/^\//, ''), `${base}/`);
	for (const [k, v] of Object.entries(searchParams)) {
		if (v !== undefined) url.searchParams.set(k, v);
	}
	const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const retries = options?.retries ?? MAX_RETRIES;

	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			const res = await fetch(url, {
				headers: strapiHeaders(),
				signal: AbortSignal.timeout(timeoutMs)
			});
			if (!res.ok) {
				if (attempt < retries - 1 && (res.status >= 500 || res.status === 429)) {
					await sleep(100 * (attempt + 1));
					continue;
				}
				return null;
			}
			return (await res.json()) as T;
		} catch {
			if (attempt < retries - 1) {
				await sleep(100 * (attempt + 1));
				continue;
			}
			return null;
		}
	}
	return null;
}

export function strapiPublicOrigin(): string {
	return getEnv().PUBLIC_STRAPI_URL.replace(/\/$/, '');
}
