import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { compareEntityScenarios } from '$lib/server/taxnexus/compare-entities';

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
	const o = body as Record<string, unknown> | null;
	const raw = o?.netIncome;
	const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseFloat(raw) : NaN;
	if (!Number.isFinite(n) || n < 0 || n > 1e12) {
		throw error(400, { message: 'invalid_net_income' });
	}
	return json(compareEntityScenarios(n));
};
