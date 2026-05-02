#!/usr/bin/env node
/**
 * PG03: compare Strapi locale responses (STRAPI_API_URL or STRAPI_BASE_URL).
 */
const base = (process.env.STRAPI_API_URL || process.env.STRAPI_BASE_URL || 'http://localhost:1337').replace(
	/\/$/,
	''
);
const token = process.env.STRAPI_API_TOKEN;
const headers = { Accept: 'application/json' };
if (token) headers.Authorization = `Bearer ${token}`;

async function countLanding(locale) {
	const u = new URL(`${base}/api/landing-pages`);
	u.searchParams.set('locale', locale);
	u.searchParams.set('publicationState', 'live');
	u.searchParams.set('pagination[pageSize]', '1');
	u.searchParams.set('filters[slug][$eq]', 'homepage');
	const r = await fetch(u, { headers });
	if (!r.ok) return { status: r.status, n: -1 };
	const j = await r.json();
	return { status: r.status, n: Array.isArray(j.data) ? j.data.length : 0 };
}

async function countCollection(path, locale) {
	const u = new URL(`${base}${path}`);
	u.searchParams.set('locale', locale);
	u.searchParams.set('publicationState', 'live');
	u.searchParams.set('pagination[pageSize]', '50');
	const r = await fetch(u, { headers });
	if (!r.ok) return { status: r.status, n: -1 };
	const j = await r.json();
	return { status: r.status, n: Array.isArray(j.data) ? j.data.length : 0 };
}

const [len, les] = await Promise.all([countLanding('en'), countLanding('es')]);
console.log('landing homepage en', len, 'es', les);
const [fen, fes] = await Promise.all([
	countCollection('/api/features', 'en'),
	countCollection('/api/features', 'es')
]);
console.log('features en', fen, 'es', fes);
const [qen, qes] = await Promise.all([
	countCollection('/api/faqs', 'en'),
	countCollection('/api/faqs', 'es')
]);
console.log('faqs en', qen, 'es', qes);
