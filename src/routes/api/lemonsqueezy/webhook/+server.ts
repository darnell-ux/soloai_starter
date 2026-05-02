import { error, text } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import type { LemonWebhookEnvelope } from '$lib/types/lemonsqueezy';
import { getEnv } from '$lib/server/env';
import { getLemonSqueezyWebhookSecretOrThrow } from '$lib/server/lemon/config';
import { handleLemonSqueezyWebhook } from '$lib/server/lemon/webhook-dispatch';
import { verifyLemonSqueezySignature } from '$lib/server/lemon/webhook-signature';

export const config = {
	csrf: {
		checkOrigin: false
	}
};

export const POST: RequestHandler = async ({ request }) => {
	if (!getEnv().LEMON_SQUEEZY_ENABLED) {
		throw error(503, { message: 'lemonsqueezy_unconfigured' });
	}
	const raw = await request.text();
	const sig = request.headers.get('X-Signature');
	let secret: string;
	try {
		secret = getLemonSqueezyWebhookSecretOrThrow();
	} catch {
		throw error(503, { message: 'lemonsqueezy_unconfigured' });
	}
	if (!verifyLemonSqueezySignature(secret, raw, sig)) {
		throw error(400, { message: 'invalid_signature' });
	}
	let body: unknown;
	try {
		body = JSON.parse(raw) as unknown;
	} catch {
		throw error(400, { message: 'invalid_json' });
	}
	try {
		handleLemonSqueezyWebhook(raw, body as LemonWebhookEnvelope);
	} catch (e) {
		console.error('[lemon_webhook]', { stage: 'handler', kind: e instanceof Error ? e.name : 'unknown' });
		throw error(500, { message: 'webhook_handler_failed' });
	}
	return text('', { status: 200 });
};
