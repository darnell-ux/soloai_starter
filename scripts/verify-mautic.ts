import 'dotenv/config';
import {
	createMauticClientFromEnv,
	MauticConfigError
} from '../src/lib/server/mautic/client';
import { validateEnvOrExit } from '../src/lib/server/env';

async function main(): Promise<void> {
	validateEnvOrExit();
	try {
		const client = createMauticClientFromEnv();
		const result = await client.verifyConnectivity();
		if (!result.ok) {
			console.error('[mautic] verification failed:', result.error);
			process.exit(1);
			return;
		}
		console.info('[mautic] verification ok (authenticated GET /api/contacts?limit=1)');
	} catch (e) {
		if (e instanceof MauticConfigError) {
			console.error('[mautic]', e.message);
			process.exit(1);
			return;
		}
		throw e;
	}
}

void main();
