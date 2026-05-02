#!/usr/bin/env node
/**
 * POST /api/webhooks/translate-content — Bearer STRAPI_WEBHOOK_SECRET when set.
 * GET /api/translation/status/:jobId
 * Local tunnel: npx localtunnel --port 5173 (use printed URL as Strapi webhook target base).
 *
 * Usage:
 *   BASE_URL=http://localhost:5173 STRAPI_WEBHOOK_SECRET=... node scripts/verify-webhook-localization.mjs
 */
const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const secret = process.env.STRAPI_WEBHOOK_SECRET || '';

const webhook = {
	event: 'entry.update',
	model: 'api::landing-page.landing-page',
	entry: {
		id: 1,
		attributes: {
			locale: 'en',
			heroTitle: 'Hello',
			heroSubtitle: 'Sub',
			heroDescription: '<p>Hi</p>',
			primaryCta: { label: 'Go' },
			seo: { metaTitle: 'T', metaDescription: 'D' }
		}
	}
};

async function main() {
	const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
	if (secret) headers.Authorization = `Bearer ${secret}`;
	const r = await fetch(`${base}/api/webhooks/translate-content`, {
		method: 'POST',
		headers,
		body: JSON.stringify(webhook)
	});
	const t = await r.text();
	console.log('POST', r.status, t.slice(0, 800));
	let jobId;
	try {
		const j = JSON.parse(t);
		jobId = j.jobId;
	} catch {
		// ignore
	}
	if (jobId) {
		await new Promise((res) => setTimeout(res, 400));
		const r2 = await fetch(`${base}/api/translation/status/${jobId}`);
		console.log('GET status', r2.status, (await r2.text()).slice(0, 400));
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
