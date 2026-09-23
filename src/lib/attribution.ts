// Signup attribution — where a user came from, carried across the
// /trial -> /signup handoff and persisted onto the user record.
//
// This exists because the chain used to break: the Nexus Alert extension sends
// people to /trial?source=chrome_extension&alert=high, but /trial linked to a
// bare /signup, so the attribution died exactly where it started being worth
// money. LAUNCH-CHECKLIST.md commits to measuring revenue per install and the
// lifetime value of extension-origin customers; that is not possible without
// this surviving into the user row.
//
// No SvelteKit imports — this is shared by route loads, the Svelte pages, and
// the Better Auth options (which must stay SvelteKit-free so the migration
// runner and its tests can reuse them).

export const SIGNUP_SOURCES = ['chrome_extension', 'web'] as const;
export type SignupSource = (typeof SIGNUP_SOURCES)[number];

export const ALERT_LEVELS = ['high', 'low', 'none'] as const;
export type AlertLevel = (typeof ALERT_LEVELS)[number];

export const DEFAULT_SIGNUP_SOURCE: SignupSource = 'web';
export const DEFAULT_ALERT_LEVEL: AlertLevel = 'none';

/**
 * Both parsers fail CLOSED to the default rather than passing a value through.
 *
 * These fields are attacker-settable — they arrive as query params and are
 * accepted by the signup call — so an allowlist is the only thing keeping
 * arbitrary strings out of the user table. They grant no privilege (attribution
 * is marketing data, not entitlement), but unbounded user-controlled values in
 * a column that feeds analytics and Mautic is how reporting quietly rots.
 */
export function parseSignupSource(raw: unknown): SignupSource {
	const value = String(raw ?? '')
		.trim()
		.toLowerCase();
	return (SIGNUP_SOURCES as readonly string[]).includes(value)
		? (value as SignupSource)
		: DEFAULT_SIGNUP_SOURCE;
}

export function parseAlertLevel(raw: unknown): AlertLevel {
	const value = String(raw ?? '')
		.trim()
		.toLowerCase();
	return (ALERT_LEVELS as readonly string[]).includes(value)
		? (value as AlertLevel)
		: DEFAULT_ALERT_LEVEL;
}

/** Query string that carries attribution forward across an internal redirect. */
export function attributionQuery(source: SignupSource, alert: AlertLevel): string {
	const params = new URLSearchParams();
	if (source !== DEFAULT_SIGNUP_SOURCE) params.set('source', source);
	if (alert !== DEFAULT_ALERT_LEVEL) params.set('alert', alert);
	const qs = params.toString();
	return qs ? `&${qs}` : '';
}

/**
 * Normalise attribution off an inbound signup payload.
 *
 * Lives here rather than inline in the Better Auth hook so it is testable
 * without importing SvelteKit's `$app/server` (which `$lib/auth` pulls in).
 */
export function normalizeSignupAttribution(input: Record<string, unknown> | null | undefined): {
	signupSource: SignupSource;
	signupAlertLevel: AlertLevel;
} {
	return {
		signupSource: parseSignupSource(input?.signupSource),
		signupAlertLevel: parseAlertLevel(input?.signupAlertLevel)
	};
}
