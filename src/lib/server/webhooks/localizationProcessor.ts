import { baseLocale, locales } from '$lib/paraglide/runtime';
import { getEnv } from '$lib/server/env';
import { getServerSecret } from '$lib/server/secrets';
import { translateFields } from '$lib/server/translation/service';
import {
	detectContentModel,
	extractTranslatableFields,
	mergeTranslatedStringsIntoAttributes,
	type ContentModelKind
} from './extractTranslatable';
import { logLocalizationStage } from './localizationLog';
import type { ParsedStrapiWebhook } from './parseStrapiWebhook';
import { parseStrapiWebhook } from './parseStrapiWebhook';

const READ_ONLY_ATTR = new Set([
	'locale',
	'createdAt',
	'updatedAt',
	'publishedAt',
	'localizations',
	'createdBy',
	'updatedBy'
]);

function pluralFor(kind: ContentModelKind): 'landing-pages' | 'features' | 'faqs' {
	if (kind === 'landingPage') return 'landing-pages';
	if (kind === 'feature') return 'features';
	return 'faqs';
}

function fieldsToMap(fields: { key: string; value: string }[]): Record<string, string> {
	return Object.fromEntries(fields.map((f) => [f.key, f.value]));
}

function resolveSourceLocale(parsed: ParsedStrapiWebhook): { locale: string; invalid: boolean } {
	const attr = parsed.entry.attributes;
	const fromAttr =
		attr && typeof attr === 'object' && !Array.isArray(attr)
			? (attr as Record<string, unknown>).locale
			: undefined;
	const raw = parsed.locale ?? (typeof fromAttr === 'string' ? fromAttr : null) ?? '';
	const trimmed = raw.trim();
	if (!trimmed) return { locale: baseLocale, invalid: true };
	const ok = (locales as readonly string[]).includes(trimmed);
	if (!ok) return { locale: baseLocale, invalid: true };
	return { locale: trimmed, invalid: false };
}

function stripServerFields(attr: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(attr)) {
		if (READ_ONLY_ATTR.has(k)) continue;
		out[k] = v;
	}
	return out;
}

function relationKeysSample(attr: Record<string, unknown>): string[] {
	const keys: string[] = [];
	for (const [k, v] of Object.entries(attr)) {
		if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
			const o = v as Record<string, unknown>;
			if ('data' in o || 'connect' in o) keys.push(k);
		}
	}
	return keys.slice(0, 12);
}

async function postStrapiLocalization(
	plural: 'landing-pages' | 'features' | 'faqs',
	entryId: string | number,
	targetLocale: string,
	data: Record<string, unknown>,
	jobId: string
): Promise<{ ok: boolean; status: number }> {
	const env = getEnv();
	const token = getServerSecret('STRAPI_API_TOKEN');
	if (!token) {
		logLocalizationStage('strapi_write_skipped', { jobId, reason: 'no_strapi_token' });
		return { ok: false, status: 0 };
	}
	const base = env.STRAPI_API_URL.replace(/\/$/, '');
	const url = `${base}/api/${plural}/${entryId}/localizations`;
	const body = { locale: targetLocale, ...data };
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(25_000)
	});
	if (!res.ok) {
		let sample = '';
		try {
			sample = (await res.text()).slice(0, 200);
		} catch {
			sample = '';
		}
		logLocalizationStage('strapi_localization_failed', {
			jobId,
			httpStatus: res.status,
			errorSample: sample.replace(/Bearer\s+\S+/gi, '[redacted]')
		});
	}
	return { ok: res.ok, status: res.status };
}

export async function processLocalizationJob(jobId: string, payload: unknown): Promise<void> {
	const parsed = parseStrapiWebhook(payload);
	if (!parsed) {
		logLocalizationStage('parse_failed', { jobId });
		return;
	}

	logLocalizationStage(
		'payload_received',
		{
			jobId,
			event: parsed.event,
			model: parsed.model,
			entryId: String(parsed.entryId),
			localeRaw: parsed.locale
		},
		{ samplePayload: payload }
	);

	const kind = detectContentModel(parsed.model);
	if (!kind) {
		logLocalizationStage('model_skipped', { jobId, model: parsed.model });
		return;
	}

	const env = getEnv();
	if (!getServerSecret('OPENAI_API_KEY')) {
		logLocalizationStage('openai_missing', { jobId });
		return;
	}

	const { locale: sourceLocale, invalid: localeInvalid } = resolveSourceLocale(parsed);
	const attrRaw = parsed.entry.attributes;
	const sourceAttr =
		attrRaw && typeof attrRaw === 'object' && !Array.isArray(attrRaw)
			? (attrRaw as Record<string, unknown>)
			: {};

	logLocalizationStage('locale_resolved', {
		jobId,
		sourceLocale,
		localeInvalid,
		relationFields: relationKeysSample(sourceAttr)
	});

	const fields = extractTranslatableFields(kind, parsed.entry);
	if (fields.length === 0) {
		logLocalizationStage('nothing_to_translate', { jobId, kind });
		return;
	}

	const targets = (locales as readonly string[]).filter((l) => l !== sourceLocale);
	const plural = pluralFor(kind);

	for (const targetLang of targets) {
		logLocalizationStage('translation_start', { jobId, sourceLocale, targetLang, kind });
		try {
			const result = await translateFields({ sourceLang: sourceLocale, targetLang, fields });
			const map = fieldsToMap(result.fields);
			const merged = mergeTranslatedStringsIntoAttributes(kind, { ...sourceAttr }, map);
			const stripped = stripServerFields(merged);
			const write = await postStrapiLocalization(plural, parsed.entryId, targetLang, stripped, jobId);
			logLocalizationStage('locale_sync', {
				jobId,
				targetLang,
				strapiStatus: write.status,
				strapiOk: write.ok,
				contentKind: kind
			});
		} catch (e) {
			const kindErr = e instanceof Error ? e.message.slice(0, 200) : 'error';
			logLocalizationStage('locale_failed', { jobId, targetLang, errorKind: kindErr });
		}
	}
}
