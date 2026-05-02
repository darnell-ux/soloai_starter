import { SITE_BRAND } from './site';
import { sanitizeMetaString, sanitizeSameOriginUrl } from './sanitize';

export function serializeJsonLd(data: Record<string, unknown>): string {
	return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function buildOrganizationJsonLd(origin: string): Record<string, unknown> {
	const url = sanitizeMetaString(origin, 2048);
	const logo = sanitizeSameOriginUrl('/favicon.svg', origin);
	const out: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: SITE_BRAND,
		url
	};
	if (logo) out.logo = logo;
	return out;
}

export function buildWebsiteJsonLd(origin: string, inLanguage: readonly string[]): Record<string, unknown> {
	const url = sanitizeMetaString(origin, 2048);
	const langs = inLanguage.map((l) => sanitizeMetaString(l, 16)).filter(Boolean);
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_BRAND,
		url,
		...(langs.length ? { inLanguage: langs } : {})
	};
}

export type BreadcrumbInput = { name: string; url: string };

export function buildBreadcrumbJsonLd(items: BreadcrumbInput[]): Record<string, unknown> | null {
	if (!items.length) return null;
	const elements = items.map((item, i) => ({
		'@type': 'ListItem',
		position: i + 1,
		name: sanitizeMetaString(item.name, 120),
		item: sanitizeMetaString(item.url, 2048)
	}));
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: elements
	};
}
