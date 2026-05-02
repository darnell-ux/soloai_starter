import { SECRET_KEYS } from '../src/lib/server/env';
import '../src/lib/server/env.bootstrap';
import { auditSecretOperation } from '../src/lib/server/secretAudit';
import type { ServerSecretKey } from '../src/lib/server/secrets';
import { getSecretRotationState } from '../src/lib/server/secrets';

const key = process.argv[2];
if (!key) {
	console.error('usage: npm run rotate:secret:on-demand -- <SECRET_NAME>');
	console.error('example: npm run rotate:secret:on-demand -- STRAPI_API_TOKEN');
	process.exit(1);
}
if (!(SECRET_KEYS as readonly string[]).includes(key)) {
	console.error('unknown secret key (must be a server secret identifier)');
	process.exit(1);
}

auditSecretOperation('rotate', key, { phase: 'on_demand', note: 'verify dual material; cut traffic; retire primary' });
const state = getSecretRotationState(key as ServerSecretKey);
auditSecretOperation('rotate', key, {
	phase: state.phase,
	note: 'cutover state recorded (values never logged)'
});
process.exit(0);
