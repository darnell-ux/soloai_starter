import type { PageServerLoad } from './$types';
import { parseAlertLevel, parseSignupSource, type AlertLevel, type SignupSource } from '$lib/attribution';

// Landing page for the Nexus Alert Chrome extension's CTA:
//   https://taxnexusapp.com/trial?source=chrome_extension&alert={level}
//
// The extension itself makes no API call here — it only opens this URL. The
// query params are untrusted display input, so both are validated against a
// closed set rather than echoed.

export const prerender = false;

export const load: PageServerLoad = ({ url, locals }) => ({
	alert: parseAlertLevel(url.searchParams.get('alert')) satisfies AlertLevel,
	source: parseSignupSource(url.searchParams.get('source')) satisfies SignupSource,
	signedIn: Boolean(locals.user)
});
