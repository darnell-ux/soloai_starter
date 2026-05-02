/**
 * Mautic REST API client (server-only). Uses official env vars; never log secrets.
 * Auth: MAUTIC_API_TOKEN (Bearer) | OAuth2 client_credentials | HTTP Basic.
 */
import Bottleneck from 'bottleneck';
import { getEnv } from '../env';

export const MAUTIC_USER_AGENT = 'nucamp-soloai/1.0 (mautic-api-client)';

const REQUEST_TIMEOUT_MS = 10_000;
const RATE_MAX_PER_HOUR = 100;

export type MauticAuthMode = 'bearer_token' | 'oauth' | 'basic';

export type MauticClientConfig = {
	siteRoot: string;
	apiRoot: string;
	mode: MauticAuthMode;
	/** OAuth / API token / Basic (see mode). */
	apiToken?: string;
	clientId?: string;
	clientSecret?: string;
	username?: string;
	password?: string;
	/** Reservoir size for Bottleneck (requests per hour). */
	rateLimitPerHour: number;
};

export class MauticConfigError extends Error {
	readonly kind = 'config' as const;
	constructor(message: string) {
		super(message);
		this.name = 'MauticConfigError';
	}
}

export class MauticAuthError extends Error {
	readonly kind = 'auth' as const;
	constructor(message: string) {
		super(message);
		this.name = 'MauticAuthError';
	}
}

export class MauticRateLimitError extends Error {
	readonly kind = 'rate_limit' as const;
	constructor(
		message: string,
		readonly retryAfterSeconds?: number
	) {
		super(message);
		this.name = 'MauticRateLimitError';
	}
}

export class MauticTransportError extends Error {
	readonly kind = 'transport' as const;
	constructor(message: string) {
		super(message);
		this.name = 'MauticTransportError';
	}
}

/** Installation root (OAuth) and REST base .../api */
export function resolveMauticRoots(raw: string): { siteRoot: string; apiRoot: string } {
	const u = new URL(raw.trim());
	const origin = u.origin;
	let pathname = u.pathname.replace(/\/$/, '') || '';
	if (pathname.endsWith('/api')) {
		const withoutApi = pathname.slice(0, -4) || '';
		return {
			siteRoot: withoutApi ? origin + withoutApi : origin,
			apiRoot: origin + pathname
		};
	}
	return {
		siteRoot: origin + pathname,
		apiRoot: origin + pathname + '/api'
	};
}

export function mauticConfigFromEnv(): MauticClientConfig {
	const e = getEnv();
	if (!e.MAUTIC_API_URL) {
		throw new MauticConfigError('MAUTIC_API_URL is not configured');
	}
	const { siteRoot, apiRoot } = resolveMauticRoots(e.MAUTIC_API_URL);
	const rateLimitPerHour = e.MAUTIC_RATE_LIMIT;
	if (e.MAUTIC_API_TOKEN) {
		return {
			siteRoot,
			apiRoot,
			mode: 'bearer_token',
			apiToken: e.MAUTIC_API_TOKEN,
			rateLimitPerHour
		};
	}
	if (e.MAUTIC_CLIENT_ID && e.MAUTIC_CLIENT_SECRET) {
		return {
			siteRoot,
			apiRoot,
			mode: 'oauth',
			clientId: e.MAUTIC_CLIENT_ID,
			clientSecret: e.MAUTIC_CLIENT_SECRET,
			rateLimitPerHour
		};
	}
	if (e.MAUTIC_USERNAME && e.MAUTIC_PASSWORD) {
		return {
			siteRoot,
			apiRoot,
			mode: 'basic',
			username: e.MAUTIC_USERNAME,
			password: e.MAUTIC_PASSWORD,
			rateLimitPerHour
		};
	}
	throw new MauticConfigError('Mautic credentials are incomplete');
}

export class MauticApiClient {
	private readonly limiter: Bottleneck;
	private oauthAccessToken: string | null = null;
	private oauthExpiresAt = 0;

	constructor(private readonly cfg: MauticClientConfig) {
		const cap = cfg.rateLimitPerHour > 0 ? cfg.rateLimitPerHour : RATE_MAX_PER_HOUR;
		this.limiter = new Bottleneck({
			reservoir: cap,
			reservoirRefreshAmount: cap,
			reservoirRefreshInterval: 60 * 60 * 1000,
			maxConcurrent: 5
		});
	}

	contactsPath(extra = ''): string {
		return `/contacts${extra}`;
	}
	campaignsPath(extra = ''): string {
		return `/campaigns${extra}`;
	}
	emailsPath(extra = ''): string {
		return `/emails${extra}`;
	}
	segmentsPath(extra = ''): string {
		return `/segments${extra}`;
	}

	private async buildAuthorizationHeader(): Promise<string> {
		if (this.cfg.mode === 'bearer_token') {
			return `Bearer ${this.cfg.apiToken}`;
		}
		if (this.cfg.mode === 'basic') {
			const raw = `${this.cfg.username}:${this.cfg.password}`;
			const b64 = Buffer.from(raw, 'utf8').toString('base64');
			return `Basic ${b64}`;
		}
		await this.ensureOAuthAccessToken();
		return `Bearer ${this.oauthAccessToken}`;
	}

	private async ensureOAuthAccessToken(): Promise<void> {
		if (this.cfg.mode !== 'oauth') return;
		const skewMs = 30_000;
		if (this.oauthAccessToken && Date.now() < this.oauthExpiresAt - skewMs) return;

		const tokenUrl = `${this.cfg.siteRoot.replace(/\/$/, '')}/oauth/v2/token`;
		const body = new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: this.cfg.clientId!,
			client_secret: this.cfg.clientSecret!
		});

		let res: Response;
		try {
			res = await fetch(tokenUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'User-Agent': MAUTIC_USER_AGENT,
					Accept: 'application/json'
				},
				body,
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
			});
		} catch {
			throw new MauticTransportError('OAuth token request failed (network or timeout)');
		}

		if (!res.ok) {
			throw new MauticAuthError('OAuth token request rejected (credentials or Mautic configuration)');
		}

		let json: { access_token?: string; expires_in?: number } = {};
		try {
			json = (await res.json()) as typeof json;
		} catch {
			throw new MauticTransportError('OAuth token response was not valid JSON');
		}
		if (!json.access_token) {
			throw new MauticAuthError('OAuth token response missing access_token');
		}
		this.oauthAccessToken = json.access_token;
		const ttlSec = typeof json.expires_in === 'number' ? json.expires_in : 3600;
		this.oauthExpiresAt = Date.now() + ttlSec * 1000;
	}

	private invalidateOAuthToken(): void {
		this.oauthAccessToken = null;
		this.oauthExpiresAt = 0;
	}

	private async executeOnce(
		method: string,
		apiPath: string,
		init: RequestInit | undefined,
		authHeader: string
	): Promise<Response> {
		const url = `${this.cfg.apiRoot.replace(/\/$/, '')}${apiPath.startsWith('/') ? '' : '/'}${apiPath}`;
		try {
			return await fetch(url, {
				...init,
				method,
				headers: {
					Accept: 'application/json',
					'User-Agent': MAUTIC_USER_AGENT,
					Authorization: authHeader,
					...(init?.headers as Record<string, string> | undefined)
				},
				signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
			});
		} catch {
			throw new MauticTransportError('Mautic request failed (network or timeout)');
		}
	}

	async request(method: string, apiPath: string, init?: RequestInit): Promise<Response> {
		return this.limiter.schedule(async () => {
			let authHeader = await this.buildAuthorizationHeader();
			let res = await this.executeOnce(method, apiPath, init, authHeader);
			if (res.status === 401 && this.cfg.mode === 'oauth') {
				this.invalidateOAuthToken();
				authHeader = await this.buildAuthorizationHeader();
				res = await this.executeOnce(method, apiPath, init, authHeader);
			}
			if (res.status === 429) {
				const ra = res.headers.get('retry-after');
				const sec = ra ? Number.parseInt(ra, 10) : undefined;
				throw new MauticRateLimitError(
					'Mautic API rate limit exceeded',
					Number.isFinite(sec) ? sec : undefined
				);
			}
			if (res.status === 401) {
				throw new MauticAuthError('Mautic API rejected credentials');
			}
			return res;
		});
	}

	async requestJson<T>(method: string, apiPath: string, init?: RequestInit): Promise<T> {
		const res = await this.request(method, apiPath, init);
		if (!res.ok) {
			throw new MauticTransportError(`Mautic API HTTP ${res.status}`);
		}
		try {
			return (await res.json()) as T;
		} catch {
			throw new MauticTransportError('Mautic API returned invalid JSON');
		}
	}

	/** Lightweight authenticated check (contacts list, limit 1). */
	async verifyConnectivity(): Promise<{ ok: true } | { ok: false; error: string }> {
		try {
			const res = await this.request('GET', this.contactsPath('?limit=1'));
			if (res.ok) return { ok: true };
			return { ok: false, error: 'unexpected_response' };
		} catch (e) {
			if (e instanceof MauticAuthError) return { ok: false, error: 'auth' };
			if (e instanceof MauticRateLimitError) return { ok: false, error: 'rate_limit' };
			if (e instanceof MauticTransportError) return { ok: false, error: 'transport' };
			if (e instanceof MauticConfigError) return { ok: false, error: 'config' };
			return { ok: false, error: 'unknown' };
		}
	}
}

export function createMauticClientFromEnv(): MauticApiClient {
	return new MauticApiClient(mauticConfigFromEnv());
}
