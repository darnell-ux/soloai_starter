/**
 * Inline script for Google Consent Mode v2 defaults (runs before GTM). SSR-safe string only.
 */
export function buildConsentDefaultInlineScript(isUsLocale: boolean): string {
	const defaults = isUsLocale
		? {
				ad_storage: 'granted',
				ad_user_data: 'granted',
				ad_personalization: 'granted',
				analytics_storage: 'granted',
				functionality_storage: 'granted',
				personalization_storage: 'granted',
				security_storage: 'granted'
			}
		: {
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				analytics_storage: 'denied',
				functionality_storage: 'denied',
				personalization_storage: 'denied',
				security_storage: 'granted'
			};
	const json = JSON.stringify(defaults).replace(/</g, '\\u003c');
	return `(function(w){w.dataLayer=w.dataLayer||[];function gtag(){w.dataLayer.push(arguments);}w.gtag=gtag;gtag('consent','default',${json});})(window);`;
}
