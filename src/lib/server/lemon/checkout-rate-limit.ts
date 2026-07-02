import { rateLimit } from '$lib/server/rate-limiter';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

/**
 * Returns true if the caller should be rate-limited (429).
 *
 * Thin wrapper over the shared sliding-window limiter in `$lib/server/rate-limiter`
 * so there is a single implementation to maintain. The `checkout:` namespace keeps
 * these keys from colliding with other callers that share the limiter's bucket map.
 */
export function checkoutRateLimitHit(key: string): boolean {
	return rateLimit(`checkout:${key}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW }).limited;
}
