import { error } from '@sveltejs/kit';

/**
 * Shared JSON request-body guard for API routes.
 *
 * Rejects non-`application/json` requests with 415 and unparseable bodies with
 * 400 `invalid_json`, then returns the parsed value as `unknown` for the caller
 * to validate (e.g. with Zod). Keeps the content-type/parse preamble in one
 * place so routes don't hand-copy it (and can't drift on status/message).
 */
export async function readJsonBody(request: Request): Promise<unknown> {
	const ct = request.headers.get('content-type')?.toLowerCase() ?? '';
	if (!ct.includes('application/json')) {
		throw error(415, { message: 'unsupported_media_type' });
	}
	try {
		return await request.json();
	} catch {
		throw error(400, { message: 'invalid_json' });
	}
}
