import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getEnv } from '$lib/server/env';
import { getSecretRotationState, getServerSecret, matchBearerToRotation } from '$lib/server/secrets';
import { translateFields, validateTranslateInput } from '$lib/server/translation/service';

const ipBuckets = new Map<string, { n: number; start: number }>();
const IP_WINDOW_MS = 60_000;
const IP_MAX_PER_WINDOW = 40;

function allowClient(ip: string): boolean {
	const now = Date.now();
	const cur = ipBuckets.get(ip);
	if (!cur || now - cur.start > IP_WINDOW_MS) {
		ipBuckets.set(ip, { n: 1, start: now });
		return true;
	}
	if (cur.n >= IP_MAX_PER_WINDOW) return false;
	cur.n += 1;
	return true;
}

export const POST: RequestHandler = async (event) => {
	const env = getEnv();
	if (!env.TRANSLATION_ENABLED) {
		throw error(503, { message: 'translation_disabled' });
	}
	const rot = getSecretRotationState('TRANSLATION_API_TOKEN');
	if (!rot.primary && !rot.next) {
		throw error(503, { message: 'translation_route_not_configured' });
	}
	const auth = event.request.headers.get('authorization');
	const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
	if (!matchBearerToRotation(bearer, rot)) {
		throw error(401, { message: 'unauthorized' });
	}
	if (!getServerSecret('OPENAI_API_KEY')) {
		throw error(503, { message: 'openai_not_configured' });
	}

	const ip = event.getClientAddress();
	if (!allowClient(ip)) {
		console.error('[translation] rate_limited', { stage: 'route', kind: 'client_window' });
		throw error(429, { message: 'rate_limited' });
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, { message: 'invalid_json' });
	}

	const v = validateTranslateInput(body);
	if (!v.ok) {
		throw error(400, { message: v.reason });
	}

	try {
		const result = await translateFields(v.data);
		return json({
			ok: true,
			fields: result.fields,
			meta: result.meta,
			i18n: result.i18n
		});
	} catch (e) {
		const kind = e instanceof Error ? e.message : 'unknown';
		console.error('[translation] route_failed', { stage: 'translate', pair: `${v.data.sourceLang}->${v.data.targetLang}`, kind });
		throw error(502, { message: 'translation_failed' });
	}
};
