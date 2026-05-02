import { getIsolatedRuntimeEnvironment } from './secretRuntime';

export type SecretAuditOp = 'read' | 'write' | 'rotate' | 'invalidate';

/**
 * Redacted audit line — never pass secret values.
 */
export function auditSecretOperation(
	op: SecretAuditOp,
	secretIdentifier: string,
	meta?: { phase?: string; note?: string }
): void {
	const environment = getIsolatedRuntimeEnvironment();
	const parts = [`[secret-audit] ${op}: ${secretIdentifier}`, `(environment=${environment})`];
	if (meta?.phase) parts.push(`phase=${meta.phase}`);
	if (meta?.note) parts.push(meta.note);
	console.info(parts.join(' '));
}
