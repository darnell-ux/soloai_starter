import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILE = join(process.cwd(), 'data', 'mautic-contact-ids.json');

type StoreShape = Record<string, number>;

function loadRaw(): StoreShape {
	try {
		const raw = readFileSync(FILE, 'utf8');
		const j = JSON.parse(raw) as unknown;
		if (!j || typeof j !== 'object') return {};
		const out: StoreShape = {};
		for (const [k, v] of Object.entries(j)) {
			if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
		}
		return out;
	} catch {
		return {};
	}
}

export function getStoredContactId(key: string): number | undefined {
	const v = loadRaw()[key];
	return v;
}

export function setStoredContactId(key: string, contactId: number): void {
	const dir = dirname(FILE);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	const cur = loadRaw();
	cur[key] = contactId;
	writeFileSync(FILE, JSON.stringify(cur), 'utf8');
}
