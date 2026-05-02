import { createHash, randomUUID } from 'node:crypto';
import { logLocalizationStage } from './localizationLog';
import { processLocalizationJob } from './localizationProcessor';

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export type JobRecord = {
	id: string;
	status: JobStatus;
	createdAt: number;
	error?: string;
};

const jobs = new Map<string, JobRecord>();
const idempotency = new Map<string, number>();
const IDEMP_TTL_MS = 15 * 60_000;
const MAX_JOBS = 500;

function pruneIdempotency() {
	const now = Date.now();
	for (const [k, t] of idempotency) {
		if (now - t > IDEMP_TTL_MS) idempotency.delete(k);
	}
}

export function idempotencyKey(bodyText: string, event: string): string {
	return createHash('sha256').update(event).update('\0').update(bodyText.slice(0, 32_000)).digest('hex');
}

export function shouldDedupe(key: string): boolean {
	pruneIdempotency();
	if (idempotency.has(key)) return true;
	idempotency.set(key, Date.now());
	return false;
}

export function enqueueLocalizationJob(body: unknown): string {
	if (jobs.size > MAX_JOBS) {
		const first = jobs.keys().next().value as string | undefined;
		if (first) jobs.delete(first);
	}
	const id = randomUUID();
	jobs.set(id, { id, status: 'queued', createdAt: Date.now() });
	queueMicrotask(async () => {
		const rec = jobs.get(id);
		if (!rec) return;
		rec.status = 'processing';
		try {
			await processLocalizationJob(id, body);
			rec.status = 'done';
		} catch (e) {
			rec.status = 'failed';
			rec.error = e instanceof Error ? e.message.slice(0, 200) : 'error';
			logLocalizationStage('job_failed', { jobId: id, kind: rec.error });
		}
	});
	return id;
}

export function getJobStatus(id: string): JobRecord | null {
	return jobs.get(id) ?? null;
}
