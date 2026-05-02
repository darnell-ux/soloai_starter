import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getJobStatus } from '$lib/server/webhooks/localizationQueue';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.jobId;
	if (!id || id.length > 80) {
		throw error(400, { message: 'invalid_job_id' });
	}
	const rec = getJobStatus(id);
	if (!rec) {
		throw error(404, { message: 'job_not_found' });
	}
	return json({
		ok: true,
		status: rec.status,
		...(rec.error ? { error: rec.error } : {})
	});
};
