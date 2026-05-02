const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function prune(now: number, stamps: number[]): number[] {
	return stamps.filter((t) => now - t < WINDOW_MS);
}

/** Returns true if caller should be rate-limited (429). */
export function checkoutRateLimitHit(key: string): boolean {
	const now = Date.now();
	const prev = hits.get(key) ?? [];
	const next = prune(now, prev);
	if (next.length >= MAX_PER_WINDOW) {
		hits.set(key, next);
		return true;
	}
	next.push(now);
	hits.set(key, next);
	return false;
}
