import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { logLocalizationStage } from '$lib/server/webhooks/localizationLog';
import { enqueueLocalizationJob, idempotencyKey, shouldDedupe } from '$lib/server/webhooks/localizationQueue';
import { LOCALIZATION_EVENTS, parseStrapiWebhook } from '$lib/server/webhooks/parseStrapiWebhook';
import { verifyStrapiWebhookAuth } from '$lib/server/webhooks/webhookVerify';

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
	const v = verifyStrapiWebhookAuth(event.request);
	if (!v.ok) {
		throw error(401, { message: 'unauthorized' });
	}
	const ip = event.getClientAddress();
	if (!allowClient(ip)) {
		logLocalizationStage('webhook_rate_limited', { stage: 'route', kind: 'client_window' });
		throw error(429, { message: 'rate_limited' });
	}

	let rawText: string;
	try {
		rawText = await event.request.text();
	} catch {
		throw error(400, { message: 'invalid_body' });
	}

	let body: unknown;
	try {
		body = rawText ? JSON.parse(rawText) : null;
	} catch {
		throw error(400, { message: 'invalid_json' });
	}

	const o = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
	const eventName = String(o?.event ?? '');
	if (!LOCALIZATION_EVENTS.has(eventName)) {
		return json({ ok: true, ignored: true }, { status: 200 });
	}

	const parsed = parseStrapiWebhook(body);
	if (!parsed) {
		throw error(400, { message: 'invalid_payload' });
	}

	const key = idempotencyKey(rawText, eventName);
	if (shouldDedupe(key)) {
		return json({ ok: true, deduped: true }, { status: 200 });
	}

	const jobId = enqueueLocalizationJob(body);
	return json({ ok: true, jobId }, { status: 202 });
};
