import { baseLocale, locales } from '$lib/paraglide/runtime';
import type { RequestHandler } from '@sveltejs/kit';

const AUTH_SEGMENTS = ['login', 'signup', 'account', 'forgot-password'];

export const GET: RequestHandler = ({ url }) => {
	const origin = url.origin;
	const lines: string[] = ['User-agent: *', 'Allow: /', ''];

	for (const seg of AUTH_SEGMENTS) {
		lines.push(`Disallow: /${seg}`);
	}
	for (const locale of locales) {
		if (locale === baseLocale) continue;
		for (const seg of AUTH_SEGMENTS) {
			lines.push(`Disallow: /${locale}/${seg}`);
		}
	}

	lines.push('', `Sitemap: ${origin}/sitemap.xml`);

	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
