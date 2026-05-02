/**
 * Narrow server secret access: use getServerSecret / rotation helpers instead of raw process.env.
 * Assumes TLS in transit and encrypted-at-rest material in the backing store; no insecure fallbacks.
 */

import { getEnv, readValidatedSecretNext } from './env';
import type { ValidatedEnv } from './env';
import { SECRET_KEYS } from './env';
import { timingSafeEqual } from 'node:crypto';
import { auditSecretOperation } from './secretAudit';
import { getIsolatedRuntimeEnvironment } from './secretRuntime';

export type ServerSecretKey = (typeof SECRET_KEYS)[number];

const TTL_MS = 60_000;
const MAX_REFRESH_BACKOFF_MS = 2_000;

type CacheEntry = { value: string; expiresAt: number };
const secretCache = new Map<string, CacheEntry>();

function cacheKey(env: string, name: string): string {
	return `${env}::${name}`;
}

function isProduction(): boolean {
	return process.env.NODE_ENV === 'production';
}

function minSecretLength(): number {
	return 32;
}

function assertStrongSecretIfPresent(name: string, raw: string | undefined): void {
	if (!isProduction()) return;
	if (raw === undefined || raw === '') return;
	if (raw.length < minSecretLength()) {
		throw new Error(`secret policy violation: ${name} (expected length >= ${minSecretLength()} in production)`);
	}
}

/**
 * TTL cache for resolved values; entries never logged.
 */
export function invalidateServerSecretCache(): void {
	secretCache.clear();
	auditSecretOperation('invalidate', '*', { phase: 'cache_clear' });
}

export function getServerSecret(name: ServerSecretKey): string | undefined {
	const runtime = getIsolatedRuntimeEnvironment();
	const key = cacheKey(runtime, name);
	const now = Date.now();
	const hit = secretCache.get(key);
	if (hit && hit.expiresAt > now) {
		auditSecretOperation('read', name, { phase: 'cache_hit' });
		return hit.value;
	}

	const env = getEnv();
	const raw = env[name as keyof ValidatedEnv];
	const v = typeof raw === 'string' ? raw : undefined;

	assertStrongSecretIfPresent(name, v);

	auditSecretOperation('read', name, { phase: 'origin' });
	if (v !== undefined) {
		secretCache.set(key, { value: v, expiresAt: now + TTL_MS });
	}
	return v;
}

export type RotationPhase = 'primary_only' | 'dual' | 'cutover_to_next';

export type RotationState = {
	primary: string | undefined;
	next: string | undefined;
	phase: RotationPhase;
};

/**
 * Dual-run: primary + optional *_NEXT during cutover; no-downtime when both verify.
 */
export function getSecretRotationState(primaryKey: ServerSecretKey): RotationState {
	const primary = getServerSecret(primaryKey);
	const next = readValidatedSecretNext(primaryKey);

	assertStrongSecretIfPresent(`${primaryKey}_NEXT`, next);

	auditSecretOperation('read', `${primaryKey}_NEXT`, { phase: 'rotation_probe' });

	let phase: RotationPhase = 'primary_only';
	if (primary && next) phase = 'dual';
	else if (!primary && next) phase = 'cutover_to_next';

	return { primary, next, phase };
}

function timingSafeBearerMatch(bearer: string, candidate: string | undefined): boolean {
	if (!candidate) return false;
	const a = Buffer.from(bearer, 'utf8');
	const b = Buffer.from(candidate, 'utf8');
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export function matchBearerToRotation(bearer: string, rot: RotationState): boolean {
	return timingSafeBearerMatch(bearer, rot.primary) || timingSafeBearerMatch(bearer, rot.next);
}

/** Bearer (raw token) against primary and optional NEXT during cutover. */
export function verifyBearerAgainstRotation(
	bearerRaw: string | undefined,
	primaryKey: ServerSecretKey
): boolean {
	const rot = getSecretRotationState(primaryKey);
	return matchBearerToRotation(bearerRaw?.trim() ?? '', rot);
}

/**
 * Bounded backoff placeholder for future remote secret stores (HSM, vault); local env is synchronous.
 */
export async function withSecretAccessBackoff<T>(fn: () => Promise<T>): Promise<T> {
	let delay = 100;
	for (let i = 0; i < 3; i++) {
		try {
			return await fn();
		} catch (e) {
			if (delay >= MAX_REFRESH_BACKOFF_MS) throw e;
			await new Promise((r) => setTimeout(r, delay));
			delay = Math.min(delay * 2, MAX_REFRESH_BACKOFF_MS);
		}
	}
	throw new Error('secret access backoff exhausted');
}
