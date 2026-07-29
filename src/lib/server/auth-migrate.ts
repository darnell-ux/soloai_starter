import { building } from '$app/environment';
import { auth } from '$lib/auth';

let ready: Promise<void> | null = null;

/**
 * Self-healing Better Auth schema.
 *
 * On boot (and before the first auth request) ensure the auth tables exist. Uses
 * the public auth context's `runMigrations()`, which computes only the missing
 * tables/columns and applies them — so it's a no-op on a healthy database and
 * creates the full schema on an empty one (e.g. after a wiped volume).
 *
 * Memoized to run once per process; on failure the cache is cleared so the next
 * request retries rather than serving a permanently broken auth surface.
 */
export function ensureAuthSchema(): Promise<void> {
	// Never touch the database during `vite build` / prerender.
	if (building) return Promise.resolve();

	if (!ready) {
		ready = (async () => {
			const ctx = await auth.$context;
			await ctx.runMigrations();
			console.info('[auth] schema ensured (Better Auth migrations applied if needed)');
		})().catch((err) => {
			console.error('[auth] schema migration failed:', err);
			ready = null; // allow a retry on the next call
			throw err;
		});
	}
	return ready;
}
