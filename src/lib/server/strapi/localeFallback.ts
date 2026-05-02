import { baseLocale, locales } from '$lib/paraglide/runtime';

type Locale = (typeof locales)[number];

export function normalizeToLocale(locale: string): Locale {
	return (locales as readonly string[]).includes(locale) ? (locale as Locale) : baseLocale;
}

/**
 * When Strapi has no localized row, repeat GET with base locale (English).
 */
export async function withBaseLocaleFallback<T>(
	primaryLocale: string,
	fetcher: (loc: Locale) => Promise<T | null>,
	isEmpty: (value: T | null) => boolean
): Promise<{ value: T | null; resolvedLocale: Locale; fallbackUsed: boolean }> {
	const loc = normalizeToLocale(primaryLocale);
	let value = await fetcher(loc);
	if (!isEmpty(value)) {
		return { value, resolvedLocale: loc, fallbackUsed: false };
	}
	if (loc === baseLocale) {
		return { value, resolvedLocale: loc, fallbackUsed: false };
	}
	value = await fetcher(baseLocale);
	return {
		value,
		resolvedLocale: baseLocale,
		fallbackUsed: !isEmpty(value)
	};
}
