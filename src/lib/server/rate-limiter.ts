/**
 * In-memory sliding-window rate limiter (single-process).
 *
 * Suitable for one adapter-node instance on the Hostinger KVM2. If the app is
 * ever scaled horizontally, swap the backing Map for a shared store (Redis).
 * Generalises the pattern in `lemon/checkout-rate-limit.ts` and returns
 * metadata so callers can emit `Retry-After` / `X-RateLimit-*` headers.
 *
 * Server-only: keeps its state in module memory. Never import from client code.
 */

export interface RateLimitResult {
	/** True when the caller has exceeded the window and should receive a 429. */
	limited: boolean;
	/** Requests remaining in the current window (0 when limited). */
	remaining: number;
	/** Configured maximum per window. */
	limit: number;
	/** Milliseconds until the oldest hit ages out (0 when not limited). */
	retryAfterMs: number;
}

export interface RateLimitOptions {
	/** Window length in milliseconds. Default 60_000 (1 minute). */
	windowMs?: number;
	/** Maximum requests allowed per window. Default 10. */
	max?: number;
}

const buckets = new Map<string, number[]>();

// Housekeeping: periodically drop empty/expired buckets so the Map does not
// grow unbounded with one-off keys (e.g. transient IPs).
const SWEEP_EVERY = 1_000;
let callsSinceSweep = 0;

function sweep(now: number, windowMs: number): void {
	for (const [key, stamps] of buckets) {
		const kept = stamps.filter((t) => now - t < windowMs);
		if (kept.length === 0) buckets.delete(key);
		else buckets.set(key, kept);
	}
}

/**
 * Record a hit for `key` and report whether it should be rate-limited.
 * Call once per inbound request.
 */
export function rateLimit(key: string, opts: RateLimitOptions = {}): RateLimitResult {
	const windowMs = opts.windowMs ?? 60_000;
	const max = opts.max ?? 10;
	const now = Date.now();

	if (++callsSinceSweep >= SWEEP_EVERY) {
		callsSinceSweep = 0;
		sweep(now, windowMs);
	}

	const prev = buckets.get(key) ?? [];
	const stamps = prev.filter((t) => now - t < windowMs);

	if (stamps.length >= max) {
		buckets.set(key, stamps);
		const oldest = stamps[0] ?? now;
		return {
			limited: true,
			remaining: 0,
			limit: max,
			retryAfterMs: Math.max(0, windowMs - (now - oldest))
		};
	}

	stamps.push(now);
	buckets.set(key, stamps);
	return {
		limited: false,
		remaining: Math.max(0, max - stamps.length),
		limit: max,
		retryAfterMs: 0
	};
}

/** Test/maintenance helper: clear all rate-limit state. */
export function resetRateLimiter(): void {
	buckets.clear();
	callsSinceSweep = 0;
}
