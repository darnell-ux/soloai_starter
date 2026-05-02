import { getEnv } from '../env';
import {
	createMauticClientFromEnv,
	MauticApiClient,
	MauticAuthError,
	MauticConfigError,
	MauticRateLimitError,
	MauticTransportError
} from './client';
import {
	addContactToSegment,
	createContact,
	findContactIdByEmail,
	updateContact
} from './contacts';
import { getStoredContactId, setStoredContactId } from './contact-id-store';
import { mapUserToMauticContact } from './field-map';
import { logMauticStage } from './sync-log';

export type MauticSyncJob = {
	kind: 'auth_user' | 'lead_form';
	/** Stable key for app users */
	userId?: string;
	/** Dedupe key for anonymous leads (e.g. lead:email@…) */
	leadStoreKey?: string;
	email: string;
	name?: string | null;
	locale?: string | null;
	marketingOptIn: boolean;
	/** When true (e.g. post-registration), may attach MAUTIC_DEFAULT_SEGMENT_ID if configured. */
	addDefaultSegment: boolean;
};

function storageKey(job: MauticSyncJob): string {
	if (job.userId) return job.userId;
	if (job.leadStoreKey) return job.leadStoreKey;
	const em = String(job.email).trim().toLowerCase();
	return `lead:${em}`;
}

function delay(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
	let last: unknown;
	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			return await fn();
		} catch (e) {
			last = e;
			if (e instanceof MauticAuthError) throw e;
			if (e instanceof MauticConfigError) throw e;
			if (e instanceof MauticRateLimitError) {
				const ms = Math.min(
					30_000,
					Math.max(500, (e.retryAfterSeconds ?? 1 + attempt) * 1000)
				);
				logMauticStage('rate_limit_retry', { label, attempt: String(attempt + 1) });
				await delay(ms);
				continue;
			}
			if (e instanceof MauticTransportError && attempt < 3) {
				const ms = Math.min(8000, 500 * 2 ** attempt);
				logMauticStage('transport_retry', { label, attempt: String(attempt + 1) });
				await delay(ms);
				continue;
			}
			if (attempt < 3 && !(e instanceof MauticTransportError)) {
				const ms = Math.min(8000, 500 * 2 ** attempt);
				await delay(ms);
				continue;
			}
			throw e;
		}
	}
	throw last;
}

export async function processMauticSyncJob(job: MauticSyncJob): Promise<void> {
	const env = getEnv();
	if (!env.MAUTIC_API_URL) return;

	const mapped = mapUserToMauticContact({
		email: job.email,
		name: job.name,
		locale: job.locale
	});
	if (!mapped) {
		logMauticStage('sync_skip_invalid_email');
		return;
	}

	let client: MauticApiClient;
	try {
		client = createMauticClientFromEnv();
	} catch (e) {
		logMauticStage('sync_skip_no_client');
		return;
	}

	const key = storageKey(job);
	let contactId = getStoredContactId(key) ?? null;

	await withRetry('upsert', async () => {
		let cid = contactId ?? (await findContactIdByEmail(client, mapped.email));
		if (cid != null) {
			await updateContact(client, cid, mapped);
			contactId = cid;
		} else {
			contactId = await createContact(client, mapped);
		}
	});

	if (contactId == null) return;
	setStoredContactId(key, contactId);

	const segmentRaw = env.MAUTIC_DEFAULT_SEGMENT_ID;
	const wantSegment =
		segmentRaw !== undefined &&
		(job.kind === 'auth_user'
			? job.addDefaultSegment || job.marketingOptIn
			: job.marketingOptIn);
	if (!wantSegment || segmentRaw === undefined) {
		logMauticStage('sync_ok', { kind: job.kind });
		return;
	}
	const segmentId = Number.parseInt(segmentRaw, 10);
	if (!Number.isFinite(segmentId)) {
		logMauticStage('sync_segment_skip_invalid_id');
		return;
	}

	await withRetry('segment', async () => {
		await addContactToSegment(client, segmentId, contactId!);
	});

	logMauticStage('sync_ok', { kind: job.kind, segment: '1' });
}
