#!/usr/bin/env node
/**
 * POST /api/translate — requires TRANSLATION_ENABLED, TRANSLATION_API_TOKEN, OPENAI_API_KEY on server.
 * Usage:
 *   TRANSLATION_API_TOKEN=... BASE_URL=http://localhost:5173 node scripts/verify-translation-route.mjs
 */
const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const token = process.env.TRANSLATION_API_TOKEN;
if (!token) {
	console.error('Set TRANSLATION_API_TOKEN');
	process.exit(1);
}

const body = {
	sourceLang: 'en',
	targetLang: 'es',
	fields: [
		{ key: 'a', value: '<p>Hello</p>' },
		{ key: 'b', value: 'Second line' }
	]
};

async function post(pair) {
	const r = await fetch(`${base}/api/translate`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ ...body, ...pair })
	});
	console.log('POST /api/translate', pair.targetLang, r.status);
	console.log((await r.text()).slice(0, 2000));
}

await post({ targetLang: 'es' });
await post({ targetLang: 'fr' });

const r2 = await fetch(`${base}/api/translate`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(body)
});
console.log('POST without auth', r2.status, '(expect 401)');
