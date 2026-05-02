/**
 * Strip HTML-like brackets and C0 control characters; collapse whitespace for plain-text meta fields.
 */
export function sanitizeMetaString(input: string | undefined | null, maxLen?: number): string {
	if (input == null) return '';
	let out = '';
	for (const ch of String(input)) {
		const code = ch.codePointAt(0)!;
		if (code === 60 || code === 62) continue;
		if (code === 0 || code === 0x7f || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
			out += ' ';
		} else {
			out += ch;
		}
	}
	let s = out.replace(/\s+/g, ' ').trim();
	if (maxLen != null && s.length > maxLen) {
		s = s.slice(0, maxLen).trim();
	}
	return s;
}

/**
 * Same-origin http(s) URLs only; strips dangerous schemes and cross-origin values.
 */
/**
 * CMS HTML: strip scripts, event handlers, and javascript: URLs; truncate length.
 * Use {@html} only after this pass; never render raw Strapi responses.
 */
export function sanitizeCmsHtml(input: string | undefined | null, maxLen = 12_000): string {
	if (input == null) return '';
	let s = String(input).slice(0, maxLen);
	s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
	s = s.replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
	s = s.replace(/javascript:/gi, '');
	return s;
}

export function sanitizeSameOriginUrl(
	input: string | undefined | null,
	origin: string
): string | null {
	if (input == null || input === '') return null;
	const trimmed = sanitizeMetaString(input, 2048);
	if (!trimmed) return null;
	try {
		const base = new URL(origin);
		const u = new URL(trimmed, base);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		if (u.origin !== base.origin) return null;
		return u.href;
	} catch {
		return null;
	}
}
