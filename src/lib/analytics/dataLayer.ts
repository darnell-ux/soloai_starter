/**
 * Google Tag Manager `dataLayer` + Consent Mode v2 helpers (browser-only).
 * @see TC01 / TC02 / TC03
 */

export type DataLayerObject = Record<string, unknown>;

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
		__gtm_booted?: boolean;
		__klaro_pending?: Array<() => void>;
		klaro?: { show?: (view?: unknown, modal?: boolean) => void };
	}
}

export function ensureDataLayer(): unknown[] {
	if (typeof window === 'undefined') {
		return [];
	}
	window.dataLayer = window.dataLayer ?? [];
	return window.dataLayer;
}

/** Consent Mode v2 via `gtag` → dataLayer (GTM template compatible). */
export function ensureGtag(): void {
	if (typeof window === 'undefined') return;
	const w = window as Window & { gtag?: (...args: unknown[]) => void };
	if (typeof w.gtag !== 'function') {
		w.gtag = (...args: unknown[]) => {
			ensureDataLayer().push(args);
		};
	}
}

export function pushToDataLayer(obj: DataLayerObject): void {
	if (typeof window === 'undefined') return;
	ensureDataLayer().push(obj);
}

/** GTM container id format: GTM-XXXXXXX (alphanumeric suffix). */
export function isValidGtmContainerId(id: string): boolean {
	return /^GTM-[A-Z0-9]+$/i.test(id.trim());
}

export function pushGoogleConsentDefault(isUsLocale: boolean): void {
	ensureGtag();
	const w = window as Window & { gtag: (...args: unknown[]) => void };
	if (isUsLocale) {
		w.gtag('consent', 'default', {
			ad_storage: 'granted',
			ad_user_data: 'granted',
			ad_personalization: 'granted',
			analytics_storage: 'granted',
			functionality_storage: 'granted',
			personalization_storage: 'granted',
			security_storage: 'granted'
		});
		return;
	}
	w.gtag('consent', 'default', {
		ad_storage: 'denied',
		ad_user_data: 'denied',
		ad_personalization: 'denied',
		analytics_storage: 'denied',
		functionality_storage: 'denied',
		personalization_storage: 'denied',
		security_storage: 'granted'
	});
}

export function pushGaConsentGranted(): void {
	ensureGtag();
	const w = window as Window & { gtag: (...args: unknown[]) => void };
	w.gtag('consent', 'update', { analytics_storage: 'granted' });
	pushToDataLayer({ event: 'klaro-google-analytics-accepted' });
}

export function pushHotjarAccepted(): void {
	pushToDataLayer({ event: 'klaro-hotjar-accepted' });
}

export function trackPageView(path: string, context?: DataLayerObject): void {
	pushToDataLayer({
		event: 'page_view',
		page_path: path,
		...context
	});
}

export function trackEvent(name: string, params?: DataLayerObject): void {
	pushToDataLayer({
		event: name,
		...params
	});
}

export function trackAction(name: string, params?: DataLayerObject): void {
	trackEvent(name, params);
}

export type UserIdentifyPayload = {
	user_id_hash: string | null;
	locale: string;
	subscription_tier: string | null;
	payment_provider: string | null;
};

export function identifyUser(payload: UserIdentifyPayload): void {
	pushToDataLayer({
		event: 'user_authenticated',
		...payload
	});
}
