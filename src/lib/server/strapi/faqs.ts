import { locales } from '$lib/paraglide/runtime';
import { sanitizeCmsHtml, sanitizeMetaString } from '$lib/seo/sanitize';
import { strapiGetJson } from './client';
import { withBaseLocaleFallback } from './localeFallback';

export type FaqCategory = 'general' | 'billing' | 'product' | 'account' | 'security';

export type FaqItem = {
	id: string;
	question: string;
	answerHtml: string;
	category: FaqCategory;
	sortOrder: number;
};

export type FaqGroup = {
	category: FaqCategory;
	label: string;
	items: FaqItem[];
};

const CATEGORY_ORDER: FaqCategory[] = [
	'general',
	'product',
	'billing',
	'account',
	'security'
];

const CATEGORY_SET = new Set<string>(CATEGORY_ORDER);

type Locale = (typeof locales)[number];

function parseCategory(raw: unknown): FaqCategory {
	const s = String(raw ?? 'general');
	return CATEGORY_SET.has(s) ? (s as FaqCategory) : 'general';
}

function parseFaqEntry(entry: unknown): FaqItem | null {
	if (!entry || typeof entry !== 'object') return null;
	const e = entry as Record<string, unknown>;
	const id = String(e.documentId ?? e.id ?? '');
	const attrRaw = e.attributes;
	if (!attrRaw || typeof attrRaw !== 'object' || Array.isArray(attrRaw)) return null;
	const attr = attrRaw as Record<string, unknown>;

	const question = sanitizeMetaString(String(attr.question ?? ''), 500);
	const answerHtml = sanitizeCmsHtml(String(attr.answer ?? ''), 12_000);
	const category = parseCategory(attr.category);
	const sortOrder = typeof attr.sortOrder === 'number' ? attr.sortOrder : 0;

	if (!question || !answerHtml) return null;

	return {
		id: id || `faq:${question.slice(0, 24)}`,
		question,
		answerHtml,
		category,
		sortOrder
	};
}

async function fetchFaqsForLocale(loc: Locale): Promise<FaqItem[]> {
	const json = await strapiGetJson<{ data?: unknown[] }>('/api/faqs', {
		locale: loc,
		publicationState: 'live',
		'sort[0]': 'sortOrder:asc',
		'pagination[pageSize]': '100'
	});
	if (!json) return [];
	const raw = Array.isArray(json.data) ? json.data : [];
	const parsed = raw
		.map((row) => parseFaqEntry(row))
		.filter((x): x is FaqItem => x != null);
	return parsed.sort((a, b) => {
		const ca = CATEGORY_ORDER.indexOf(a.category);
		const cb = CATEGORY_ORDER.indexOf(b.category);
		if (ca !== cb) return ca - cb;
		return a.sortOrder - b.sortOrder;
	});
}

/**
 * Published FAQs: locale, sortOrder asc; falls back to English when empty.
 */
export async function fetchPublishedFaqs(locale: string): Promise<FaqItem[]> {
	const { value } = await withBaseLocaleFallback(
		locale,
		(loc) => fetchFaqsForLocale(loc),
		(arr) => arr == null || arr.length === 0
	);
	return value ?? [];
}

export function groupFaqsByCategory(items: FaqItem[]): FaqGroup[] {
	const labels: Record<FaqCategory, string> = {
		general: 'General',
		product: 'Product',
		billing: 'Billing',
		account: 'Account',
		security: 'Security'
	};
	const map = new Map<FaqCategory, FaqItem[]>();
	for (const c of CATEGORY_ORDER) map.set(c, []);
	for (const it of items) {
		const arr = map.get(it.category);
		if (arr) arr.push(it);
	}
	return CATEGORY_ORDER.filter((c) => (map.get(c)?.length ?? 0) > 0).map((category) => ({
		category,
		label: labels[category],
		items: map.get(category) ?? []
	}));
}
