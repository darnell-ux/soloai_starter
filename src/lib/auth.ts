import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import Database from 'better-sqlite3';
import { getRequestEvent } from '$app/server';
import { onAuthUserCreated } from '$lib/server/mautic/lifecycle';

const DEV_PLACEHOLDER_SECRET = 'dev-only-dev-only-dev-only-dev-only!!';

const secret =
	process.env.BETTER_AUTH_SECRET ??
	(process.env.NODE_ENV !== 'production' ? DEV_PLACEHOLDER_SECRET : '');

if (!secret || secret.length < 32) {
	throw new Error('BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)');
}

const dbPath = process.env.DATABASE_AUTH_PATH ?? './data/auth.sqlite';
const dir = dirname(dbPath);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',
	secret,
	database: new Database(dbPath),
	emailAndPassword: {
		enabled: true
	},
	user: {
		changeEmail: {
			enabled: true,
			updateEmailWithoutVerification: true
		}
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					onAuthUserCreated(user);
				}
			}
		}
	},
	trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()) ?? [
		'http://localhost:5173',
		'http://127.0.0.1:5173'
	],
	plugins: [sveltekitCookies(getRequestEvent)]
});
