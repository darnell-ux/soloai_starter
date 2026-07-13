/**
 * Consent jurisdiction resolution.
 *
 * The GDPR / UK-GDPR / ePrivacy opt-in requirement is a matter of the visitor's
 * LOCATION, not their language. Gating consent on locale (`locale === 'en'`) is
 * wrong: an EEA/UK visitor browsing the default English site would be auto-opted
 * in, and English is the fallback locale most such visitors land on.
 *
 * So we prefer a geo signal (country code) from the edge/proxy, and fall back to
 * the language heuristic ONLY when no geo signal is present (e.g. no CDN in front
 * yet). Once a geo header is supplied (Cloudflare `cf-ipcountry`, an nginx GeoIP
 * `x-geo-country`, etc.) the decision becomes jurisdiction-correct with no further
 * code change.
 */

// ISO-3166-1 alpha-2. EEA (EU 27 + Iceland/Liechtenstein/Norway) + UK, plus
// Switzerland (FADP mirrors GDPR expectations). Treated as opt-in-required.
// Adjust as counsel advises.
const OPT_IN_COUNTRIES = new Set([
	// EU 27
	'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
	'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
	// EEA non-EU
	'IS', 'LI', 'NO',
	// UK + Switzerland
	'GB', 'CH'
]);

/** Common edge/proxy geo headers, in priority order. */
const GEO_HEADERS = [
	'cf-ipcountry', // Cloudflare
	'x-vercel-ip-country', // Vercel
	'x-geo-country', // generic / nginx GeoIP2
	'x-country-code',
	'x-appengine-country' // Google App Engine
];

/** Read a 2-letter ISO country code from known geo headers; null if none present. */
export function countryFromHeaders(headers: Headers): string | null {
	for (const h of GEO_HEADERS) {
		const v = headers.get(h)?.trim().toUpperCase();
		// Cloudflare emits 'XX' for unknown/Tor and 'T1' for Tor — treat as unknown.
		if (v && /^[A-Z]{2}$/.test(v) && v !== 'XX' && v !== 'T1') return v;
	}
	return null;
}

/** True if the country requires opt-in consent (EEA/UK/CH). */
export function isOptInCountry(country: string): boolean {
	return OPT_IN_COUNTRIES.has(country.toUpperCase());
}

/**
 * Whether analytics/ads consent may be AUTO-GRANTED (US / opt-out style) for this
 * request.
 *
 * - Geo known  → authoritative: auto-grant unless it's an opt-in country.
 * - Geo absent → fall back to the language heuristic (base locale ⇒ auto-grant),
 *   preserving current behavior until a geo source (CDN/GeoIP) is wired. NOTE:
 *   until then, an EEA/UK visitor on the English site is still auto-granted — the
 *   geo header is what fully closes that gap.
 */
export function resolveConsentAutoGrant(
	request: Request,
	locale: string,
	baseLocale: string
): boolean {
	const country = countryFromHeaders(request.headers);
	if (country) return !isOptInCountry(country);
	return locale === baseLocale;
}
