import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { assessNexus, parseNexusAssessBody } from '$lib/server/taxnexus/assess-nexus';

// This endpoint is also called by the TaxNexus Nexus Alert browser extension,
// whose service worker fetches from a chrome-extension:// (or moz-extension://)
// origin. It is unauthenticated and returns only generic CA nexus-threshold
// logic, so we allow cross-origin access by reflecting an extension Origin.
// Keeping CORS here (rather than host_permissions in the extension) preserves
// the extension's minimal-permissions design. Same-origin app calls are
// unaffected (no Origin reflection needed).
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

export const OPTIONS: RequestHandler = ({ request }) =>
	new Response(null, { status: 204, headers: corsHeaders(request) });

export const POST: RequestHandler = async ({ request }) => {
	const ct = request.headers.get('content-type')?.toLowerCase() ?? '';
	if (!ct.includes('application/json')) {
		throw error(415, { message: 'unsupported_media_type' });
	}
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, { message: 'invalid_json' });
	}
	const parsed = parseNexusAssessBody(body);
	if ('error' in parsed) {
		throw error(400, { message: parsed.error });
	}
	return json(assessNexus(parsed), { headers: corsHeaders(request) });
};
