import { describe, it, expect, beforeEach } from 'vitest';
import { POST, OPTIONS } from './+server';
import { resetRateLimiter } from '$lib/server/rate-limiter';

const EXT_ORIGIN = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';

async function post(
	body: unknown,
	opts: { origin?: string; contentType?: string | null; ip?: string } = {}
): Promise<Response> {
	const { origin, contentType = 'application/json', ip = '203.0.113.7' } = opts;
	const headers = new Headers();
	if (contentType) headers.set('content-type', contentType);
	if (origin) headers.set('origin', origin);
	const request = new Request('https://app.test/api/taxnexus/assess', {
		method: 'POST',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
	// The handler only reads `request` + `getClientAddress`.
	return POST({ request, getClientAddress: () => ip } as unknown as Parameters<typeof POST>[0]);
}

async function options(origin?: string): Promise<Response> {
	const headers = new Headers();
	if (origin) headers.set('origin', origin);
	const request = new Request('https://app.test/api/taxnexus/assess', { method: 'OPTIONS', headers });
	return OPTIONS({ request } as unknown as Parameters<typeof OPTIONS>[0]);
}

describe('OPTIONS /api/taxnexus/assess (CORS preflight)', () => {
	beforeEach(() => resetRateLimiter());

	it('reflects a chrome-extension origin', async () => {
		const res = await options(EXT_ORIGIN);
		expect(res.status).toBe(204);
		expect(res.headers.get('access-control-allow-origin')).toBe(EXT_ORIGIN);
		expect(res.headers.get('vary')).toBe('Origin');
		expect(res.headers.get('access-control-allow-methods')).toContain('POST');
	});

	it('does NOT reflect an arbitrary web origin', async () => {
		const res = await options('https://evil.example.com');
		expect(res.status).toBe(204);
		expect(res.headers.get('access-control-allow-origin')).toBeNull();
	});
});

describe('POST /api/taxnexus/assess', () => {
	beforeEach(() => resetRateLimiter());

	it('returns an assessment with a correlation id + reflected CORS for a valid body', async () => {
		const res = await post(
			{ sales: 0, inventory: 1, hasEmployees: false, entityType: 'LLC' },
			{ origin: EXT_ORIGIN }
		);
		expect(res.status).toBe(200);
		expect(res.headers.get('x-request-id')).toBeTruthy();
		expect(res.headers.get('access-control-allow-origin')).toBe(EXT_ORIGIN);
		const data = await res.json();
		expect(typeof data.hasNexus).toBe('boolean');
		expect(Array.isArray(data.triggers)).toBe(true);
	});

	it('rejects a non-JSON content type (415) with a correlation id', async () => {
		const res = await post('not json', { contentType: 'text/plain' });
		expect(res.status).toBe(415);
		expect(res.headers.get('x-request-id')).toBeTruthy();
		const data = await res.json();
		expect(data.error).toBe('bad_request');
		expect(data.requestId).toBeTruthy();
	});

	it('rejects malformed JSON (400) with a correlation id', async () => {
		const res = await post('{ not valid json', { contentType: 'application/json' });
		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toBe('bad_request');
	});

	it('rejects an invalid field value (400) and echoes the validation reason', async () => {
		const res = await post({ sales: -5, inventory: 1, entityType: 'LLC' });
		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toBe('invalid_sales');
		expect(data.requestId).toBeTruthy();
	});

	it('rate-limits a burst from one IP (429 + Retry-After)', async () => {
		const ip = '198.51.100.42';
		let last: Response | undefined;
		for (let i = 0; i < 31; i++) {
			last = await post({ sales: 0, inventory: 0, entityType: 'LLC' }, { ip });
		}
		expect(last?.status).toBe(429);
		expect(last?.headers.get('retry-after')).toBeTruthy();
		expect(last?.headers.get('x-request-id')).toBeTruthy();
		const data = await last!.json();
		expect(data.error).toBe('rate_limited');
	});

	it('gives separate IPs independent budgets', async () => {
		for (let i = 0; i < 30; i++) {
			await post({ sales: 0, inventory: 0, entityType: 'LLC' }, { ip: '10.0.0.1' });
		}
		const other = await post({ sales: 0, inventory: 0, entityType: 'LLC' }, { ip: '10.0.0.2' });
		expect(other.status).toBe(200);
	});
});
