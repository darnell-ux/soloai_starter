import { logMauticStage } from './sync-log';
import type { MauticSyncJob } from './sync-processor';
import { processMauticSyncJob } from './sync-processor';

const MAX_QUEUED = 2000;
let queueDepth = 0;

export function enqueueMauticSync(job: MauticSyncJob): void {
	if (queueDepth >= MAX_QUEUED) {
		logMauticStage('queue_drop');
		return;
	}
	queueDepth++;
	queueMicrotask(async () => {
		try {
			await processMauticSyncJob(job);
		} catch (e) {
			logMauticStage('sync_failed', {
				kind: e instanceof Error ? e.name : 'unknown'
			});
		} finally {
			queueDepth--;
		}
	});
}
