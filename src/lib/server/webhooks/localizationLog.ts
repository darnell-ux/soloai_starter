const REDACT_KEYS = new Set([
	'authorization',
	'password',
	'token',
	'secret',
	'apikey',
	'appkeys',
	'jwt',
	'strapi_api_token',
	'openai_api_key'
]);

function redactKey(k: string): boolean {
	const l = k.toLowerCase();
	return REDACT_KEYS.has(l) || l.includes('secret') || l.includes('password') || l.includes('token');
}

export function redactForLog(obj: unknown, maxDepth = 4, maxKeys = 40): unknown {
	if (maxDepth <= 0) return '[max-depth]';
	if (obj === null || typeof obj !== 'object') return obj;
	if (Array.isArray(obj)) {
		const slice = obj.slice(0, 25);
		return slice.map((x) => redactForLog(x, maxDepth - 1, maxKeys));
	}
	const out: Record<string, unknown> = {};
	let n = 0;
	for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
		if (n++ >= maxKeys) {
			out['__truncated__'] = true;
			break;
		}
		if (redactKey(k)) {
			out[k] = '[redacted]';
			continue;
		}
		if (v !== null && typeof v === 'object') {
			out[k] = redactForLog(v, maxDepth - 1, maxKeys);
		} else if (typeof v === 'string' && v.length > 500) {
			out[k] = `${v.slice(0, 500)}…[len=${v.length}]`;
		} else {
			out[k] = v;
		}
	}
	return out;
}

export function logLocalizationStage(
	stage: string,
	data: Record<string, unknown>,
	opts?: { samplePayload?: unknown }
): void {
	const line: Record<string, unknown> = { stage, ...data };
	if (opts?.samplePayload !== undefined) {
		line.sample = redactForLog(opts.samplePayload);
	}
	console.log('[localization]', JSON.stringify(line));
}
