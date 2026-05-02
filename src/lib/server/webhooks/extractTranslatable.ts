import type { TranslationField } from '$lib/server/translation/service';

export type ContentModelKind = 'landingPage' | 'feature' | 'faq';

export function detectContentModel(modelUid: string): ContentModelKind | null {
	const m = modelUid.toLowerCase();
	if (m.includes('landing-page') || m.includes('landingpage')) return 'landingPage';
	if (m.includes('faq')) return 'faq';
	if (m.includes('feature')) return 'feature';
	return null;
}

function attrOf(entry: Record<string, unknown>): Record<string, unknown> {
	const a = entry.attributes;
	if (a && typeof a === 'object' && !Array.isArray(a)) return a as Record<string, unknown>;
	return entry;
}

export function extractTranslatableFields(kind: ContentModelKind, entry: Record<string, unknown>): TranslationField[] {
	const attr = attrOf(entry);
	const out: TranslationField[] = [];

	const push = (key: string, v: unknown) => {
		if (v == null || v === '') return;
		const s = typeof v === 'string' ? v : JSON.stringify(v);
		if (s.length > 0) out.push({ key, value: s });
	};

	if (kind === 'landingPage') {
		push('heroTitle', attr.heroTitle);
		push('heroSubtitle', attr.heroSubtitle);
		push('heroDescription', attr.heroDescription);
		const cta = attr.primaryCta as Record<string, unknown> | undefined;
		if (cta && typeof cta === 'object') push('primaryCta.label', cta.label);
		const seo = attr.seo as Record<string, unknown> | undefined;
		if (seo && typeof seo === 'object') {
			push('seo.metaTitle', seo.metaTitle);
			push('seo.metaDescription', seo.metaDescription);
			push('seo.ogTitle', seo.ogTitle);
			push('seo.ogDescription', seo.ogDescription);
		}
	} else if (kind === 'feature') {
		push('name', attr.name);
		push('shortDescription', attr.shortDescription);
		push('longDescription', attr.longDescription);
	} else {
		push('question', attr.question);
		push('answer', attr.answer);
	}

	return out;
}

export function mergeTranslatedStringsIntoAttributes(
	_kind: ContentModelKind,
	sourceAttr: Record<string, unknown>,
	translated: Record<string, string>
): Record<string, unknown> {
	const next = { ...sourceAttr };
	for (const [k, v] of Object.entries(translated)) {
		if (k === 'primaryCta.label') {
			const cta = { ...(typeof next.primaryCta === 'object' && next.primaryCta ? next.primaryCta : {}) } as Record<
				string,
				unknown
			>;
			cta.label = v;
			next.primaryCta = cta;
			continue;
		}
		if (k.startsWith('seo.')) {
			const sub = k.slice(4);
			const seo = { ...(typeof next.seo === 'object' && next.seo ? next.seo : {}) } as Record<string, unknown>;
			seo[sub] = v;
			next.seo = seo;
			continue;
		}
		next[k] = v;
	}
	return next;
}
