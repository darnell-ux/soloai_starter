import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';
import { getLemonSqueezyApiKeyOrThrow } from './config';

let configured = false;

/** Idempotent SDK setup (server-only). */
export function ensureLemonSqueezySdk(): void {
	if (configured) return;
	lemonSqueezySetup({ apiKey: getLemonSqueezyApiKeyOrThrow() });
	configured = true;
}
