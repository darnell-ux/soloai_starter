/**
 * EV02 — validated server configuration facade.
 * Single entry for consumers; secrets stay in env.ts validation (never log values).
 */
import {
	getEnv,
	validateEnvOrExit,
	type NodeEnv,
	type ValidatedEnv
} from './env';

export type { NodeEnv, ValidatedEnv };

/** Fail-fast validation; safe to call at startup and in CLI (`--validate-env`). */
export function ensureServerConfig(): ValidatedEnv {
	validateEnvOrExit();
	return getEnv();
}

/** After validation has run (hooks, vite bootstrap, or explicit ensure). */
export function getServerConfig(): ValidatedEnv {
	return getEnv();
}

export function isProductionConfig(): boolean {
	return getEnv().NODE_ENV === 'production';
}

export function isStripeEnabled(): boolean {
	return getEnv().STRIPE_ENABLED === true;
}

export function isLemonSqueezyConfigured(): boolean {
	return getEnv().LEMON_SQUEEZY_ENABLED === true;
}
