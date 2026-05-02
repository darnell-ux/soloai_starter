import { baseLocale } from '$lib/paraglide/runtime';

export type PaymentProcessor = 'stripe' | 'lemonsqueezy';

/** Locale `en` (base) → Stripe; other Paraglide locales → Lemon Squeezy (LS01). */
export function paymentProcessorForLocale(locale: string): PaymentProcessor {
	const l = locale.trim();
	return l === baseLocale ? 'stripe' : 'lemonsqueezy';
}
