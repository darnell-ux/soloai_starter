import type { MappedMauticContact } from './field-map';
import type { MauticApiClient } from './client';

type MauticListResponse = {
	total?: string | number;
	contacts?: Record<string, { id?: number; email?: string }> | Array<{ id?: number }>;
};

type MauticEntityResponse = {
	contact?: { id?: number };
};

function firstContactIdFromList(data: MauticListResponse): number | undefined {
	const contacts = data.contacts;
	if (!contacts) return undefined;
	if (Array.isArray(contacts)) {
		for (const c of contacts) {
			if (c?.id != null && Number.isFinite(Number(c.id))) return Number(c.id);
		}
		return undefined;
	}
	if (typeof contacts === 'object') {
		for (const c of Object.values(contacts)) {
			if (c?.id != null && Number.isFinite(Number(c.id))) return Number(c.id);
		}
	}
	return undefined;
}

/** Find by email via Mautic search (official REST). */
export async function findContactIdByEmail(
	client: MauticApiClient,
	email: string
): Promise<number | undefined> {
	const q = new URLSearchParams();
	q.set('where[0][col]', 'email');
	q.set('where[0][expr]', 'eq');
	q.set('where[0][val]', email);
	q.set('limit', '5');
	const res = await client.request('GET', `/contacts?${q}`);
	if (!res.ok) return undefined;
	let data: MauticListResponse;
	try {
		data = (await res.json()) as MauticListResponse;
	} catch {
		return undefined;
	}
	return firstContactIdFromList(data);
}

export async function createContact(
	client: MauticApiClient,
	payload: MappedMauticContact
): Promise<number> {
	const body = {
		email: payload.email,
		firstname: payload.firstname,
		lastname: payload.lastname
	};
	const res = await client.request('POST', '/contacts/new', {
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		throw new Error(`mautic_create_failed:${res.status}`);
	}
	let j: MauticEntityResponse | Record<string, unknown> = {};
	try {
		j = (await res.json()) as MauticEntityResponse;
	} catch {
		throw new Error('create_invalid_json');
	}
	const id =
		(j as MauticEntityResponse).contact?.id ??
		(typeof (j as { contact?: { id?: unknown } }).contact?.id === 'number'
			? (j as { contact: { id: number } }).contact.id
			: undefined);
	if (id == null || !Number.isFinite(Number(id))) throw new Error('create_missing_id');
	return Number(id);
}

export async function updateContact(
	client: MauticApiClient,
	contactId: number,
	payload: MappedMauticContact
): Promise<void> {
	const body = {
		email: payload.email,
		firstname: payload.firstname,
		lastname: payload.lastname
	};
	const res = await client.request('PATCH', `/contacts/${contactId}/edit`, {
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		throw new Error(`update_failed:${res.status}`);
	}
}

export async function addContactToSegment(
	client: MauticApiClient,
	segmentId: number,
	contactId: number
): Promise<void> {
	const res = await client.request(
		'POST',
		`/segments/${segmentId}/contact/${contactId}/add`,
		{}
	);
	if (!res.ok) {
		throw new Error(`segment_add_failed:${res.status}`);
	}
}
