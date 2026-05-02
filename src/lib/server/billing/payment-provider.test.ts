import { describe, expect, it } from 'vitest';
import { paymentProcessorForLocale } from './payment-provider';

describe('payment-provider', () => {
	it('maps base locale to stripe', () => {
		expect(paymentProcessorForLocale('en')).toBe('stripe');
	});

	it('maps non-base locale to lemonsqueezy', () => {
		expect(paymentProcessorForLocale('fr')).toBe('lemonsqueezy');
	});
});
