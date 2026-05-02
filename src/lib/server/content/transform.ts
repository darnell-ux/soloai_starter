/**
 * CMS content transformation: safe strings, stable shape for Paraglide + future CMS pipelines.
 * Server-only; keep orchestration out of components.
 */
import { baseLocale, locales } from '$lib/paraglide/runtime';
import { sanitizeCmsHtml, sanitizeMetaString } from '$lib/seo/sanitize';

export type ContentLocaleMeta = {
	requestedLocale: string;
	resolvedLocale: string;
	fallbackUsed: boolean;
};

export function assertContentLocale(raw: string): (typeof locales)[number] {
	return (locales as readonly string[]).includes(raw) ? (raw as (typeof locales)[number]) : baseLocale;
}

export function transformPlainField(value: string | undefined | null, maxLen: number): string {
	return sanitizeMetaString(value ?? '', maxLen);
}

export function transformRichField(value: string | undefined | null, maxLen: number): string {
	return sanitizeCmsHtml(String(value ?? ''), maxLen);
}

export function transformStringRecord(
	input: Record<string, string>,
	maxPerField: number
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(input)) {
		out[k] = sanitizeMetaString(v, maxPerField);
	}
	return out;
}

/** Batch plain fields while preserving keys (CMS / Paraglide message maps). */
export function batchTransformPlainFields(
	fields: ReadonlyArray<{ key: string; value: string }>,
	maxPerField: number
): { key: string; value: string }[] {
	return fields.map(({ key, value }) => ({
		key: sanitizeMetaString(key, 200),
		value: sanitizeMetaString(value, maxPerField)
	}));
}

/** Batch rich fields; preserves key order and structure. */
export function batchTransformRichFields(
	fields: ReadonlyArray<{ key: string; value: string }>,
	maxPerField: number
): { key: string; value: string }[] {
	return fields.map(({ key, value }) => ({
		key: sanitizeMetaString(key, 200),
		value: transformRichField(value, maxPerField)
	}));
}

export { baseLocale, locales };
