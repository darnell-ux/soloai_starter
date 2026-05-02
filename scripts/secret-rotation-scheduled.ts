import '../src/lib/server/env.bootstrap';
import { auditSecretOperation } from '../src/lib/server/secretAudit';

auditSecretOperation('rotate', 'scheduled', {
	phase: 'scheduled_window',
	note: 'wire to cron/CI; inject new material at runtime; dual-run then retire old'
});
process.exit(0);
