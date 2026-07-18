import { locales } from '$lib/paraglide/runtime';

type Locale = (typeof locales)[number];

/**
 * Locales with enough translated content to advertise to users and search
 * engines. Everything else in Paraglide's `locales` still exists for URL
 * routing, CMS locale fallback, and payment-processor selection — it is simply
 * NOT surfaced (language switcher, hreflang, sitemap, JSON-LD) until its
 * `messages/{locale}.json` reaches parity with English.
 *
 * Today only `en` is meaningfully translated (the others are ~16-key stubs), so
 * we advertise English only rather than present a `lang="xx"` page of English
 * content. Add a locale here the moment its translation is complete — nothing
 * else needs to change.
 */
const TRANSLATED = new Set<Locale>(['en']);

/** Advertised UI + SEO locales: Paraglide locales ∩ translated. */
export const publicLocales: Locale[] = locales.filter((l) => TRANSLATED.has(l));

/** True if a locale is translated enough to advertise in UI / SEO surfaces. */
export function isPublicLocale(locale: string): boolean {
	return (TRANSLATED as Set<string>).has(locale);
}
