import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { assessNexus, parseNexusAssessBody } from '$lib/server/taxnexus/assess-nexus';
import { readJsonBody } from '$lib/server/http/read-json';

export const POST: RequestHandler = async ({ request }) => {
	const body = await readJsonBody(request);
	const parsed = parseNexusAssessBody(body);
	if ('error' in parsed) {
		throw error(400, { message: parsed.error });
	}
	return json(assessNexus(parsed));
};
