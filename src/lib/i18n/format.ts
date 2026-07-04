/**
 * Locale-aware value formatting bound to the active Paraglide locale.
 *
 * Prefer these over `Number.prototype.toLocaleString()` / `Date.prototype.toLocaleString()`,
 * which use the *browser* default locale (not the app's selected language) and can
 * cause SSR/client mismatches. `getLocale()` resolves the same locale on server and
 * client, so formatting stays consistent with the rest of the localized UI.
 */
import { getLocale } from '$lib/paraglide/runtime';

/** Currency (default USD — the product's billing/tax currency), grouped per locale. */
export function formatCurrency(amount: number, currency = 'USD', locale: string = getLocale()): string {
	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency,
			maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
		}).format(amount);
	} catch {
		return `$${amount}`;
	}
}

/** Plain number with locale-appropriate grouping/decimal separators. */
export function formatNumber(value: number, locale: string = getLocale()): string {
	try {
		return new Intl.NumberFormat(locale).format(value);
	} catch {
		return String(value);
	}
}

/** Date/time formatted for the active locale (defaults to a medium date). */
export function formatDate(
	input: string | number | Date,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
	locale: string = getLocale()
): string {
	try {
		return new Intl.DateTimeFormat(locale, options).format(new Date(input));
	} catch {
		return String(input);
	}
}
