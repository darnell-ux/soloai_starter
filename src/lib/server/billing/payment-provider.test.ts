import { describe, expect, it } from 'vitest';
import {
	isPaymentProcessorConfigured,
	paymentProcessorForLocale
} from './payment-provider';

describe('payment-provider', () => {
	it('maps base locale to stripe', () => {
		expect(paymentProcessorForLocale('en')).toBe('stripe');
	});

	it('maps non-base locale to lemonsqueezy', () => {
		expect(paymentProcessorForLocale('fr')).toBe('lemonsqueezy');
	});

	it('reports stripe unconfigured when STRIPE_* unset', () => {
		expect(isPaymentProcessorConfigured('stripe')).toBe(false);
	});

	it('reports lemonsqueezy unconfigured when LEMON_SQUEEZY_* unset', () => {
		expect(isPaymentProcessorConfigured('lemonsqueezy')).toBe(false);
	});
});
