/**
 * Klaro consent configuration (TC03). Service `name` values match `data-name` on managed scripts / callbacks.
 */
import { pushGaConsentGranted, pushHotjarAccepted, pushToDataLayer } from './dataLayer';

export type KlaroCfg = Record<string, unknown>;

export function buildKlaroConfig(opts: { lang: string; privacyPolicyHref: string }): KlaroCfg {
	const { lang, privacyPolicyHref } = opts;

	const baseTranslations = {
		consentNotice: {
			title: 'Cookie & privacy preferences',
			description:
				'We use cookies and similar technologies for essential site function, analytics, and product insights. You can change your choices anytime via Cookie settings.',
			learnMore: 'Learn more'
		},
		consentModal: {
			title: 'Privacy preferences',
			description:
				'Choose which optional services we may enable. Essential security cookies may still be required to operate the site.'
		},
		purposes: {
			security: 'Essential & security',
			analytics: 'Analytics & product insights'
		},
		'google-tag-manager': {
			title: 'Google Tag Manager',
			description: 'Loads our tag container so we can manage analytics tools without frequent code changes.'
		},
		'google-analytics': {
			title: 'Google Analytics 4',
			description: 'Helps us understand aggregate traffic and feature usage (tags are configured without raw PII).'
		},
		hotjar: {
			title: 'Hotjar',
			description: 'Optional session insights (heatmaps/recordings) configured in GTM with masking rules.'
		},
		privacyPolicyUrl: privacyPolicyHref
	};

	return {
		version: 1,
		elementID: 'klaro',
		styling: {
			theme: ['light', 'bottom', 'wide']
		},
		storageMethod: 'localStorage',
		cookieName: 'klaro-consent',
		cookieExpiresAfterDays: 365,
		default: false,
		mustConsent: false,
		acceptAll: true,
		hideDeclineAll: false,
		htmlTexts: true,
		lang,
		translations: {
			zz: baseTranslations,
			en: baseTranslations
		},
		services: [
			{
				name: 'google-tag-manager',
				purposes: ['security'],
				required: false,
				default: false,
				onlyOnce: true,
				callback: (consent: boolean) => {
					if (consent) {
						window.__gtm_booted = true;
						const pending = window.__klaro_pending;
						if (Array.isArray(pending)) {
							for (const fn of pending) {
								try {
									fn();
								} catch {
									/* ignore */
								}
							}
							window.__klaro_pending = [];
						}
					} else {
						pushToDataLayer({ event: 'klaro-gtm-declined' });
					}
				}
			},
			{
				name: 'google-analytics',
				purposes: ['analytics'],
				required: false,
				default: false,
				callback: (consent: boolean) => {
					if (consent) {
						const fire = () => pushGaConsentGranted();
						if (window.__gtm_booted) fire();
						else {
							window.__klaro_pending = window.__klaro_pending ?? [];
							window.__klaro_pending.push(fire);
						}
					}
				}
			},
			{
				name: 'hotjar',
				purposes: ['analytics'],
				required: false,
				default: false,
				callback: (consent: boolean) => {
					if (consent) {
						const fire = () => pushHotjarAccepted();
						if (window.__gtm_booted) fire();
						else {
							window.__klaro_pending = window.__klaro_pending ?? [];
							window.__klaro_pending.push(fire);
						}
					}
				}
			}
		]
	};
}
