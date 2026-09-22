import type { PageServerLoad } from './$types';

// Landing page for the Nexus Alert Chrome extension's CTA:
//   https://taxnexusapp.com/trial?source=chrome_extension&alert={level}
//
// The extension itself makes no API call here — it only opens this URL. The
// query params are untrusted display input, so both are validated against a
// closed set rather than echoed.

const ALERT_LEVELS = ['high', 'low', 'none'] as const;
export type AlertLevel = (typeof ALERT_LEVELS)[number];

const SOURCES = ['chrome_extension', 'web'] as const;
export type TrialSource = (typeof SOURCES)[number];

function parseAlert(raw: string | null): AlertLevel {
	const value = (raw ?? '').toLowerCase();
	return (ALERT_LEVELS as readonly string[]).includes(value) ? (value as AlertLevel) : 'none';
}

function parseSource(raw: string | null): TrialSource {
	const value = (raw ?? '').toLowerCase();
	return (SOURCES as readonly string[]).includes(value) ? (value as TrialSource) : 'web';
}

export const prerender = false;

export const load: PageServerLoad = ({ url, locals }) => ({
	alert: parseAlert(url.searchParams.get('alert')),
	source: parseSource(url.searchParams.get('source')),
	signedIn: Boolean(locals.user)
});
