#!/usr/bin/env node
/**
 * Minimal checks: public GET vs unauthenticated write.
 * Usage: STRAPI_API_URL=http://localhost:1337 node scripts/verify-strapi-public.mjs
 */
const base = (process.env.STRAPI_API_URL || process.env.STRAPI_BASE_URL || 'http://localhost:1337').replace(
	/\/$/,
	''
);

async function main() {
	const getUrls = [`${base}/api/landing-pages`, `${base}/api/features`, `${base}/api/faqs`];
	for (const u of getUrls) {
		const r = await fetch(u, { method: 'GET', headers: { Accept: 'application/json' } });
		console.log('GET', u, r.status);
	}
	const postUrl = `${base}/api/landing-pages`;
	const r2 = await fetch(postUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({ data: { title: 'x', slug: 'should-fail' } })
	});
	console.log('POST', postUrl, r2.status, '(expect 401 or 403)');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
