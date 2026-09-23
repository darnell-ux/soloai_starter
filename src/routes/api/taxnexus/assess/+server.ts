import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { assessNexus, parseNexusAssessBody } from '$lib/server/taxnexus/assess-nexus';
import { readJsonBody } from '$lib/server/http/read-json';
import { rateLimit } from '$lib/server/rate-limiter';

// CORS reflects chrome-extension:// and moz-extension:// origins. This was
// added for the TaxNexus Nexus Alert browser extension, which no longer uses
// it: as of 2026-09-22 the extension computes its assessment locally and makes
// no network requests at all (it only ever sent three constants plus one
// boolean, so the call could return only two possible answers — see
// extension/README.md → "No network access at all").
//
// The reflection is kept because the endpoint is public and unauthenticated
// either way, and a future extension or integration may want it. If you would
// rather shrink the surface, removing the extension-origin branch of
// corsHeaders() is safe — nothing ships today that depends on it.
//
// Same-origin app calls are unaffected (no Origin reflection needed).
//
// Because it is public + unauthenticated, it is rate-limited per client IP and
// every response carries a correlation id (X-Request-Id). Logging is content-free
// — the request body (a seller's sales/inventory figures) is never logged.

/** Public endpoint: modest per-IP budget, generous enough for interactive use. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

function corsHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get('origin') ?? '';
	const isExtension =
		origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');
	const headers: Record<string, string> = {
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'content-type',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin'
	};
	if (isExtension) headers['Access-Control-Allow-Origin'] = origin;
	return headers;
}

/**
 * Client identity for rate limiting. `getClientAddress()` returns the nginx
 * proxy address in production, so prefer the left-most `X-Forwarded-For` hop.
 */
function clientIp(request: Request, fallback: () => string): string {
	const xff = request.headers.get('x-forwarded-for');
	const first = xff?.split(',')[0]?.trim();
	return first || fallback();
}

export const OPTIONS: RequestHandler = ({ request }) =>
	new Response(null, { status: 204, headers: corsHeaders(request) });

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const requestId = randomUUID();
	const startedAt = Date.now();
	const baseHeaders = { ...corsHeaders(request), 'X-Request-Id': requestId };

	const log = (kind: string) =>
		console.info('[assess]', { requestId, kind, latencyMs: Date.now() - startedAt });
	const fail = (status: number, body: Record<string, unknown>, extra: Record<string, string> = {}) =>
		json({ ...body, requestId }, { status, headers: { ...baseHeaders, ...extra } });

	// --- rate limiting (per client IP) ----------------------------------------
	const rl = rateLimit(`assess:ip:${clientIp(request, getClientAddress)}`, {
		windowMs: RATE_WINDOW_MS,
		max: RATE_MAX
	});
	if (rl.limited) {
		log('rate_limited');
		return fail(
			429,
			{ error: 'rate_limited' },
			{ 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) }
		);
	}

	// --- content type + JSON parse (shared guard; convert its throw to keep id + CORS) ---
	let raw: unknown;
	try {
		raw = await readJsonBody(request);
	} catch (e) {
		const status = typeof (e as { status?: unknown })?.status === 'number' ? (e as { status: number }).status : 400;
		log('bad_request');
		return fail(status, { error: 'bad_request' });
	}

	// --- validation -----------------------------------------------------------
	const parsed = parseNexusAssessBody(raw);
	if ('error' in parsed) {
		log('invalid_body');
		return fail(400, { error: parsed.error });
	}

	log('ok');
	return json(assessNexus(parsed), { headers: baseHeaders });
};
