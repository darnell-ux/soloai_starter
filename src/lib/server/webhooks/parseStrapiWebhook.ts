export type ParsedStrapiWebhook = {
	event: string;
	model: string;
	entryId: string | number;
	locale: string | null;
	entry: Record<string, unknown>;
};

export function parseStrapiWebhook(body: unknown): ParsedStrapiWebhook | null {
	if (!body || typeof body !== 'object') return null;
	const o = body as Record<string, unknown>;
	const event = String(o.event ?? '');
	const model = String(o.model ?? '');
	const entry = o.entry;
	if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
	const e = entry as Record<string, unknown>;
	const rawId = e.documentId ?? e.id;
	if (rawId === undefined || rawId === null) return null;
	let entryId: string | number;
	if (typeof rawId === 'number' && Number.isFinite(rawId)) {
		entryId = rawId;
	} else if (typeof rawId === 'string') {
		const t = rawId.trim();
		if (!t) return null;
		entryId = /^\d+$/.test(t) ? Number(t) : t;
	} else return null;

	let locale: string | null = null;
	const attr = e.attributes;
	if (attr && typeof attr === 'object' && !Array.isArray(attr)) {
		const loc = (attr as Record<string, unknown>).locale;
		if (typeof loc === 'string') locale = loc;
	}
	if (!locale && typeof e.locale === 'string') locale = e.locale;

	return { event, model, entryId, locale, entry: e };
}

export const LOCALIZATION_EVENTS = new Set(['entry.create', 'entry.update', 'entry.publish']);
