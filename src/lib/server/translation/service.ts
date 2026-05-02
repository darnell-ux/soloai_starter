import { createHash, timingSafeEqual } from 'node:crypto';
import { getEnv } from '$lib/server/env';
import { getServerSecret } from '$lib/server/secrets';
import type { I18nResourceBundle } from './i18nAdapter';
import { fieldsToMessages, toI18nResourceBundle } from './i18nAdapter';

const MAX_FIELDS = 80;
const MAX_TOTAL_CHARS = 100_000;
const MAX_BATCH_CHARS = 12_000;
const MAX_BATCH_ITEMS = 24;
const MAX_CONCURRENT_UPSTREAM = 3;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 250;
const GLOBAL_RPM = 90;
const CACHE_MAX_ENTRIES = 2000;

const LANG_RE = /^[a-z]{2}(-[A-Za-z0-9]+)?$/;

export type TranslationField = { key: string; value: string };

export type TranslateFieldsInput = {
	sourceLang: string;
	targetLang: string;
	fields: TranslationField[];
};

export type TranslateFieldsResult = {
	fields: TranslationField[];
	meta: {
		cacheHits: number;
		cacheMisses: number;
		upstreamCalls: number;
		batches: number;
	};
	i18n: I18nResourceBundle;
};

type CacheEntry = { value: string; expiresAt: number };
const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let rpmWindowStart = Date.now();
let rpmCount = 0;

function cacheKey(sourceLang: string, targetLang: string, text: string): string {
	return createHash('sha256').update(`${sourceLang}\0${targetLang}\0${text}`, 'utf8').digest('hex');
}

function cacheGet(key: string): string | undefined {
	const e = translationCache.get(key);
	if (!e) return undefined;
	if (Date.now() > e.expiresAt) {
		translationCache.delete(key);
		return undefined;
	}
	return e.value;
}

function cacheSet(key: string, value: string): void {
	if (translationCache.size >= CACHE_MAX_ENTRIES) {
		const first = translationCache.keys().next().value as string | undefined;
		if (first !== undefined) translationCache.delete(first);
	}
	translationCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

async function globalRpmGate(): Promise<void> {
	const now = Date.now();
	if (now - rpmWindowStart >= 60_000) {
		rpmWindowStart = now;
		rpmCount = 0;
	}
	if (rpmCount >= GLOBAL_RPM) {
		const wait = 60_000 - (now - rpmWindowStart);
		await sleep(Math.max(50, wait));
		rpmWindowStart = Date.now();
		rpmCount = 0;
	}
	rpmCount += 1;
}

async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	async function worker(): Promise<void> {
		for (;;) {
			const i = next++;
			if (i >= items.length) return;
			const item = items[i] as T;
			results[i] = await fn(item, i);
		}
	}
	const n = Math.min(concurrency, Math.max(1, items.length));
	await Promise.all(Array.from({ length: n }, () => worker()));
	return results;
}

function validateLang(s: string): boolean {
	return typeof s === 'string' && s.length <= 20 && LANG_RE.test(s);
}

function unsafePayloadHint(value: string): boolean {
	const lower = value.toLowerCase();
	return lower.includes('<script') || lower.includes('javascript:') || lower.includes('onerror=');
}

export function validateTranslateInput(input: unknown):
	| { ok: true; data: TranslateFieldsInput }
	| { ok: false; reason: string } {
	if (!input || typeof input !== 'object') return { ok: false, reason: 'invalid_body' };
	const o = input as Record<string, unknown>;
	const sourceLang = o.sourceLang;
	const targetLang = o.targetLang;
	const fields = o.fields;
	if (typeof sourceLang !== 'string' || typeof targetLang !== 'string') {
		return { ok: false, reason: 'invalid_langs' };
	}
	if (!validateLang(sourceLang) || !validateLang(targetLang)) {
		return { ok: false, reason: 'invalid_lang_format' };
	}
	if (sourceLang === targetLang) return { ok: false, reason: 'same_lang' };
	if (!Array.isArray(fields) || fields.length === 0 || fields.length > MAX_FIELDS) {
		return { ok: false, reason: 'invalid_fields' };
	}
	let total = 0;
	const out: TranslationField[] = [];
	const seenKeys = new Set<string>();
	for (const row of fields) {
		if (!row || typeof row !== 'object') return { ok: false, reason: 'invalid_field_row' };
		const r = row as Record<string, unknown>;
		if (typeof r.key !== 'string' || r.key.length === 0 || r.key.length > 256) {
			return { ok: false, reason: 'invalid_field_key' };
		}
		if (seenKeys.has(r.key)) return { ok: false, reason: 'duplicate_key' };
		seenKeys.add(r.key);
		if (typeof r.value !== 'string') return { ok: false, reason: 'invalid_field_value' };
		if (unsafePayloadHint(r.value)) return { ok: false, reason: 'rejected_markup' };
		total += r.value.length;
		if (total > MAX_TOTAL_CHARS) return { ok: false, reason: 'payload_too_large' };
		out.push({ key: r.key, value: r.value });
	}
	return { ok: true, data: { sourceLang, targetLang, fields: out } };
}

function chunkUniqueForUpstream(
	entries: { id: string; text: string }[]
): { id: string; text: string }[][] {
	const batches: { id: string; text: string }[][] = [];
	let cur: { id: string; text: string }[] = [];
	let size = 0;
	for (const e of entries) {
		const add = e.text.length + 32;
		if (
			cur.length > 0 &&
			(size + add > MAX_BATCH_CHARS || cur.length >= MAX_BATCH_ITEMS)
		) {
			batches.push(cur);
			cur = [];
			size = 0;
		}
		cur.push(e);
		size += add;
	}
	if (cur.length) batches.push(cur);
	return batches;
}

async function callOpenAiJson(args: {
	sourceLang: string;
	targetLang: string;
	items: { id: string; text: string }[];
}): Promise<Record<string, string>> {
	const env = getEnv();
	const key = getServerSecret('OPENAI_API_KEY');
	if (!key) {
		throw new Error('openai_not_configured');
	}
	const model = env.OPENAI_MODEL;

	const userPayload = {
		sourceLang: args.sourceLang,
		targetLang: args.targetLang,
		items: args.items
	};

	const system = [
		'You are a professional translator.',
		'Translate each `items[].text` from sourceLang to targetLang.',
		'Preserve ALL HTML tags, entities, and attributes exactly; only translate human-readable text nodes.',
		'Preserve placeholders like {{name}}, %s, and {0}.',
		'Return ONLY valid JSON: {"translations":[{"id":"...","text":"..."}]} with the same ids as input, in any order.'
	].join(' ');

	let lastErr: unknown;
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		await globalRpmGate();
		try {
			const res = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${key}`
				},
				body: JSON.stringify({
					model,
					temperature: 0.2,
					response_format: { type: 'json_object' },
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: JSON.stringify(userPayload) }
					]
				})
			});

			if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
				const backoff = BASE_BACKOFF_MS * 2 ** attempt;
				console.error('[translation] upstream_retry', {
					stage: 'openai',
					pair: `${args.sourceLang}->${args.targetLang}`,
					httpStatus: res.status,
					attempt: attempt + 1
				});
				await sleep(backoff);
				continue;
			}

			if (!res.ok) {
				console.error('[translation] upstream_error', {
					stage: 'openai',
					pair: `${args.sourceLang}->${args.targetLang}`,
					httpStatus: res.status,
					kind: 'http_error'
				});
				throw new Error('openai_http_error');
			}

			const raw = (await res.json()) as {
				choices?: Array<{ message?: { content?: string } }>;
			};
			const content = raw.choices?.[0]?.message?.content;
			if (typeof content !== 'string') {
				throw new Error('openai_invalid_response');
			}
			let parsed: unknown;
			try {
				parsed = JSON.parse(content) as unknown;
			} catch {
				throw new Error('openai_json_parse');
			}
			const obj = parsed as Record<string, unknown>;
			const translations = obj.translations;
			if (!Array.isArray(translations)) throw new Error('openai_missing_translations');

			const out: Record<string, string> = {};
			for (const t of translations) {
				if (!t || typeof t !== 'object') continue;
				const tr = t as Record<string, unknown>;
				if (typeof tr.id !== 'string' || typeof tr.text !== 'string') continue;
				out[tr.id] = tr.text;
			}
			for (const item of args.items) {
				if (typeof out[item.id] !== 'string') {
					throw new Error('openai_missing_id');
				}
			}
			return out;
		} catch (e) {
			lastErr = e;
			if (attempt < MAX_RETRIES - 1) {
				const backoff = BASE_BACKOFF_MS * 2 ** attempt;
				console.error('[translation] upstream_retry', {
					stage: 'openai',
					pair: `${args.sourceLang}->${args.targetLang}`,
					kind: 'network_or_parse',
					attempt: attempt + 1
				});
				await sleep(backoff);
			}
		}
	}
	console.error('[translation] upstream_failed', {
		stage: 'openai',
		pair: `${args.sourceLang}->${args.targetLang}`,
		kind: 'exhausted_retries'
	});
	throw lastErr instanceof Error ? lastErr : new Error('translation_failed');
}

export async function translateFields(input: TranslateFieldsInput): Promise<TranslateFieldsResult> {
	const { sourceLang, targetLang, fields } = input;

	const uniqueList: { id: string; text: string }[] = [];
	let uid = 0;

	const textToId = new Map<string, string>();
	for (const f of fields) {
		const t = f.value;
		let id = textToId.get(t);
		if (!id) {
			id = `u${uid++}`;
			textToId.set(t, id);
			uniqueList.push({ id, text: t });
		}
	}

	let cacheHits = 0;
	let cacheMisses = 0;
	const resolved = new Map<string, string>();

	for (const u of uniqueList) {
		const ck = cacheKey(sourceLang, targetLang, u.text);
		const hit = cacheGet(ck);
		if (hit !== undefined) {
			cacheHits++;
			resolved.set(u.id, hit);
		} else {
			cacheMisses++;
		}
	}

	const toFetch = uniqueList.filter((u) => !resolved.has(u.id));
	const batches = chunkUniqueForUpstream(toFetch);
	let upstreamCalls = 0;

	if (batches.length > 0) {
		const batchResults = await mapWithConcurrency(batches, MAX_CONCURRENT_UPSTREAM, async (batch) => {
			upstreamCalls++;
			const map = await callOpenAiJson({ sourceLang, targetLang, items: batch });
			return { batch, map };
		});

		for (const { batch, map } of batchResults) {
			for (const item of batch) {
				const tr = map[item.id];
				if (typeof tr !== 'string') {
					console.error('[translation] missing_id_in_batch', {
						stage: 'merge',
						pair: `${sourceLang}->${targetLang}`,
						kind: 'missing_translation_id'
					});
					throw new Error('incomplete_translation');
				}
				const ck = cacheKey(sourceLang, targetLang, item.text);
				cacheSet(ck, tr);
				resolved.set(item.id, tr);
			}
		}
	}

	const outFields: TranslationField[] = fields.map((f) => {
		const id = textToId.get(f.value)!;
		const val = resolved.get(id);
		if (val === undefined) {
			throw new Error('internal_resolve');
		}
		return { key: f.key, value: val };
	});

	const messages = fieldsToMessages(outFields);

	return {
		fields: outFields,
		meta: {
			cacheHits,
			cacheMisses,
			upstreamCalls,
			batches: batches.length
		},
		i18n: toI18nResourceBundle(targetLang, messages)
	};
}

export function assertBearerToken(header: string | null, expected: string | undefined): boolean {
	if (!expected || expected.length === 0) return false;
	if (!header || !header.startsWith('Bearer ')) return false;
	const token = header.slice(7);
	const a = Buffer.from(token, 'utf8');
	const b = Buffer.from(expected, 'utf8');
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
