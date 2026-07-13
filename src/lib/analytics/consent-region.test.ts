import { describe, it, expect } from 'vitest';
import { countryFromHeaders, isOptInCountry, resolveConsentAutoGrant } from './consent-region';

const req = (headers: Record<string, string> = {}) =>
	new Request('https://taxnexusapp.com/', { headers });

describe('countryFromHeaders', () => {
	it('reads Cloudflare cf-ipcountry (case-insensitive)', () => {
		expect(countryFromHeaders(req({ 'cf-ipcountry': 'de' }).headers)).toBe('DE');
	});
	it('treats XX / T1 (unknown/Tor) as no signal', () => {
		expect(countryFromHeaders(req({ 'cf-ipcountry': 'XX' }).headers)).toBe(null);
		expect(countryFromHeaders(req({ 'cf-ipcountry': 'T1' }).headers)).toBe(null);
	});
	it('returns null when no geo header is present', () => {
		expect(countryFromHeaders(req().headers)).toBe(null);
	});
});

describe('isOptInCountry', () => {
	it('flags EEA/UK/CH as opt-in', () => {
		for (const c of ['DE', 'FR', 'IE', 'GB', 'NO', 'CH']) expect(isOptInCountry(c)).toBe(true);
	});
	it('does not flag US / other', () => {
		for (const c of ['US', 'CA', 'AU', 'JP', 'BR']) expect(isOptInCountry(c)).toBe(false);
	});
});

describe('resolveConsentAutoGrant', () => {
	it('BUG FIX: EEA visitor on the English site is NOT auto-granted (geo wins over locale)', () => {
		expect(resolveConsentAutoGrant(req({ 'cf-ipcountry': 'DE' }), 'en', 'en')).toBe(false);
	});
	it('US visitor browsing a non-English locale IS auto-granted (geo wins over locale)', () => {
		expect(resolveConsentAutoGrant(req({ 'cf-ipcountry': 'US' }), 'es', 'en')).toBe(true);
	});
	it('no geo signal + base locale → auto-grant (unchanged fallback behavior)', () => {
		expect(resolveConsentAutoGrant(req(), 'en', 'en')).toBe(true);
	});
	it('no geo signal + non-base locale → opt-in (unchanged fallback behavior)', () => {
		expect(resolveConsentAutoGrant(req(), 'de', 'en')).toBe(false);
	});
});
