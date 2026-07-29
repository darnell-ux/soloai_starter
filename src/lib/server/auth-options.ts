import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { BetterAuthOptions } from 'better-auth';

const DEV_PLACEHOLDER_SECRET = 'dev-only-dev-only-dev-only-dev-only!!';

/** Resolve the Better Auth secret with the production length guard. */
export function resolveAuthSecret(): string {
	const secret =
		process.env.BETTER_AUTH_SECRET ??
		(process.env.NODE_ENV !== 'production' ? DEV_PLACEHOLDER_SECRET : '');
	if (!secret || secret.length < 32) {
		throw new Error('BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)');
	}
	return secret;
}

/**
 * Open the Better Auth SQLite database, creating its parent directory if needed.
 * Defaults to DATABASE_AUTH_PATH (the volume-mounted path in production).
 */
export function openAuthDatabase(
	dbPath: string = process.env.DATABASE_AUTH_PATH ?? './data/auth.sqlite'
): Database.Database {
	const dir = dirname(dbPath);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return new Database(dbPath);
}

/**
 * Schema- and behavior-defining Better Auth options, intentionally FREE of any
 * SvelteKit runtime imports (no `$app/server`, no cookies plugin) so they can be
 * reused by the startup migration runner ($lib/server/auth-migrate) and by tests.
 *
 * SvelteKit-specific wiring (the cookies plugin) and side-effect hooks (Mautic
 * lifecycle) are layered on top in $lib/auth.ts. None of those affect the DB
 * schema, so an auth instance built from these options migrates to the same
 * tables the app uses — which is what makes the regression test faithful.
 */
export function makeAuthOptions(database: Database.Database): BetterAuthOptions {
	return {
		baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',
		secret: resolveAuthSecret(),
		database,
		emailAndPassword: {
			enabled: true
		},
		user: {
			changeEmail: {
				enabled: true,
				updateEmailWithoutVerification: true
			}
		},
		trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()) ?? [
			'http://localhost:5173',
			'http://127.0.0.1:5173'
		]
	};
}
