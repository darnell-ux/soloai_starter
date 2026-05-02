#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const gitDir = resolve(root, '.git');

if (!existsSync(gitDir)) {
	process.exit(0);
}

let staged = '';
try {
	staged = execSync('git diff --cached --name-only', { encoding: 'utf8', cwd: root });
} catch {
	process.exit(0);
}

const blocked = staged
	.split('\n')
	.map((s) => s.trim())
	.filter(Boolean)
	.filter((f) => {
		const base = f.split('/').pop() ?? '';
		if (base.endsWith('.example')) return false;
		return /\.env($|\.)/i.test(base) || /\.(pem|p12|pfx|key)$/i.test(f);
	});

if (blocked.length > 0) {
	console.error('[check-secret-leaks] blocked staged files (use vault/CI injection, not git):');
	for (const f of blocked) console.error(`  - ${f}`);
	process.exit(1);
}

process.exit(0);
