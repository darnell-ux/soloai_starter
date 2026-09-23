/**
 * Attribution must fail CLOSED. These fields arrive as query params and are
 * accepted by the signup call (`input: true`), so the allowlist is the only
 * thing keeping arbitrary strings out of the user table and out of reporting.
 */
import { describe, it, expect } from 'vitest';
import {
	parseSignupSource,
	parseAlertLevel,
	normalizeSignupAttribution,
	attributionQuery,
	DEFAULT_SIGNUP_SOURCE,
	DEFAULT_ALERT_LEVEL
} from './attribution';

describe('parseSignupSource', () => {
	it('accepts known sources', () => {
		expect(parseSignupSource('chrome_extension')).toBe('chrome_extension');
		expect(parseSignupSource('web')).toBe('web');
	});

	it('normalises case and surrounding whitespace', () => {
		expect(parseSignupSource('  Chrome_Extension  ')).toBe('chrome_extension');
	});

	it('falls back to the default for anything unknown', () => {
		for (const bad of ['', '  ', 'affiliate', 'CHROME_EXTENSION; DROP TABLE user', null, undefined, 42, {}]) {
			expect(parseSignupSource(bad as unknown)).toBe(DEFAULT_SIGNUP_SOURCE);
		}
	});

	it('does not resolve prototype keys to a value', () => {
		expect(parseSignupSource('__proto__')).toBe(DEFAULT_SIGNUP_SOURCE);
		expect(parseSignupSource('constructor')).toBe(DEFAULT_SIGNUP_SOURCE);
	});
});

describe('parseAlertLevel', () => {
	it('accepts known levels', () => {
		expect(parseAlertLevel('high')).toBe('high');
		expect(parseAlertLevel('none')).toBe('none');
	});

	it('falls back for anything unknown', () => {
		expect(parseAlertLevel('critical')).toBe(DEFAULT_ALERT_LEVEL);
		expect(parseAlertLevel(undefined)).toBe(DEFAULT_ALERT_LEVEL);
	});
});

describe('normalizeSignupAttribution', () => {
	it('passes through a genuine extension signup', () => {
		expect(
			normalizeSignupAttribution({ signupSource: 'chrome_extension', signupAlertLevel: 'high' })
		).toEqual({ signupSource: 'chrome_extension', signupAlertLevel: 'high' });
	});

	it('scrubs a forged payload rather than persisting it', () => {
		// The signup call is client-driven, so this is the realistic hostile input.
		expect(
			normalizeSignupAttribution({
				signupSource: '<script>alert(1)</script>',
				signupAlertLevel: 'platinum'
			})
		).toEqual({ signupSource: DEFAULT_SIGNUP_SOURCE, signupAlertLevel: DEFAULT_ALERT_LEVEL });
	});

	it('handles a payload with no attribution at all', () => {
		expect(normalizeSignupAttribution({})).toEqual({
			signupSource: DEFAULT_SIGNUP_SOURCE,
			signupAlertLevel: DEFAULT_ALERT_LEVEL
		});
		expect(normalizeSignupAttribution(null)).toEqual({
			signupSource: DEFAULT_SIGNUP_SOURCE,
			signupAlertLevel: DEFAULT_ALERT_LEVEL
		});
	});
});

describe('attributionQuery', () => {
	it('carries a non-default source across the handoff', () => {
		expect(attributionQuery('chrome_extension', 'high')).toBe('&source=chrome_extension&alert=high');
	});

	it('stays empty when there is nothing worth carrying', () => {
		// An organic signup should not get spurious query params.
		expect(attributionQuery('web', 'none')).toBe('');
	});
});
