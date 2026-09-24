import { extractLocaleFromRequest, localizeHref } from '$lib/paraglide/runtime';
import { redirect } from '@sveltejs/kit';
import { parseAlertLevel, parseSignupSource } from '$lib/attribution';
import type { PageServerLoad } from './$types';

function safeRedirectPath(raw: string | null): string {
	if (!raw || raw.length > 2048) return '/account';
	const s = raw.trim();
	if (!s.startsWith('/') || s.startsWith('//')) return '/account';
	return s;
}

export const prerender = false;

export const load: PageServerLoad = async ({ locals, url, request }) => {
	const dest = safeRedirectPath(url.searchParams.get('redirectTo'));
	const locale = extractLocaleFromRequest(request);
	const redirectTo = localizeHref(dest, { locale }) as string;
	if (locals.user) {
		throw redirect(302, redirectTo);
	}
	return {
		redirectTo,
		// Attribution handed over from /trial. Both fail closed to their defaults,
		// so a hand-typed or tampered value cannot reach the user row.
		signupSource: parseSignupSource(url.searchParams.get('source')),
		signupAlertLevel: parseAlertLevel(url.searchParams.get('alert'))
	};
};
