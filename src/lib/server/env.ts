/**
 * Single source of truth for environment validation (aligned with .env.example).
 * Never log or throw raw env values.
 */

export type NodeEnv = 'development' | 'production' | 'test';

export type ValidatedEnv = {
	NODE_ENV: NodeEnv;
	/** Server-side Strapi REST origin (alias: legacy STRAPI_BASE_URL). */
	STRAPI_API_URL: string;
	/** Public Strapi origin for absolute URLs (defaults to STRAPI_API_URL). */
	PUBLIC_STRAPI_URL: string;
	/** @deprecated Use STRAPI_API_URL; kept for backward compatibility. */
	STRAPI_BASE_URL: string;
	STRAPI_API_TOKEN: string | undefined;
	OPENAI_API_KEY: string | undefined;
	OPENAI_MODEL: string;
	TRANSLATION_ENABLED: boolean;
	TRANSLATION_API_TOKEN: string | undefined;
	COMPOSE_PROJECT_NAME: string;
	COMPOSE_NETWORK: string | undefined;
	MYSQL_HOST: string | undefined;
	BASE_PATH: string | undefined;
	MYSQL_PORT: number;
	MYSQL_DATABASE: string | undefined;
	MYSQL_USER: string | undefined;
	MYSQL_STRAPI_USER: string | undefined;
	MYSQL_PASSWORD: string | undefined;
	MYSQL_ROOT_PASSWORD: string | undefined;
	JWT_SECRET: string | undefined;
	ADMIN_JWT_SECRET: string | undefined;
	APP_KEYS: string | undefined;
	API_TOKEN_SALT: string | undefined;
	TRANSFER_TOKEN_SALT: string | undefined;
	DATABASE_URL: string | undefined;
	/** Strapi → SvelteKit webhook shared secret (Bearer). Optional in development only. */
	STRAPI_WEBHOOK_SECRET: string | undefined;
	/**
	 * Mautic REST base (installation root or …/api). Optional unless integration is enabled.
	 * When set, one auth method is required: MAUTIC_API_TOKEN, OAuth client, or Basic user/password.
	 */
	MAUTIC_API_URL: string | undefined;
	MAUTIC_CLIENT_ID: string | undefined;
	MAUTIC_CLIENT_SECRET: string | undefined;
	MAUTIC_API_TOKEN: string | undefined;
	MAUTIC_USERNAME: string | undefined;
	MAUTIC_PASSWORD: string | undefined;
	MAUTIC_DEFAULT_SEGMENT_ID: string | undefined;
	/** Max Mautic REST requests per hour (integration throttling). */
	MAUTIC_RATE_LIMIT: number;
	/**
	 * Stripe (optional). When enabled, all five STRIPE_* vars are set; secrets are never logged.
	 * Use getStripeConfig() for subscription/checkout routes.
	 */
	STRIPE_ENABLED: boolean;
	STRIPE_PUBLISHABLE_KEY: string | undefined;
	STRIPE_SUCCESS_URL: string | undefined;
	STRIPE_CANCEL_URL: string | undefined;
	/**
	 * Lemon Squeezy (optional). When enabled, API key/webhook secret stay in process.env for server-only use.
	 */
	LEMON_SQUEEZY_ENABLED: boolean;
	LEMON_SQUEEZY_ENVIRONMENT: 'sandbox' | 'production' | undefined;
	LEMON_SQUEEZY_STORE_ID: string | undefined;
	LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL: string | undefined;
	LEMON_SQUEEZY_CHECKOUT_CANCEL_URL: string | undefined;
};

const PROD_SECRET_MIN = 32;

export const SECRET_KEYS = [
	'STRAPI_API_TOKEN',
	'OPENAI_API_KEY',
	'TRANSLATION_API_TOKEN',
	'MYSQL_PASSWORD',
	'MYSQL_ROOT_PASSWORD',
	'JWT_SECRET',
	'ADMIN_JWT_SECRET',
	'APP_KEYS',
	'API_TOKEN_SALT',
	'TRANSFER_TOKEN_SALT',
	'STRAPI_WEBHOOK_SECRET',
	'MAUTIC_API_TOKEN',
	'MAUTIC_CLIENT_SECRET',
	'MAUTIC_PASSWORD',
	'STRIPE_SECRET_KEY',
	'STRIPE_WEBHOOK_SECRET',
	'LEMON_SQUEEZY_API_KEY'
] as const;

let validated: ValidatedEnv | null = null;

function isProduction(): boolean {
	return process.env.NODE_ENV === 'production';
}

function fail(key: string, reason: string): never {
	console.error(`${key}: ${reason}`);
	process.exit(1);
}

function parseNodeEnv(): NodeEnv {
	const raw = process.env.NODE_ENV;
	if (raw === undefined || raw === '') return 'development';
	if (raw === 'development' || raw === 'production' || raw === 'test') return raw;
	fail('NODE_ENV', 'expected development, production, or test');
}

function parseBooleanStrict(key: string, raw: string | undefined, defaultValue: boolean): boolean {
	if (raw === undefined || raw === '') return defaultValue;
	if (raw === 'true') return true;
	if (raw === 'false') return false;
	fail(key, 'expected true or false');
}

function parsePort(key: string, raw: string | undefined, defaultValue: number): number {
	if (raw === undefined || raw === '') return defaultValue;
	if (!/^\d+$/.test(raw)) fail(key, 'expected integer port');
	const n = Number(raw);
	if (n < 1 || n > 65535) fail(key, 'expected integer port');
	return n;
}

function parseHttpUrl(key: string, raw: string | undefined, opts: { requiredInProduction: boolean }): string {
	const prod = isProduction();
	if (raw === undefined || raw === '') {
		if (prod && opts.requiredInProduction) fail(key, 'required in production');
		return 'http://localhost:1337';
	}
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		fail(key, 'expected valid URL');
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		fail(key, 'expected http or https URL');
	}
	if (prod && url.protocol === 'http:') {
		fail(key, 'expected HTTPS URL in production');
	}
	return raw;
}

function parseDatabaseUrl(key: string, raw: string | undefined, requiredInProduction: boolean): string | undefined {
	const prod = isProduction();
	if (raw === undefined || raw === '') {
		if (prod && requiredInProduction) fail(key, 'required in production');
		return undefined;
	}
	try {
		const url = new URL(raw);
		if (url.protocol !== 'mysql:') {
			fail(key, 'expected mysql: database URL');
		}
	} catch {
		fail(key, 'expected valid database URL');
	}
	return raw;
}

function assertSecretInProduction(key: string, raw: string | undefined): void {
	if (!isProduction()) return;
	if (raw === undefined || raw === '') return;
	if (raw.length < PROD_SECRET_MIN) {
		fail(key, `expected secret with length >= ${PROD_SECRET_MIN} in production`);
	}
}

function parseOptionalMauticUrl(key: string, raw: string | undefined): string | undefined {
	if (raw === undefined || raw === '') return undefined;
	const prod = isProduction();
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		fail(key, 'expected valid URL');
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		fail(key, 'expected http or https URL');
	}
	if (prod && url.protocol === 'http:') {
		fail(key, 'expected HTTPS URL in production');
	}
	return raw;
}

function parseMauticRateLimit(raw: string | undefined): number {
	if (raw === undefined || raw === '') return 100;
	if (!/^\d+$/.test(raw)) fail('MAUTIC_RATE_LIMIT', 'expected positive integer');
	const n = Number(raw);
	if (n < 1 || n > 1_000_000) fail('MAUTIC_RATE_LIMIT', 'expected 1–1000000');
	return n;
}

function parseMauticAuth(): {
	MAUTIC_API_URL: string | undefined;
	MAUTIC_CLIENT_ID: string | undefined;
	MAUTIC_CLIENT_SECRET: string | undefined;
	MAUTIC_API_TOKEN: string | undefined;
	MAUTIC_USERNAME: string | undefined;
	MAUTIC_PASSWORD: string | undefined;
	MAUTIC_DEFAULT_SEGMENT_ID: string | undefined;
	MAUTIC_RATE_LIMIT: number;
} {
	const MAUTIC_API_URL = parseOptionalMauticUrl(
		'MAUTIC_API_URL',
		process.env.MAUTIC_API_URL
	);
	const MAUTIC_CLIENT_ID = emptyToUndefined(process.env.MAUTIC_CLIENT_ID);
	const MAUTIC_CLIENT_SECRET = emptyToUndefined(process.env.MAUTIC_CLIENT_SECRET);
	const MAUTIC_API_TOKEN = emptyToUndefined(process.env.MAUTIC_API_TOKEN);
	const MAUTIC_USERNAME = emptyToUndefined(process.env.MAUTIC_USERNAME);
	const MAUTIC_PASSWORD = emptyToUndefined(process.env.MAUTIC_PASSWORD);

	if (MAUTIC_API_URL === undefined) {
		if (
			MAUTIC_CLIENT_ID ||
			MAUTIC_CLIENT_SECRET ||
			MAUTIC_API_TOKEN ||
			MAUTIC_USERNAME ||
			MAUTIC_PASSWORD
		) {
			fail('MAUTIC_API_URL', 'required when any other MAUTIC_* variable is set');
		}
		return {
			MAUTIC_API_URL: undefined,
			MAUTIC_CLIENT_ID: undefined,
			MAUTIC_CLIENT_SECRET: undefined,
			MAUTIC_API_TOKEN: undefined,
			MAUTIC_USERNAME: undefined,
			MAUTIC_PASSWORD: undefined,
			MAUTIC_DEFAULT_SEGMENT_ID: undefined,
			MAUTIC_RATE_LIMIT: 100
		};
	}

	const hasToken = MAUTIC_API_TOKEN !== undefined;
	const hasOAuth = MAUTIC_CLIENT_ID !== undefined && MAUTIC_CLIENT_SECRET !== undefined;
	const hasBasic = MAUTIC_USERNAME !== undefined && MAUTIC_PASSWORD !== undefined;
	const methods = (hasToken ? 1 : 0) + (hasOAuth ? 1 : 0) + (hasBasic ? 1 : 0);
	if (methods === 0) {
		fail(
			'MAUTIC_API_URL',
			'requires MAUTIC_API_TOKEN, or MAUTIC_CLIENT_ID+MAUTIC_CLIENT_SECRET, or MAUTIC_USERNAME+MAUTIC_PASSWORD'
		);
	}
	if (methods > 1) {
		fail('MAUTIC_API_URL', 'use only one auth method: token, OAuth client credentials, or Basic credentials');
	}
	if (MAUTIC_CLIENT_ID !== undefined && MAUTIC_CLIENT_SECRET === undefined) {
		fail('MAUTIC_CLIENT_SECRET', 'required when MAUTIC_CLIENT_ID is set');
	}
	if (MAUTIC_CLIENT_SECRET !== undefined && MAUTIC_CLIENT_ID === undefined) {
		fail('MAUTIC_CLIENT_ID', 'required when MAUTIC_CLIENT_SECRET is set');
	}
	if (MAUTIC_USERNAME !== undefined && MAUTIC_PASSWORD === undefined) {
		fail('MAUTIC_PASSWORD', 'required when MAUTIC_USERNAME is set');
	}
	if (MAUTIC_PASSWORD !== undefined && MAUTIC_USERNAME === undefined) {
		fail('MAUTIC_USERNAME', 'required when MAUTIC_PASSWORD is set');
	}

	const MAUTIC_DEFAULT_SEGMENT_ID = emptyToUndefined(process.env.MAUTIC_DEFAULT_SEGMENT_ID);
	const MAUTIC_RATE_LIMIT = parseMauticRateLimit(process.env.MAUTIC_RATE_LIMIT);

	return {
		MAUTIC_API_URL,
		MAUTIC_CLIENT_ID,
		MAUTIC_CLIENT_SECRET,
		MAUTIC_API_TOKEN,
		MAUTIC_USERNAME,
		MAUTIC_PASSWORD,
		MAUTIC_DEFAULT_SEGMENT_ID,
		MAUTIC_RATE_LIMIT
	};
}

function isEnvNonEmpty(s: string | undefined): boolean {
	return s !== undefined && s.trim() !== '';
}

/**
 * Fast format checks (no network). Used when any Stripe var is set.
 */
function assertStripeKeyFormats(
	pk: string,
	sk: string,
	wh: string
): void {
	if (!/^pk_(test|live)_[A-Za-z0-9_]+$/.test(pk)) {
		fail('STRIPE_PUBLISHABLE_KEY', 'expected pk_test_… or pk_live_… (invalid format)');
	}
	if (!/^sk_(test|live)_[A-Za-z0-9_]+$/.test(sk)) {
		fail('STRIPE_SECRET_KEY', 'expected sk_test_… or sk_live_… (invalid format)');
	}
	if (!/^whsec_[A-Za-z0-9]+$/.test(wh)) {
		fail('STRIPE_WEBHOOK_SECRET', 'expected whsec_… (invalid format)');
	}
}

function parseStripeAuth(): {
	STRIPE_ENABLED: boolean;
	STRIPE_PUBLISHABLE_KEY: string | undefined;
	STRIPE_SUCCESS_URL: string | undefined;
	STRIPE_CANCEL_URL: string | undefined;
} {
	const rawPk = process.env.STRIPE_PUBLISHABLE_KEY;
	const rawSk = process.env.STRIPE_SECRET_KEY;
	const rawWh = process.env.STRIPE_WEBHOOK_SECRET;
	const rawSu = process.env.STRIPE_SUCCESS_URL;
	const rawCa = process.env.STRIPE_CANCEL_URL;

	const anySet =
		isEnvNonEmpty(rawPk) ||
		isEnvNonEmpty(rawSk) ||
		isEnvNonEmpty(rawWh) ||
		isEnvNonEmpty(rawSu) ||
		isEnvNonEmpty(rawCa);

	if (!anySet) {
		return {
			STRIPE_ENABLED: false,
			STRIPE_PUBLISHABLE_KEY: undefined,
			STRIPE_SUCCESS_URL: undefined,
			STRIPE_CANCEL_URL: undefined
		};
	}

	if (
		!isEnvNonEmpty(rawPk) ||
		!isEnvNonEmpty(rawSk) ||
		!isEnvNonEmpty(rawWh) ||
		!isEnvNonEmpty(rawSu) ||
		!isEnvNonEmpty(rawCa)
	) {
		fail(
			'STRIPE_',
			'when any Stripe variable is set, all of STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL are required'
		);
	}

	const pk = rawPk!.trim();
	const sk = rawSk!.trim();
	const wh = rawWh!.trim();
	assertStripeKeyFormats(pk, sk, wh);

	const STRIPE_SUCCESS_URL = parseHttpUrl('STRIPE_SUCCESS_URL', rawSu, {
		requiredInProduction: true
	});
	const STRIPE_CANCEL_URL = parseHttpUrl('STRIPE_CANCEL_URL', rawCa, {
		requiredInProduction: true
	});

	return {
		STRIPE_ENABLED: true,
		STRIPE_PUBLISHABLE_KEY: pk,
		STRIPE_SUCCESS_URL: STRIPE_SUCCESS_URL,
		STRIPE_CANCEL_URL: STRIPE_CANCEL_URL
	};
}

function assertLemonSqueezyFormats(apiKey: string, storeId: string, webhookSecret: string): void {
	if (apiKey.length < 10 || apiKey.length > 512) {
		fail('LEMON_SQUEEZY_API_KEY', 'expected length between 10 and 512');
	}
	if (!/^[0-9]+$/.test(storeId)) {
		fail('LEMON_SQUEEZY_STORE_ID', 'expected numeric store id');
	}
	if (webhookSecret.length < 6 || webhookSecret.length > 512) {
		fail('LEMON_SQUEEZY_WEBHOOK_SECRET', 'expected length between 6 and 512');
	}
}

function parseLemonSqueezyAuth(): {
	LEMON_SQUEEZY_ENABLED: boolean;
	LEMON_SQUEEZY_ENVIRONMENT: 'sandbox' | 'production' | undefined;
	LEMON_SQUEEZY_STORE_ID: string | undefined;
	LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL: string | undefined;
	LEMON_SQUEEZY_CHECKOUT_CANCEL_URL: string | undefined;
} {
	const rawKey = process.env.LEMON_SQUEEZY_API_KEY;
	const rawStore = process.env.LEMON_SQUEEZY_STORE_ID;
	const rawWh = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
	const rawEnv = process.env.LEMON_SQUEEZY_ENVIRONMENT;
	const rawOk = process.env.LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL;
	const rawCancel = process.env.LEMON_SQUEEZY_CHECKOUT_CANCEL_URL;

	const anySet =
		isEnvNonEmpty(rawKey) ||
		isEnvNonEmpty(rawStore) ||
		isEnvNonEmpty(rawWh) ||
		isEnvNonEmpty(rawEnv) ||
		isEnvNonEmpty(rawOk) ||
		isEnvNonEmpty(rawCancel);

	if (!anySet) {
		return {
			LEMON_SQUEEZY_ENABLED: false,
			LEMON_SQUEEZY_ENVIRONMENT: undefined,
			LEMON_SQUEEZY_STORE_ID: undefined,
			LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL: undefined,
			LEMON_SQUEEZY_CHECKOUT_CANCEL_URL: undefined
		};
	}

	if (
		!isEnvNonEmpty(rawKey) ||
		!isEnvNonEmpty(rawStore) ||
		!isEnvNonEmpty(rawWh) ||
		!isEnvNonEmpty(rawEnv) ||
		!isEnvNonEmpty(rawOk) ||
		!isEnvNonEmpty(rawCancel)
	) {
		fail(
			'LEMON_SQUEEZY_',
			'when any Lemon Squeezy variable is set, all of LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID, LEMON_SQUEEZY_WEBHOOK_SECRET, LEMON_SQUEEZY_ENVIRONMENT, LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL, LEMON_SQUEEZY_CHECKOUT_CANCEL_URL are required'
		);
	}

	const envNorm = rawEnv!.trim().toLowerCase();
	if (envNorm !== 'sandbox' && envNorm !== 'production') {
		fail('LEMON_SQUEEZY_ENVIRONMENT', 'expected sandbox or production');
	}
	const lemonEnv = envNorm as 'sandbox' | 'production';

	const apiKey = rawKey!.trim();
	const storeId = rawStore!.trim();
	const wh = rawWh!.trim();
	assertLemonSqueezyFormats(apiKey, storeId, wh);

	const LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL = parseHttpUrl('LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL', rawOk, {
		requiredInProduction: true
	});
	const LEMON_SQUEEZY_CHECKOUT_CANCEL_URL = parseHttpUrl('LEMON_SQUEEZY_CHECKOUT_CANCEL_URL', rawCancel, {
		requiredInProduction: true
	});

	return {
		LEMON_SQUEEZY_ENABLED: true,
		LEMON_SQUEEZY_ENVIRONMENT: lemonEnv,
		LEMON_SQUEEZY_STORE_ID: storeId,
		LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL,
		LEMON_SQUEEZY_CHECKOUT_CANCEL_URL
	};
}

function buildValidatedEnv(): ValidatedEnv {
	const nodeEnv = parseNodeEnv();

	const STRAPI_API_URL = parseHttpUrl(
		'STRAPI_API_URL',
		process.env.STRAPI_API_URL || process.env.STRAPI_BASE_URL,
		{
			requiredInProduction: true
		}
	);
	let PUBLIC_STRAPI_URL = STRAPI_API_URL;
	if (process.env.PUBLIC_STRAPI_URL !== undefined && process.env.PUBLIC_STRAPI_URL !== '') {
		PUBLIC_STRAPI_URL = parseHttpUrl('PUBLIC_STRAPI_URL', process.env.PUBLIC_STRAPI_URL, {
			requiredInProduction: false
		});
	}
	const STRAPI_BASE_URL = STRAPI_API_URL;

	const DATABASE_URL = parseDatabaseUrl('DATABASE_URL', process.env.DATABASE_URL, true);

	const OPENAI_MODEL =
		process.env.OPENAI_MODEL === undefined || process.env.OPENAI_MODEL === ''
			? 'gpt-5-mini'
			: process.env.OPENAI_MODEL;

	const TRANSLATION_ENABLED = parseBooleanStrict(
		'TRANSLATION_ENABLED',
		process.env.TRANSLATION_ENABLED,
		false
	);

	const COMPOSE_PROJECT_NAME =
		process.env.COMPOSE_PROJECT_NAME === undefined || process.env.COMPOSE_PROJECT_NAME === ''
			? 'soloai-dev'
			: process.env.COMPOSE_PROJECT_NAME;

	const MYSQL_PORT = parsePort('MYSQL_PORT', process.env.MYSQL_PORT, 3306);

	const mautic = parseMauticAuth();
	const stripe = parseStripeAuth();
	const lemon = parseLemonSqueezyAuth();

	for (const key of SECRET_KEYS) {
		assertSecretInProduction(key, process.env[key]);
		const nextKey = `${key}_NEXT`;
		assertSecretInProduction(nextKey, process.env[nextKey]);
	}

	return {
		NODE_ENV: nodeEnv,
		STRAPI_API_URL,
		PUBLIC_STRAPI_URL,
		STRAPI_BASE_URL,
		STRAPI_API_TOKEN: emptyToUndefined(process.env.STRAPI_API_TOKEN),
		OPENAI_API_KEY: emptyToUndefined(process.env.OPENAI_API_KEY),
		OPENAI_MODEL,
		TRANSLATION_ENABLED,
		TRANSLATION_API_TOKEN: emptyToUndefined(process.env.TRANSLATION_API_TOKEN),
		COMPOSE_PROJECT_NAME,
		COMPOSE_NETWORK: emptyToUndefined(process.env.COMPOSE_NETWORK),
		MYSQL_HOST: emptyToUndefined(process.env.MYSQL_HOST),
		BASE_PATH: emptyToUndefined(process.env.BASE_PATH),
		MYSQL_PORT,
		MYSQL_DATABASE: emptyToUndefined(process.env.MYSQL_DATABASE),
		MYSQL_USER: emptyToUndefined(process.env.MYSQL_USER),
		MYSQL_STRAPI_USER: emptyToUndefined(process.env.MYSQL_STRAPI_USER),
		MYSQL_PASSWORD: emptyToUndefined(process.env.MYSQL_PASSWORD),
		MYSQL_ROOT_PASSWORD: emptyToUndefined(process.env.MYSQL_ROOT_PASSWORD),
		JWT_SECRET: emptyToUndefined(process.env.JWT_SECRET),
		ADMIN_JWT_SECRET: emptyToUndefined(process.env.ADMIN_JWT_SECRET),
		APP_KEYS: emptyToUndefined(process.env.APP_KEYS),
		API_TOKEN_SALT: emptyToUndefined(process.env.API_TOKEN_SALT),
		TRANSFER_TOKEN_SALT: emptyToUndefined(process.env.TRANSFER_TOKEN_SALT),
		DATABASE_URL,
		STRAPI_WEBHOOK_SECRET: emptyToUndefined(process.env.STRAPI_WEBHOOK_SECRET),
		...mautic,
		STRIPE_ENABLED: stripe.STRIPE_ENABLED,
		STRIPE_PUBLISHABLE_KEY: stripe.STRIPE_PUBLISHABLE_KEY,
		STRIPE_SUCCESS_URL: stripe.STRIPE_SUCCESS_URL,
		STRIPE_CANCEL_URL: stripe.STRIPE_CANCEL_URL,
		LEMON_SQUEEZY_ENABLED: lemon.LEMON_SQUEEZY_ENABLED,
		LEMON_SQUEEZY_ENVIRONMENT: lemon.LEMON_SQUEEZY_ENVIRONMENT,
		LEMON_SQUEEZY_STORE_ID: lemon.LEMON_SQUEEZY_STORE_ID,
		LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL: lemon.LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL,
		LEMON_SQUEEZY_CHECKOUT_CANCEL_URL: lemon.LEMON_SQUEEZY_CHECKOUT_CANCEL_URL
	};
}

function emptyToUndefined(v: string | undefined): string | undefined {
	if (v === undefined || v === '') return undefined;
	return v;
}

export function validateEnvOrExit(): void {
	if (validated !== null) return;
	validated = buildValidatedEnv();
}

export function getEnv(): ValidatedEnv {
	if (validated === null) validateEnvOrExit();
	return validated as ValidatedEnv;
}

/** After validation; use for *_NEXT dual-run only — never cross-environment files. */
export function readValidatedSecretNext(primaryKey: (typeof SECRET_KEYS)[number]): string | undefined {
	validateEnvOrExit();
	return emptyToUndefined(process.env[`${primaryKey}_NEXT`]);
}
