import { describe, expect, it } from 'vitest';
import {
	extractTranslationFields,
	localeMatchesTarget,
	mergeTranslatedFields,
	primaryLanguageSubtag,
	sanitizeTranslatedEmailHtml,
	splitHtmlForTranslation,
	validateTranslateEmailRequest
} from './email-translate';

describe('email-translate', () => {
	it('validateTranslateEmailRequest accepts valid body', () => {
		const v = validateTranslateEmailRequest({
			emailId: 12,
			locales: ['es', 'fr'],
			linkToParent: false,
			overwrite: true
		});
		expect(v.ok).toBe(true);
		if (!v.ok) return;
		expect(v.data.emailId).toBe(12);
		expect(v.data.locales).toEqual(['es', 'fr']);
		expect(v.data.linkToParent).toBe(false);
		expect(v.data.overwrite).toBe(true);
	});

	it('validateTranslateEmailRequest rejects invalid id and locales', () => {
		expect(validateTranslateEmailRequest({ emailId: 0, locales: ['es'] }).ok).toBe(false);
		expect(validateTranslateEmailRequest({ emailId: 1, locales: [] }).ok).toBe(false);
		expect(validateTranslateEmailRequest({ emailId: 1, locales: ['xx'] }).ok).toBe(false);
	});

	it('primaryLanguageSubtag and localeMatchesTarget', () => {
		expect(primaryLanguageSubtag('es_MX')).toBe('es');
		expect(localeMatchesTarget('es', 'es-ES')).toBe(true);
		expect(localeMatchesTarget('fr', 'de')).toBe(false);
	});

	it('splitHtmlForTranslation bounds progress', () => {
		const long = Array.from({ length: 10_000 }, () => '<p>x</p>').join('');
		const parts = splitHtmlForTranslation(long, 80);
		expect(parts.length).toBeGreaterThan(1);
		expect(parts.join('')).toBe(long);
	});

	it('extractTranslationFields and mergeTranslatedFields round-trip keys', () => {
		const fields = extractTranslationFields('S', 'P', '<div>a</div><div>b</div>');
		const merged = mergeTranslatedFields(
			fields.map((f) => ({ key: f.key, value: f.value + '!' }))
		);
		expect(merged.subject).toBe('S!');
		expect(merged.html).toBe('<div>a</div><div>b</div>!');
	});

	it('sanitizeTranslatedEmailHtml removes script and on*= handlers', () => {
		const s = sanitizeTranslatedEmailHtml(
			'<p x="1" onclick="evil()">Hi</p><script>bad()</script><p>OK</p>'
		);
		expect(s.toLowerCase()).not.toContain('<script');
		expect(s).not.toContain('onclick');
		expect(s).toContain('OK');
	});
});
