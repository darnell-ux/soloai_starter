import { baseLocale, locales } from '$lib/paraglide/runtime';
import { sanitizeMetaString } from '$lib/seo/sanitize';
import { fetchLandingHomepageBundle } from '$lib/server/strapi/homepage-content';

type Locale = (typeof locales)[number];

export type HeroContent = {
	headline: string;
	subtext: string;
	media: { src: string | null; alt: string };
	primaryCtaLabel: string;
};

const FALLBACK_EN: HeroContent = {
	headline: 'Ship faster with confidence',
	subtext:
		'One place to manage your product, billing, and customer experience — secure by default and ready to scale.',
	media: { src: null, alt: '' },
	primaryCtaLabel: 'Get started'
};

function isLocale(value: string): value is Locale {
	return (locales as readonly string[]).includes(value);
}

function normalizeLocale(locale: string): Locale {
	return isLocale(locale) ? locale : baseLocale;
}

function sanitizeOptionalUrl(raw: string | null | undefined): string | null {
	if (raw == null || raw === '') return null;
	const t = raw.trim();
	if (!t) return null;
	try {
		const u = new URL(t);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		return u.href;
	} catch {
		return null;
	}
}

export function mergeHero(partial: Partial<HeroContent> | null): HeroContent {
	const base = FALLBACK_EN;
	const p = partial ?? {};
	const headline = sanitizeMetaString(p.headline ?? base.headline, 180);
	const subtext = sanitizeMetaString(p.subtext ?? base.subtext, 320);
	const alt = sanitizeMetaString(p.media?.alt ?? base.media.alt, 180);
	const src = sanitizeOptionalUrl(p.media?.src ?? undefined) ?? base.media.src;
	const primaryCtaLabel = sanitizeMetaString(p.primaryCtaLabel ?? base.primaryCtaLabel, 80);
	return {
		headline,
		subtext,
		media: { src, alt: alt || sanitizeMetaString(headline, 120) },
		primaryCtaLabel
	};
}

/**
 * Loads homepage hero content. Strapi can be wired into fetchStrapiHero without changing the route.
 * Missing or invalid CMS data falls back to English defaults.
 */
export async function loadHomepageHero(locale: string): Promise<HeroContent> {
	const loc = normalizeLocale(locale);
	const bundle = await fetchLandingHomepageBundle(loc).catch(() => null);
	const partial = bundle?.hero ?? null;
	return mergeHero(partial);
}
