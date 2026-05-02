import { baseLocale, locales } from '$lib/paraglide/runtime';
import {
	MauticApiClient,
	MauticAuthError,
	MauticRateLimitError,
	MauticTransportError
} from '$lib/server/mautic/client';
import type { TranslationField } from '$lib/server/translation/service';
import { translateFields, validateTranslateInput } from '$lib/server/translation/service';

export const EMAIL_TRANSLATE_MAX_BODY_CHARS = 2_000_000;
const MAX_TOTAL_PER_REQUEST = 100_000;
const MAX_HTML_CHUNK = 72_000;
const MAUTIC_WRITE_RETRIES = 4;
const BACKOFF_BASE_MS = 350;

export type TranslateEmailInput = {
	emailId: number;
	locales: string[];
	linkToParent: boolean;
	overwrite: boolean;
};

export type LocaleOpStatus = 'created' | 'updated' | 'skipped' | 'error';

export type LocaleResult = {
	locale: string;
	status: LocaleOpStatus;
	emailId?: number;
	error?: string;
};

export type SourceEmailSummary = {
	id: number;
	name: string | null;
	subject: string | null;
	language: string | null;
};

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function normalizeBoolean(v: unknown, default_: boolean): boolean {
	if (v === undefined || v === null) return default_;
	if (typeof v === 'boolean') return v;
	if (v === 'true' || v === 1 || v === '1') return true;
	if (v === 'false' || v === 0 || v === '0') return false;
	return default_;
}

/** Primary language subtag for loose matching with Mautic `language`. */
export function primaryLanguageSubtag(raw: string | undefined | null): string {
	if (!raw || typeof raw !== 'string') return '';
	return raw.trim().toLowerCase().replace(/_/g, '-').split('-')[0] ?? '';
}

export function localeMatchesTarget(target: string, mauticLang: string | undefined): boolean {
	const t = primaryLanguageSubtag(target);
	const m = primaryLanguageSubtag(mauticLang);
	if (!t || !m) return false;
	return t === m;
}

export function validateTranslateEmailRequest(
	body: unknown
): { ok: true; data: TranslateEmailInput } | { ok: false; reason: string } {
	if (!body || typeof body !== 'object') return { ok: false, reason: 'invalid_body' };
	const o = body as Record<string, unknown>;
	const emailId = o.emailId;
	if (typeof emailId !== 'number' || !Number.isFinite(emailId) || emailId < 1 || emailId % 1 !== 0) {
		return { ok: false, reason: 'invalid_email_id' };
	}
	const locRaw = o.locales;
	if (!Array.isArray(locRaw) || locRaw.length === 0) return { ok: false, reason: 'invalid_locales' };
	if (locRaw.length > 48) return { ok: false, reason: 'too_many_locales' };
	const seen = new Set<string>();
	const outLocales: string[] = [];
	for (const x of locRaw) {
		if (typeof x !== 'string' || x.length === 0 || x.length > 16) {
			return { ok: false, reason: 'invalid_locale_entry' };
		}
		const trimmed = x.trim();
		if (!(locales as readonly string[]).includes(trimmed)) {
			return { ok: false, reason: 'unsupported_locale' };
		}
		if (seen.has(trimmed)) continue;
		seen.add(trimmed);
		outLocales.push(trimmed);
	}
	if (outLocales.length === 0) return { ok: false, reason: 'empty_locales' };

	return {
		ok: true,
		data: {
			emailId,
			locales: outLocales,
			linkToParent: normalizeBoolean(o.linkToParent, true),
			overwrite: normalizeBoolean(o.overwrite, false)
		}
	};
}

type MauticEmailWire = {
	id?: number;
	name?: string;
	subject?: string;
	preheaderText?: string;
	customHtml?: string;
	emailType?: string;
	language?: string;
	template?: string;
	lists?: unknown;
	translationChildren?: unknown;
	translationParent?: unknown;
	dynamicContent?: unknown;
	category?: unknown;
};

function readListIds(lists: unknown): number[] {
	if (!Array.isArray(lists)) return [];
	const out: number[] = [];
	for (const item of lists) {
		if (typeof item === 'number' && Number.isFinite(item)) out.push(item);
		else if (item && typeof item === 'object' && 'id' in item) {
			const id = (item as { id?: unknown }).id;
			if (typeof id === 'number' && Number.isFinite(id)) out.push(id);
		}
	}
	return out;
}

function readTranslationChildren(raw: MauticEmailWire): Array<{ id: number; language?: string }> {
	const ch = raw.translationChildren;
	if (!Array.isArray(ch)) return [];
	const out: Array<{ id: number; language?: string }> = [];
	for (const row of ch) {
		if (!row || typeof row !== 'object') continue;
		const id = (row as { id?: unknown }).id;
		const language = (row as { language?: unknown }).language;
		if (typeof id !== 'number' || !Number.isFinite(id)) continue;
		out.push({
			id,
			language: typeof language === 'string' ? language : undefined
		});
	}
	return out;
}

function findChildForLocale(
	source: MauticEmailWire,
	targetLocale: string
): { id: number; language?: string } | null {
	for (const row of readTranslationChildren(source)) {
		if (localeMatchesTarget(targetLocale, row.language)) return row;
	}
	return null;
}

/** Split HTML into translatable chunks at tag boundaries when possible. */
export function splitHtmlForTranslation(html: string, maxChunk: number): string[] {
	if (html.length <= maxChunk) return [html];
	const chunks: string[] = [];
	let start = 0;
	while (start < html.length) {
		let end = Math.min(start + maxChunk, html.length);
		if (end < html.length) {
			const slice = html.slice(start, end);
			const lastGt = slice.lastIndexOf('>');
			if (lastGt > slice.length * 0.4) end = start + lastGt + 1;
		}
		if (end <= start) end = Math.min(start + 1, html.length);
		chunks.push(html.slice(start, end));
		start = end;
	}
	return chunks;
}

export function extractTranslationFields(
	subject: string,
	preheader: string,
	customHtml: string
): TranslationField[] {
	const s = subject;
	const p = preheader;
	const htmlChunks = splitHtmlForTranslation(customHtml, MAX_HTML_CHUNK);
	const fields: TranslationField[] = [
		{ key: 'subject', value: s },
		{ key: 'preheader', value: p }
	];
	if (htmlChunks.length === 1) {
		fields.push({ key: 'html', value: htmlChunks[0]! });
	} else {
		for (let i = 0; i < htmlChunks.length; i++) {
			fields.push({ key: `html__${i}`, value: htmlChunks[i]! });
		}
	}
	let total = 0;
	for (const f of fields) total += f.value.length;
	if (total > EMAIL_TRANSLATE_MAX_BODY_CHARS) {
		throw new Error('content_too_large');
	}
	return fields;
}

export function mergeTranslatedFields(translated: TranslationField[]): {
	subject: string;
	preheader: string;
	html: string;
} {
	const map: Record<string, string> = {};
	for (const f of translated) map[f.key] = f.value;
	const htmlKeys = Object.keys(map)
		.filter((k) => k.startsWith('html__'))
		.sort((a, b) => {
			const na = Number(a.split('__')[1]);
			const nb = Number(b.split('__')[1]);
			return na - nb;
		});
	let html: string;
	if (htmlKeys.length > 0) {
		html = htmlKeys.map((k) => map[k] ?? '').join('');
	} else {
		html = map.html ?? '';
	}
	return {
		subject: map.subject ?? '',
		preheader: map.preheader ?? '',
		html
	};
}

/** Remove script-like content and inline event handlers from stored HTML. */
export function sanitizeTranslatedEmailHtml(html: string): string {
	return html
		.replace(/<script\b[\s\S]*?<\/script>/gi, '')
		.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function batchFieldsForTranslate(all: TranslationField[]): TranslationField[][] {
	const batches: TranslationField[][] = [];
	let cur: TranslationField[] = [];
	let size = 0;
	for (const f of all) {
		const n = f.value.length;
		if (cur.length > 0 && (size + n > MAX_TOTAL_PER_REQUEST || cur.length >= 78)) {
			batches.push(cur);
			cur = [];
			size = 0;
		}
		cur.push(f);
		size += n;
	}
	if (cur.length) batches.push(cur);
	return batches;
}

export async function translateEmailFields(
	sourceLang: string,
	targetLocale: string,
	fields: TranslationField[]
): Promise<TranslationField[]> {
	const batches = batchFieldsForTranslate(fields);
	const merged: TranslationField[] = [];
	for (const batch of batches) {
		const v = validateTranslateInput({
			sourceLang,
			targetLang: targetLocale,
			fields: batch
		});
		if (!v.ok) {
			throw new Error(v.reason);
		}
		const result = await translateFields(v.data);
		merged.push(...result.fields);
	}
	return merged;
}

async function mauticWriteWithRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
	let last: unknown;
	for (let attempt = 0; attempt < MAUTIC_WRITE_RETRIES; attempt++) {
		try {
			return await fn();
		} catch (e) {
			last = e;
			if (e instanceof MauticRateLimitError) {
				const raMs =
					e.retryAfterSeconds != null && Number.isFinite(e.retryAfterSeconds)
						? e.retryAfterSeconds * 1000
						: 0;
				const backoff = BACKOFF_BASE_MS * 2 ** attempt + Math.min(60_000, raMs);
				console.error('[email_translate]', {
					stage: 'mautic_retry',
					kind: 'rate_limit',
					attempt: attempt + 1,
					label
				});
				await sleep(backoff);
				continue;
			}
			throw e;
		}
	}
	throw last instanceof Error ? last : new Error('mautic_write_failed');
}

function buildCreatePayload(args: {
	source: MauticEmailWire;
	sourceId: number;
	locale: string;
	subject: string;
	preheader: string;
	customHtml: string;
	linkToParent: boolean;
}): Record<string, unknown> {
	const { source, sourceId, locale, subject, preheader, customHtml, linkToParent } = args;
	const nameBase = typeof source.name === 'string' ? source.name : 'Email';
	const name = `${nameBase} [${locale}]`.slice(0, 191);
	const lists = readListIds(source.lists);
	const body: Record<string, unknown> = {
		name,
		subject,
		preheaderText: preheader,
		customHtml,
		emailType: source.emailType ?? 'list',
		language: locale,
		lists
	};
	if (typeof source.template === 'string' && source.template.length > 0) {
		body.template = source.template;
	}
	if (source.dynamicContent !== undefined && source.dynamicContent !== null) {
		body.dynamicContent = source.dynamicContent;
	}
	if (source.category !== undefined && source.category !== null) {
		body.category = source.category;
	}
	if (linkToParent) {
		body.translationParent = sourceId;
	}
	return body;
}

function buildPatchPayload(args: {
	subject: string;
	preheader: string;
	customHtml: string;
	locale: string;
	parentId: number;
	linkToParent: boolean;
}): Record<string, unknown> {
	const { subject, preheader, customHtml, locale, parentId, linkToParent } = args;
	const body: Record<string, unknown> = {
		subject,
		preheaderText: preheader,
		customHtml,
		language: locale
	};
	if (linkToParent) body.translationParent = parentId;
	return body;
}

export async function fetchSourceEmail(
	client: MauticApiClient,
	emailId: number
): Promise<{ ok: true; email: MauticEmailWire } | { ok: false; kind: string }> {
	try {
		const res = await client.request('GET', client.emailsPath(`/${emailId}`));
		if (res.status === 404) return { ok: false, kind: 'not_found' };
		if (res.status === 403) return { ok: false, kind: 'forbidden' };
		if (!res.ok) return { ok: false, kind: 'upstream' };
		let json: unknown;
		try {
			json = await res.json();
		} catch {
			return { ok: false, kind: 'invalid_json' };
		}
		const email = (json as { email?: MauticEmailWire }).email;
		if (!email || typeof email !== 'object') return { ok: false, kind: 'invalid_shape' };
		if (typeof email.id !== 'number' || email.id !== emailId) return { ok: false, kind: 'invalid_shape' };
		return { ok: true, email };
	} catch (e) {
		if (e instanceof MauticAuthError) return { ok: false, kind: 'auth' };
		if (e instanceof MauticTransportError) return { ok: false, kind: 'transport' };
		return { ok: false, kind: 'unknown' };
	}
}

export function summarizeSourceEmail(email: MauticEmailWire): SourceEmailSummary {
	const id = typeof email.id === 'number' ? email.id : 0;
	return {
		id,
		name: typeof email.name === 'string' ? email.name : null,
		subject: typeof email.subject === 'string' ? email.subject : null,
		language: typeof email.language === 'string' ? email.language : null
	};
}

function resolveSourceLang(email: MauticEmailWire): string {
	const raw = email.language;
	if (typeof raw === 'string' && raw.trim().length > 0) {
		const p = primaryLanguageSubtag(raw);
		if (p && (locales as readonly string[]).includes(p)) return p;
		if (p) return p;
	}
	return baseLocale;
}

/**
 * Translates the source email into each locale (sequential; refetches after writes so children stay visible).
 */
export async function translateEmailForLocales(args: {
	client: MauticApiClient;
	initialSource: MauticEmailWire;
	sourceId: number;
	locales: string[];
	linkToParent: boolean;
	overwrite: boolean;
}): Promise<LocaleResult[]> {
	const { client, sourceId, locales, linkToParent, overwrite } = args;
	let source = args.initialSource;
	const out: LocaleResult[] = [];
	for (const locale of locales) {
		const row = await runLocaleTranslation({
			client,
			source,
			sourceId,
			locale,
			linkToParent,
			overwrite
		});
		out.push(row);
		if (row.status === 'created' || row.status === 'updated') {
			const fresh = await fetchSourceEmail(client, sourceId);
			if (fresh.ok) source = fresh.email;
		}
	}
	return out;
}

export async function runLocaleTranslation(args: {
	client: MauticApiClient;
	source: MauticEmailWire;
	sourceId: number;
	locale: string;
	linkToParent: boolean;
	overwrite: boolean;
}): Promise<LocaleResult> {
	const { client, source, sourceId, locale, linkToParent, overwrite } = args;
	const sourceLang = resolveSourceLang(source);

	if (localeMatchesTarget(locale, source.language ?? undefined)) {
		return { locale, status: 'skipped' };
	}

	const subject = typeof source.subject === 'string' ? source.subject : '';
	const preheader = typeof source.preheaderText === 'string' ? source.preheaderText : '';
	const customHtml = typeof source.customHtml === 'string' ? source.customHtml : '';

	const existing = findChildForLocale(source, locale);
	if (existing && !overwrite) {
		return { locale, status: 'skipped', emailId: existing.id };
	}

	let fields: TranslationField[];
	try {
		fields = extractTranslationFields(subject, preheader, customHtml);
	} catch (e) {
		const kind = e instanceof Error ? e.message : 'extract_failed';
		return { locale, status: 'error', error: kind };
	}

	if (sourceLang === locale) {
		return { locale, status: 'skipped' };
	}

	let translatedMerged: { subject: string; preheader: string; html: string };
	try {
		const translated = await translateEmailFields(sourceLang, locale, fields);
		translatedMerged = mergeTranslatedFields(translated);
	} catch (e) {
		const kind = e instanceof Error ? e.message : 'translate_failed';
		console.error('[email_translate]', { stage: 'translate', locale, kind: 'failed' });
		return { locale, status: 'error', error: 'translation_failed' };
	}

	let safeHtml = sanitizeTranslatedEmailHtml(translatedMerged.html);
	if (
		safeHtml.toLowerCase().includes('<script') ||
		safeHtml.toLowerCase().includes('javascript:')
	) {
		console.error('[email_translate]', { stage: 'sanitize', locale, kind: 'rejected_markup' });
		return { locale, status: 'error', error: 'rejected_markup' };
	}

	const patchPayload = buildPatchPayload({
		subject: translatedMerged.subject,
		preheader: translatedMerged.preheader,
		customHtml: safeHtml,
		locale,
		parentId: sourceId,
		linkToParent
	});

	try {
		if (existing && overwrite) {
			await mauticWriteWithRetry(`patch:${existing.id}`, async () => {
				await client.requestJson<{ email?: { id?: number } }>(
					'PATCH',
					client.emailsPath(`/${existing.id}/edit`),
					{
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(patchPayload)
					}
				);
			});
			return { locale, status: 'updated', emailId: existing.id };
		}

		const createPayload = buildCreatePayload({
			source,
			sourceId,
			locale,
			subject: translatedMerged.subject,
			preheader: translatedMerged.preheader,
			customHtml: safeHtml,
			linkToParent
		});

		const created = await mauticWriteWithRetry('create', async () => {
			return client.requestJson<{ email?: { id?: number } }>('POST', client.emailsPath('/new'), {
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(createPayload)
			});
		});
		const newId = created.email?.id;
		if (typeof newId !== 'number') {
			return { locale, status: 'error', error: 'create_response_invalid' };
		}
		return { locale, status: 'created', emailId: newId };
	} catch (e) {
		if (e instanceof MauticAuthError) {
			console.error('[email_translate]', { stage: 'mautic_write', locale, kind: 'auth' });
			return { locale, status: 'error', error: 'mautic_auth_failed' };
		}
		console.error('[email_translate]', { stage: 'mautic_write', locale, kind: 'failed' });
		return { locale, status: 'error', error: 'mautic_write_failed' };
	}
}
