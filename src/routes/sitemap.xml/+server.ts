import { baseLocale, generateStaticLocalizedUrls, locales } from '$lib/paraglide/runtime';
import type { RequestHandler } from '@sveltejs/kit';

const INDEXABLE_PATHS = ['/', '/features', '/pricing', '/contact', '/privacy', '/terms'];

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function isHomePath(pathname: string): boolean {
	const p = pathname.replace(/\/$/, '') || '/';
	if (p === '/') return true;
	return locales.some((l) => l !== baseLocale && p === `/${l}`);
}

export const GET: RequestHandler = ({ url }) => {
	const origin = url.origin;
	const rows: string[] = [];

	for (const path of INDEXABLE_PATHS) {
		const localized = generateStaticLocalizedUrls([path]);

		for (const u of localized) {
			const loc = new URL(u.pathname, origin).href;
			const priority = isHomePath(u.pathname) ? '1.0' : '0.8';
			let inner = `<loc>${escapeXml(loc)}</loc>`;
			if (localized.length === locales.length) {
				for (let j = 0; j < locales.length; j++) {
					const locCode = locales[j];
					const locUrl = localized[j];
					if (locCode === undefined || locUrl === undefined) continue;
					const alt = new URL(locUrl.pathname, origin).href;
					inner += `<xhtml:link rel="alternate" hreflang="${escapeXml(locCode)}" href="${escapeXml(alt)}" />`;
				}
			}
			inner += `<changefreq>weekly</changefreq><priority>${priority}</priority>`;
			rows.push(`<url>${inner}</url>`);
		}
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
