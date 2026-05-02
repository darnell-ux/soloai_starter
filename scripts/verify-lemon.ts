import 'dotenv/config';
import { getEnv, validateEnvOrExit } from '../src/lib/server/env';
import { verifyLemonSqueezyApiAccess } from '../src/lib/server/lemon/config';

async function main(): Promise<void> {
	validateEnvOrExit();
	if (!getEnv().LEMON_SQUEEZY_ENABLED) {
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
