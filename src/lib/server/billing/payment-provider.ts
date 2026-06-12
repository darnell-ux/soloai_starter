import { baseLocale } from '$lib/paraglide/runtime';
import { getServerConfig, isStripeEnabled } from '$lib/server/config';
import { isLemonSqueezyEnabled } from '$lib/server/billing/lemonsqueezy';

export type PaymentProcessor = 'stripe' | 'lemonsqueezy';

/** Locale `en` (base) → Stripe; other Paraglide locales → Lemon Squeezy MoR (LS01/LS02). */
export function paymentProcessorForLocale(locale: string): PaymentProcessor {
	const l = locale.trim();
	return l === baseLocale ? 'stripe' : 'lemonsqueezy';
}

/** Whether checkout can run for the resolved processor (env validated via EV02). */
export function isPaymentProcessorConfigured(processor: PaymentProcessor): boolean {
	getServerConfig();
	return processor === 'stripe' ? isStripeEnabled() : isLemonSqueezyEnabled();
}
