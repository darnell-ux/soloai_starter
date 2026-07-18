import { localizeHref } from '$lib/paraglide/runtime';
import { publicLocales } from '$lib/i18n/locales';
import type { RequestHandler } from '@sveltejs/kit';

const INDEXABLE_PATHS = ['/', '/features', '/pricing', '/contact', '/privacy', '/terms'];

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export const GET: RequestHandler = ({ url }) => {
	const origin = url.origin;
	const rows: string[] = [];

	// Only advertise translated (public) locales — see $lib/i18n/locales.ts. This
	// avoids emitting hreflang/URLs for locales whose pages are English fallbacks.
	for (const path of INDEXABLE_PATHS) {
		for (const locale of publicLocales) {
			const loc = new URL(String(localizeHref(path, { locale })), origin).href;
			const priority = path === '/' ? '1.0' : '0.8';
			let inner = `<loc>${escapeXml(loc)}</loc>`;
			if (publicLocales.length > 1) {
				for (const alt of publicLocales) {
					const altHref = new URL(String(localizeHref(path, { locale: alt })), origin).href;
					inner += `<xhtml:link rel="alternate" hreflang="${escapeXml(alt)}" href="${escapeXml(altHref)}" />`;
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
