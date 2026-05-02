/**
 * Legacy sessionStorage stub. Non-`en` locales use Klaro + GTM (see `KlaroLoader.svelte`, `klaroConfig.ts`).
 * `en` uses Consent Mode defaults granted in `consentHeadScript.ts` without a banner.
 */
const STORAGE_KEY = 'analytics-consent-v1';

export function hasAnalyticsConsent(): boolean {
	if (typeof window === 'undefined') return false;
	try {
		return window.sessionStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

/** Call from a consent banner when the user accepts analytics. */
export function setAnalyticsConsent(granted: boolean): void {
	if (typeof window === 'undefined') return;
	try {
		if (granted) window.sessionStorage.setItem(STORAGE_KEY, '1');
		else window.sessionStorage.removeItem(STORAGE_KEY);
		window.dispatchEvent(new CustomEvent('analytics-consent-change', { detail: { granted } }));
	} catch {
		/* storage blocked */
	}
}
