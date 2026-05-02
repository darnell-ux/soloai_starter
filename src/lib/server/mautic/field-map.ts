export type MappedMauticContact = {
	email: string;
	firstname: string;
	lastname: string;
	/** ISO-like locale tag, truncated */
	preferred_locale?: string;
};

const EMAIL_MAX = 254;
const NAME_MAX = 120;
const LOCALE_MAX = 32;

export function sanitizeEmail(raw: string | undefined | null): string | null {
	if (raw === undefined || raw === null) return null;
	const s = String(raw).trim().toLowerCase();
	if (s.length === 0 || s.length > EMAIL_MAX) return null;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
	return s;
}

export function splitName(full: string | undefined | null): { firstname: string; lastname: string } {
	const s = String(full ?? '')
		.trim()
		.slice(0, NAME_MAX);
	if (s.length === 0) return { firstname: 'User', lastname: '' };
	const parts = s.split(/\s+/);
	if (parts.length === 1) return { firstname: parts[0]!, lastname: '' };
	return { firstname: parts[0]!, lastname: parts.slice(1).join(' ') };
}

export function sanitizeLocale(raw: string | undefined | null): string | undefined {
	if (!raw) return undefined;
	const t = String(raw).trim().slice(0, LOCALE_MAX);
	if (!/^[a-zA-Z0-9_-]+$/.test(t)) return undefined;
	return t;
}

export function mapUserToMauticContact(input: {
	email: string;
	name?: string | null;
	locale?: string | null;
}): MappedMauticContact | null {
	const email = sanitizeEmail(input.email);
	if (!email) return null;
	const { firstname, lastname } = splitName(input.name);
	const loc = sanitizeLocale(input.locale);
	const out: MappedMauticContact = { email, firstname, lastname };
	if (loc) out.preferred_locale = loc;
	return out;
}
