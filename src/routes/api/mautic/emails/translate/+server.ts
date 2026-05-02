import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getEnv } from '$lib/server/env';
import {
	MauticConfigError,
	createMauticClientFromEnv
} from '$lib/server/mautic/client';
import {
	fetchSourceEmail,
	summarizeSourceEmail,
	translateEmailForLocales,
	validateTranslateEmailRequest
} from '$lib/server/mautic/email-translate';
import { getSecretRotationState, getServerSecret, matchBearerToRotation } from '$lib/server/secrets';

const ipBuckets = new Map<string, { n: number; start: number }>();
const IP_WINDOW_MS = 60_000;
const IP_MAX_PER_WINDOW = 20;

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

	const ct = event.request.headers.get('content-type')?.toLowerCase() ?? '';
	if (!ct.includes('application/json')) {
		throw error(415, { message: 'unsupported_media_type' });
	}

	const ip = event.getClientAddress();
	if (!allowClient(ip)) {
		console.error('[email_translate]', { stage: 'route', kind: 'rate_limited' });
		throw error(429, { message: 'rate_limited' });
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, { message: 'invalid_json' });
	}

	const v = validateTranslateEmailRequest(body);
	if (!v.ok) {
		console.error('[email_translate]', { stage: 'validation', kind: v.reason });
		throw error(400, { message: v.reason });
	}
	const { emailId, locales, linkToParent, overwrite } = v.data;

	let client;
	try {
		client = createMauticClientFromEnv();
	} catch (e) {
		if (e instanceof MauticConfigError) throw error(503, { message: 'mautic_not_configured' });
		throw error(503, { message: 'mautic_not_configured' });
	}

	console.error('[email_translate]', { stage: 'fetch', emailId });

	const fetched = await fetchSourceEmail(client, emailId);
	if (!fetched.ok) {
		const map: Record<string, number> = {
			not_found: 404,
			forbidden: 403,
			auth: 502,
			transport: 502,
			upstream: 502,
			invalid_json: 502,
			invalid_shape: 502,
			unknown: 502
		};
		console.error('[email_translate]', { stage: 'fetch', emailId, kind: fetched.kind });
		throw error(map[fetched.kind] ?? 502, { message: `source_${fetched.kind}` });
	}

	const sourceEmail = summarizeSourceEmail(fetched.email);

	console.error('[email_translate]', { stage: 'translate_batch', emailId, n: locales.length });

	const results = await translateEmailForLocales({
		client,
		initialSource: fetched.email,
		sourceId: emailId,
		locales,
		linkToParent,
		overwrite
	});

	return json({
		ok: true,
		sourceEmail,
		results
	});
};
