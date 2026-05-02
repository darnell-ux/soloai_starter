import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyLemonSqueezySignature } from './webhook-signature';

describe('lemon webhook signature', () => {
	it('accepts valid X-Signature', () => {
		const secret = 'testsign';
		const raw = '{"meta":{"event_name":"order_created"}}';
		const sig = createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
		expect(verifyLemonSqueezySignature(secret, raw, sig)).toBe(true);
	});

	it('rejects wrong secret or tampered body', () => {
		const raw = '{"meta":{"event_name":"order_created"}}';
		const sig = createHmac('sha256', 'a').update(raw, 'utf8').digest('hex');
		expect(verifyLemonSqueezySignature('b', raw, sig)).toBe(false);
		expect(verifyLemonSqueezySignature('a', raw + ' ', sig)).toBe(false);
	});
});
