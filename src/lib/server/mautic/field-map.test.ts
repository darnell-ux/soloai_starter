import { describe, expect, it } from 'vitest';
import { mapUserToMauticContact, sanitizeEmail, splitName } from './field-map';

describe('field-map', () => {
	it('sanitizeEmail rejects invalid', () => {
		expect(sanitizeEmail('bad')).toBeNull();
		expect(sanitizeEmail('a@b.co')).not.toBeNull();
	});

	it('splitName parses parts', () => {
		expect(splitName('Jane Doe').firstname).toBe('Jane');
		expect(splitName('Jane Doe').lastname).toBe('Doe');
	});

	it('mapUserToMauticContact requires valid email', () => {
		expect(mapUserToMauticContact({ email: 'x' })).toBeNull();
		const m = mapUserToMauticContact({ email: 'a@b.co', name: 'T Est' });
		expect(m?.email).toBe('a@b.co');
		expect(m?.firstname).toBe('T');
	});
});
