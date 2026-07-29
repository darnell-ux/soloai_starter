/**
 * Regression test for the production signup failure:
 *   Better Auth "SqliteError: no such table: user" on an empty/wiped auth DB.
 *
 * Builds a real Better Auth instance from the app's own schema options
 * (makeAuthOptions — the SvelteKit-free config the app also uses) against a fresh
 * temp SQLite file, so the tables created here are the tables the app relies on.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeAuthOptions } from './auth-options';

const SIGNUP = { email: 'seller@example.com', password: 'password12345', name: 'Seller' };
const dirs: string[] = [];

/** A Better Auth instance over a brand-new, empty on-disk SQLite DB. */
function freshAuth() {
	const dir = mkdtempSync(join(tmpdir(), 'auth-migrate-'));
	dirs.push(dir);
	const db = new Database(join(dir, 'auth.sqlite'));
	return betterAuth(makeAuthOptions(db));
}

afterEach(() => {
	while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe('Better Auth schema self-heal', () => {
	it('reproduces the prod failure: signup on an un-migrated empty DB throws "no such table"', async () => {
		const auth = freshAuth();
		await expect(auth.api.signUpEmail({ body: SIGNUP })).rejects.toThrow(/no such table/i);
	});

	it('self-heals: runMigrations() on an empty DB, then signup succeeds', async () => {
		const auth = freshAuth();
		const ctx = await auth.$context;
		await ctx.runMigrations(); // what ensureAuthSchema() calls at startup
		const res = await auth.api.signUpEmail({ body: SIGNUP });
		expect(res.user?.id ?? res.token).toBeTruthy();
	});

	it('is idempotent: running migrations twice is a safe no-op', async () => {
		const auth = freshAuth();
		const ctx = await auth.$context;
		await ctx.runMigrations();
		await ctx.runMigrations(); // must not throw on an already-migrated DB
		const res = await auth.api.signUpEmail({ body: SIGNUP });
		expect(res.user?.id ?? res.token).toBeTruthy();
	});
});
