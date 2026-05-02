import { getSecretRotationState, matchBearerToRotation } from '$lib/server/secrets';

export function verifyStrapiWebhookAuth(request: Request): { ok: boolean; reason: string } {
	const rot = getSecretRotationState('STRAPI_WEBHOOK_SECRET');
	if (!rot.primary && !rot.next) {
		if (process.env.NODE_ENV === 'production') {
			return { ok: false, reason: 'webhook_secret_not_configured' };
		}
		return { ok: true, reason: 'dev_no_secret' };
	}
	const raw = request.headers.get('authorization')?.trim() ?? '';
	const bearer = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw;
	const ok = matchBearerToRotation(bearer, rot);
	return { ok, reason: ok ? 'ok' : 'mismatch' };
}
