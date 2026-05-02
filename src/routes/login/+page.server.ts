import { extractLocaleFromRequest, localizeHref } from '$lib/paraglide/runtime';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function safeRedirectPath(raw: string | null): string {
	if (!raw || raw.length > 2048) return '/';
	const s = raw.trim();
	if (!s.startsWith('/') || s.startsWith('//')) return '/';
	return s;
}

export const prerender = false;

export const load: PageServerLoad = async ({ locals, url, request }) => {
	if (locals.user) {
		const dest = safeRedirectPath(url.searchParams.get('redirectTo'));
		const locale = extractLocaleFromRequest(request);
		throw redirect(302, localizeHref(dest, { locale }) as string);
	}
	return {
		redirectTo: safeRedirectPath(url.searchParams.get('redirectTo'))
	};
};
