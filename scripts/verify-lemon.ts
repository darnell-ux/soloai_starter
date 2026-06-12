import 'dotenv/config';
import { ensureServerConfig } from '../src/lib/server/config';
import {
	isLemonSqueezyEnabled,
	verifyLemonSqueezyApiAccess
} from '../src/lib/server/billing/lemonsqueezy';

async function main(): Promise<void> {
	ensureServerConfig();
	if (!isLemonSqueezyEnabled()) {
		console.info('[lemonsqueezy] verification skipped (LEMON_SQUEEZY_* not configured)');
		process.exit(0);
		return;
	}
	const result = await verifyLemonSqueezyApiAccess();
	if (!result.ok) {
		console.error('[lemonsqueezy] verification failed (GET /v1/users/me)');
		process.exit(1);
		return;
	}
	console.info('[lemonsqueezy] verification ok (authenticated GET /v1/users/me)');
}

void main();
