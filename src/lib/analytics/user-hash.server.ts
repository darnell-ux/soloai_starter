import { createHash } from 'node:crypto';

/** SHA-256 hash for analytics user_id (no raw ids in dataLayer). */
export function hashUserIdForAnalytics(userId: string, pepper?: string | undefined): string {
	const h = createHash('sha256');
	if (pepper !== undefined && pepper !== '') h.update(pepper, 'utf8');
	h.update(userId, 'utf8');
	return h.digest('hex');
}
