import { baseLocale, locales } from '$lib/paraglide/runtime';
import { sanitizeMetaString } from '$lib/seo/sanitize';
import { strapiGetJson, strapiPublicOrigin } from './client';
import { withBaseLocaleFallback } from './localeFallback';

export type FeaturePreviewItem = {
	id: string;
	name: string;
	shortDescription: string;
	slug: string;
	priority: number;
	iconUrl: string | null;
	featureImageUrl: string | null;
};

export type LandingSignupCta = {
	sectionTitle: string | null;
	sectionBody: string | null;
	guestButtonLabel: string | null;
};

/** Partial hero fields for merge with static fallbacks (Strapi landing slug=homepage). */
export type LandingHeroPartial = {
	headline?: string;
	subtext?: string;
	primaryCtaLabel?: string;
	media?: { src: string | null; alt: string };
};

export type LandingCmsSeo = {
	title: string;
	description: string;
	imageUrl: string | null;
};

export type LandingHomepageBundle = {
	hero: LandingHeroPartial | null;
	signup: LandingSignupCta | null;
	seo: LandingCmsSeo | null;
};

type Locale = (typeof locales)[number];

function isLocale(value: string): value is Locale {
	return (locales as readonly string[]).includes(value);
}

function normalizeLocale(locale: string): Locale {
	return isLocale(locale) ? (locale as Locale) : baseLocale;
}

function resolveMediaUrl(strapiOrigin: string, raw: string | null | undefined): string | null {
	if (raw == null || raw === '') return null;
	const t = raw.trim();
	if (!t) return null;
	try {
		const u = new URL(t);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		return u.href;
	} catch {
		const base = strapiOrigin.replace(/\/$/, '');
		const path = t.startsWith('/') ? t : `/${t}`;
		try {
			return new URL(path, base).href;
		} catch {
			return null;
		}
	}
}

function stripTags(s: string): string {
	return s.replace(/<[^>]*>/g, ' ');
}

function plainText(s: string, max: number): string {
	return sanitizeMetaString(stripTags(s), max);
}

function parseFeatureEntry(
	entry: unknown,
	strapiOrigin: string
): FeaturePreviewItem | null {
	if (!entry || typeof entry !== 'object') return null;
	const e = entry as Record<string, unknown>;
	const id = String(e.documentId ?? e.id ?? '');
	const attrRaw = e.attributes;
	if (!attrRaw || typeof attrRaw !== 'object' || Array.isArray(attrRaw)) return null;
	const attr = attrRaw as Record<string, unknown>;

	const name = plainText(String(attr.name ?? ''), 200);
	const shortDescription = plainText(String(attr.shortDescription ?? ''), 500);
	const slug = sanitizeMetaString(String(attr.slug ?? ''), 120);
	const priority = typeof attr.priority === 'number' ? attr.priority : 0;

	if (!name || !slug) return null;

	const iconData = attr.icon as Record<string, unknown> | undefined;
	const imgData = attr.featureImage as Record<string, unknown> | undefined;
	const iconUrl = extractMediaUrl(iconData, strapiOrigin);
	const featureImageUrl = extractMediaUrl(imgData, strapiOrigin);

	return {
		id: id || `slug:${slug}`,
		name,
		shortDescription,
		slug,
		priority,
		iconUrl,
		featureImageUrl
	};
}

function extractMediaUrl(
	media: Record<string, unknown> | undefined,
	strapiOrigin: string
): string | null {
	if (!media) return null;
	const data = media.data as Record<string, unknown> | unknown[] | null | undefined;
	if (Array.isArray(data)) {
		const first = data[0] as Record<string, unknown> | undefined;
		return first ? mediaUrlFromStrapiData(first, strapiOrigin) : null;
	}
	if (data && typeof data === 'object') {
		return mediaUrlFromStrapiData(data as Record<string, unknown>, strapiOrigin);
	}
	return null;
}

function mediaUrlFromStrapiData(node: Record<string, unknown>, strapiOrigin: string): string | null {
	const attr = node.attributes as Record<string, unknown> | undefined;
	const url = (attr?.url ?? node.url) as string | undefined;
	return resolveMediaUrl(strapiOrigin, url ?? null);
}

function mediaUrlAndAlt(
	media: Record<string, unknown> | undefined,
	strapiOrigin: string
): { src: string | null; alt: string } {
	if (!media) return { src: null, alt: '' };
	const data = media.data as Record<string, unknown> | unknown[] | null | undefined;
	let node: Record<string, unknown> | undefined;
	if (Array.isArray(data)) node = data[0] as Record<string, unknown> | undefined;
	else if (data && typeof data === 'object') node = data as Record<string, unknown>;
	if (!node) return { src: null, alt: '' };
	const attr = node.attributes as Record<string, unknown> | undefined;
	const url = (attr?.url ?? node.url) as string | undefined;
	const alt = sanitizeMetaString(String(attr?.alternativeText ?? ''), 180);
	return { src: resolveMediaUrl(strapiOrigin, url ?? null), alt };
}

function parseLandingAttributes(
	attr: Record<string, unknown>,
	strapiOrigin: string
): LandingHomepageBundle | null {
	const sectionTitle = attr.heroSubtitle != null ? plainText(String(attr.heroSubtitle), 200) : null;
	const sectionBody = attr.heroDescription != null ? plainText(String(attr.heroDescription), 1200) : null;
	const primaryCta = attr.primaryCta as { label?: string } | null | undefined;
	let guestButtonLabel: string | null = null;
	if (attr.heroCtaText != null) {
		guestButtonLabel = plainText(String(attr.heroCtaText), 120);
	} else if (primaryCta?.label != null) {
		guestButtonLabel = plainText(String(primaryCta.label), 120);
	}

	const signup: LandingSignupCta | null =
		!sectionTitle && !sectionBody && !guestButtonLabel
			? null
			: {
					sectionTitle: sectionTitle || null,
					sectionBody: sectionBody || null,
					guestButtonLabel: guestButtonLabel || null
				};

	const headline = attr.heroTitle != null ? plainText(String(attr.heroTitle), 200) : '';
	const subtext =
		attr.heroDescription != null ? plainText(String(attr.heroDescription), 320) : '';
	const primaryCtaLabel =
		primaryCta?.label != null ? plainText(String(primaryCta.label), 80) : '';

	const heroMedia = attr.heroMedia as Record<string, unknown> | undefined;
	const { src, alt } = mediaUrlAndAlt(heroMedia, strapiOrigin);

	const hero: LandingHeroPartial | null =
		headline || subtext || primaryCtaLabel || src
			? {
					...(headline ? { headline } : {}),
					...(subtext ? { subtext } : {}),
					...(primaryCtaLabel ? { primaryCtaLabel } : {}),
					media: { src, alt: alt || sanitizeMetaString(headline || 'Hero', 120) }
				}
			: null;

	const seoRaw = attr.seo as
		| {
				metaTitle?: string;
				metaDescription?: string;
				ogTitle?: string;
				ogDescription?: string;
		  }
		| undefined;
	const metaTitle = seoRaw?.metaTitle != null ? plainText(String(seoRaw.metaTitle), 160) : '';
	const metaDesc = seoRaw?.metaDescription != null ? plainText(String(seoRaw.metaDescription), 320) : '';
	const ogTitle = seoRaw?.ogTitle != null ? plainText(String(seoRaw.ogTitle), 160) : '';
	const ogDesc = seoRaw?.ogDescription != null ? plainText(String(seoRaw.ogDescription), 320) : '';
	const title = metaTitle || ogTitle || headline;
	const description = metaDesc || ogDesc || subtext;
	const imageUrl = extractMediaUrl(heroMedia, strapiOrigin);

	const seo: LandingCmsSeo | null =
		title || description || imageUrl
			? {
					title: title || 'Home',
					description: description || '',
					imageUrl
				}
			: null;

	return { hero, signup, seo };
}

/**
 * Official Strapi REST: published entries only, locale, priority order.
 */
async function fetchFeaturesForLocale(loc: Locale): Promise<FeaturePreviewItem[]> {
	const base = strapiPublicOrigin();
	const json = await strapiGetJson<{ data?: unknown[] }>('/api/features', {
		locale: loc,
		publicationState: 'live',
		'sort[0]': 'priority:asc',
		'pagination[pageSize]': '50',
		'populate[icon][fields][0]': 'url',
		'populate[featureImage][fields][0]': 'url'
	});
	if (!json) return [];
	const raw = Array.isArray(json.data) ? json.data : [];
	const parsed = raw
		.map((row) => parseFeatureEntry(row, base))
		.filter((x): x is FeaturePreviewItem => x != null);
	return parsed.sort((a, b) => a.priority - b.priority);
}

/**
 * Official Strapi REST: published entries only, locale, priority order; falls back to English.
 */
export async function fetchPublishedFeatures(locale: string): Promise<FeaturePreviewItem[]> {
	const { value } = await withBaseLocaleFallback(
		locale,
		(loc) => fetchFeaturesForLocale(loc),
		(arr) => arr == null || arr.length === 0
	);
	return value ?? [];
}

async function fetchLandingHomepageAttributes(loc: Locale): Promise<Record<string, unknown> | null> {
	const json = await strapiGetJson<{ data?: unknown[] }>('/api/landing-pages', {
		locale: loc,
		publicationState: 'live',
		'pagination[pageSize]': '1',
		'filters[slug][$eq]': 'homepage',
		'populate[seo]': '*',
		'populate[heroMedia][fields][0]': 'url',
		'populate[heroMedia][fields][1]': 'alternativeText',
		'populate[primaryCta]': '*'
	});
	if (!json) return null;
	const row = Array.isArray(json.data) ? json.data[0] : null;
	if (!row) return null;
	const e = row as Record<string, unknown>;
	const attrRaw = e.attributes;
	if (!attrRaw || typeof attrRaw !== 'object' || Array.isArray(attrRaw)) return null;
	return attrRaw as Record<string, unknown>;
}

/**
 * Single Strapi fetch for homepage landing (slug=homepage): hero, signup CTA block, SEO.
 */
export async function fetchLandingHomepageBundle(locale: string): Promise<LandingHomepageBundle | null> {
	const { value: attr } = await withBaseLocaleFallback(
		locale,
		(loc) => fetchLandingHomepageAttributes(loc),
		(v) => v == null
	);
	if (!attr) return null;
	return parseLandingAttributes(attr, strapiPublicOrigin());
}

/**
 * Homepage landing document (slug=homepage). Only published, locale-aware.
 */
export async function fetchLandingHomepageSignup(locale: string): Promise<LandingSignupCta | null> {
	const bundle = await fetchLandingHomepageBundle(locale);
	return bundle?.signup ?? null;
}
