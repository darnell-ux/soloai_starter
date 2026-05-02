#!/usr/bin/env node
/**
 * Read-only: GET published landing, features, faqs. STRAPI_API_URL (or legacy STRAPI_BASE_URL); STRAPI_API_TOKEN if API is protected.
 */
const base = (process.env.STRAPI_API_URL || process.env.STRAPI_BASE_URL || 'http://localhost:1337').replace(
	/\/$/,
	''
);
const token = process.env.STRAPI_API_TOKEN;
const headers = { Accept: 'application/json' };
if (token) headers.Authorization = `Bearer ${token}`;

const lp = new URL(`${base}/api/landing-pages`);
lp.searchParams.set('locale', 'en');
lp.searchParams.set('publicationState', 'live');
lp.searchParams.set('filters[slug][$eq]', 'homepage');
lp.searchParams.set('pagination[pageSize]', '1');

const ft = new URL(`${base}/api/features`);
ft.searchParams.set('locale', 'en');
ft.searchParams.set('publicationState', 'live');
ft.searchParams.set('sort[0]', 'priority:asc');
ft.searchParams.set('pagination[pageSize]', '10');

const fq = new URL(`${base}/api/faqs`);
fq.searchParams.set('locale', 'en');
fq.searchParams.set('publicationState', 'live');
fq.searchParams.set('sort[0]', 'sortOrder:asc');
fq.searchParams.set('pagination[pageSize]', '20');

const r1 = await fetch(lp, { headers });
const r2 = await fetch(ft, { headers });
const r3 = await fetch(fq, { headers });
console.log('landing-pages', r1.status, r1.ok ? 'ok' : 'fail');
console.log('features', r2.status, r2.ok ? 'ok' : 'fail');
console.log('faqs', r3.status, r3.ok ? 'ok' : 'fail');
if (r1.ok) console.log(JSON.stringify(await r1.json(), null, 0).slice(0, 1500));
if (r2.ok) console.log('feature count', (await r2.json()).data?.length ?? 0);
if (r3.ok) console.log('faq count', (await r3.json()).data?.length ?? 0);
