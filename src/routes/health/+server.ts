import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openAuthDatabase } from '$lib/server/auth-options';

/**
 * Liveness/readiness probe for uptime monitors, the release workflow, and load
 * balancers. Contract: **always HTTP 200** with a JSON body — never 500 — so a
 * degraded dependency surfaces in the payload (`services.*` + top-level `status`)
 * instead of tripping a naive `-I` check into a hard failure.
 *
 * Version is pinned to the release tag; bump it alongside package.json on release.
 *
 * Database check: a trivial `SELECT 1` against the app's real datastore — the
 * Better Auth SQLite database (better-sqlite3). The SvelteKit app has no MySQL
 * client; MySQL belongs to Strapi/Mautic. Checking SQLite verifies the store the
 * app actually reads/writes on every authenticated request.
 */
const APP_VERSION = '1.0.0';

function checkDatabase(): 'ok' | 'degraded' {
	let db: ReturnType<typeof openAuthDatabase> | undefined;
	try {
		db = openAuthDatabase();
		const row = db.prepare('SELECT 1 AS ok').get() as { ok?: number } | undefined;
		return row?.ok === 1 ? 'ok' : 'degraded';
	} catch {
		// Never propagate — a dead DB must not turn the probe into a 500.
		return 'degraded';
	} finally {
		try {
			db?.close();
		} catch {
			/* ignore close errors */
		}
	}
}

export const GET: RequestHandler = () => {
	const database = checkDatabase();
	const status = database === 'ok' ? 'ok' : 'degraded';

	return json(
		{
			status,
			version: APP_VERSION,
			timestamp: new Date().toISOString(),
			services: {
				app: 'ok',
				database
			}
		},
		{
			status: 200,
			headers: {
				// Probes must never be served from a cache.
				'cache-control': 'no-store'
			}
		}
	);
};

// Health must be evaluated per-request, never prerendered to a static asset.
export const prerender = false;
