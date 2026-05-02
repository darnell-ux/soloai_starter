import 'dotenv/config';
import { SECRET_KEYS, validateEnvOrExit } from '../src/lib/server/env';
import { auditSecretOperation } from '../src/lib/server/secretAudit';
import type { ServerSecretKey } from '../src/lib/server/secrets';

const name = process.argv[2] as ServerSecretKey | undefined;

function usage(): never {
	console.error('usage: npx tsx scripts/rotate-secret.ts <SECRET_NAME>');
	console.error(`allowed: ${SECRET_KEYS.join(', ')}`);
	process.exit(1);
}

if (!name || !(SECRET_KEYS as readonly string[]).includes(name)) usage();

validateEnvOrExit();
auditSecretOperation('rotate', name, {
	phase: 'on_demand',
	note: 'set *_NEXT in secret store; dual-run; promote primary; retire old; invalidateServerSecretCache; redeploy'
});
process.exit(0);
