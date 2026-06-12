import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { calculateFtbPenalties } from '$lib/server/taxnexus/penalties';
import { FTB_CONSTANTS } from '$lib/server/taxnexus/ftb-constants';

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
	const o = body as Record<string, unknown>;
	const ml =
		typeof o.monthsLate === 'number'
			? o.monthsLate
			: typeof o.monthsLate === 'string'
				? Number.parseFloat(o.monthsLate)
				: NaN;
	const taxRaw = o.taxOwed;
	let tax =
		typeof taxRaw === 'number'
			? taxRaw
			: typeof taxRaw === 'string'
				? Number.parseFloat(taxRaw)
				: NaN;

	if (!Number.isFinite(ml) || ml < 0 || ml > 120) {
		throw error(400, { message: 'invalid_months_late' });
	}
	if (taxRaw === undefined || taxRaw === null || taxRaw === '') {
		tax = FTB_CONSTANTS.MIN_FRANCHISE_TAX;
	} else if (!Number.isFinite(tax) || tax < 0 || tax > 1e15) {
		throw error(400, { message: 'invalid_tax_owed' });
	}

	return json(calculateFtbPenalties(ml, tax));
};
