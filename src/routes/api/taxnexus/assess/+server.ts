import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { assessNexus, parseNexusAssessBody } from '$lib/server/taxnexus/assess-nexus';

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
	return json(assessNexus(parsed));
};
