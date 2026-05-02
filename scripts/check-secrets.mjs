#!/usr/bin/env node
/**
 * Lightweight leak guard: fails on tracked env material and obvious key blobs.
 * Does not print matched secret content.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let files;
try {
	files = execSync('git ls-files', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
		.trim()
		.split('\n')
		.filter(Boolean);
} catch {
	console.error('[check-secrets] not a git repository or git unavailable');
	process.exit(1);
}

const problems = [];

for (const f of files) {
	if (f === '.env' || (f.startsWith('.env.') && !f.endsWith('.example'))) {
		problems.push(`tracked env file: ${f}`);
		continue;
	}
	if (!/\.(ts|tsx|js|mjs|cjs|svelte|md|json|yml|yaml|toml|sh|env\.example)$/.test(f)) continue;
	let text;
	try {
		text = readFileSync(f, 'utf8');
	} catch {
		continue;
	}
	if (/BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/.test(text)) {
		problems.push(`possible private key material: ${f}`);
	}
	if (/\bsk-(live|test|proj)-[A-Za-z0-9]{10,}/.test(text)) {
		problems.push(`possible API key token pattern: ${f}`);
	}
}

if (problems.length) {
	console.error('[check-secrets] failed — address before push:');
	for (const p of problems) console.error(`  - ${p}`);
	process.exit(1);
}
process.exit(0);
