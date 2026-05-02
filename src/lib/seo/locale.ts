import { locales } from '$lib/paraglide/runtime';

type Locale = (typeof locales)[number];

/** Open Graph locale tags (underscore form) */
const OG_LOCALE: Partial<Record<Locale, string>> = {
	en: 'en_US',
	es: 'es_ES',
	fr: 'fr_FR',
	hi: 'hi_IN',
	pt: 'pt_BR',
	de: 'de_DE',
	it: 'it_IT',
	ur: 'ur_PK',
	fi: 'fi_FI',
	nb: 'nb_NO',
	ar: 'ar_SA',
	ru: 'ru_RU'
};

export function ogLocaleTag(locale: Locale): string {
	return OG_LOCALE[locale] ?? locale;
}

/** hreflang attribute values (keep aligned with site locales) */
export function hreflangForLocale(locale: Locale): string {
	return locale;
}
