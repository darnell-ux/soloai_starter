/**
 * Signup attribution must survive into the user row.
 *
 * The chain it protects: the Nexus Alert extension sends people to
 * /trial?source=chrome_extension, /trial carries that into /signup, and signup
 * writes it here. LAUNCH-CHECKLIST.md commits to measuring revenue per install
 * and the lifetime value of extension-origin customers — none of which is
 * possible if the column does not exist or the value does not land.
 *
 * Builds a real Better Auth instance from the app's own schema options against
 * a fresh temp SQLite file, so the columns asserted here are the columns the
 * app relies on.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeAuthOptions } from './auth-options';
import { normalizeSignupAttribution } from '../attribution';

const dirs: string[] = [];

function freshDb() {
	const dir = mkdtempSync(join(tmpdir(), 'auth-attribution-'));
	dirs.push(dir);
	return new Database(join(dir, 'auth.sqlite'));
}

afterEach(() => {
	while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe('signup attribution schema', () => {
	it('creates the attribution columns on a fresh database', async () => {
		const db = freshDb();
		const auth = betterAuth(makeAuthOptions(db));
		await (await auth.$context).runMigrations();

		const columns = db
			.prepare("SELECT name FROM pragma_table_info('user')")
			.all()
			.map((r) => (r as { name: string }).name);

		expect(columns).toContain('signupSource');
		expect(columns).toContain('signupAlertLevel');
	});

	it('persists an extension-originated signup onto the user row', async () => {
		const db = freshDb();
		const auth = betterAuth(makeAuthOptions(db));
		await (await auth.$context).runMigrations();

		await auth.api.signUpEmail({
			body: {
				email: 'seller@example.com',
				password: 'password12345',
				name: 'Seller',
				// What /signup sends after /trial hands attribution over.
				...normalizeSignupAttribution({
					signupSource: 'chrome_extension',
					signupAlertLevel: 'high'
				})
			} as Parameters<typeof auth.api.signUpEmail>[0]['body']
		});

		const row = db
			.prepare('SELECT signupSource, signupAlertLevel FROM user WHERE email = ?')
			.get('seller@example.com') as { signupSource: string; signupAlertLevel: string };

		expect(row.signupSource).toBe('chrome_extension');
		expect(row.signupAlertLevel).toBe('high');
	});

	it('defaults an organic signup rather than leaving the column null', async () => {
		const db = freshDb();
		const auth = betterAuth(makeAuthOptions(db));
		await (await auth.$context).runMigrations();

		await auth.api.signUpEmail({
			body: { email: 'organic@example.com', password: 'password12345', name: 'Organic' }
		});

		const row = db
			.prepare('SELECT signupSource, signupAlertLevel FROM user WHERE email = ?')
			.get('organic@example.com') as { signupSource: string; signupAlertLevel: string };

		// A null here would be indistinguishable from "we forgot to record it".
		expect(row.signupSource).toBe('web');
		expect(row.signupAlertLevel).toBe('none');
	});
});
