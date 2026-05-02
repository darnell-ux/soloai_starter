import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify Lemon Squeezy `X-Signature` (HMAC-SHA256 hex of raw body).
 * @see https://docs.lemonsqueezy.com/help/webhooks/signing-requests
 */
export function verifyLemonSqueezySignature(secret: string, rawBody: string, signatureHeader: string | null): boolean {
	if (!signatureHeader || signatureHeader.length < 8) return false;
	const hmac = createHmac('sha256', secret);
	const digestHex = hmac.update(rawBody, 'utf8').digest('hex');
	try {
		const digestBuf = Buffer.from(digestHex, 'utf8');
		const sigBuf = Buffer.from(signatureHeader, 'utf8');
		if (digestBuf.length !== sigBuf.length) return false;
		return timingSafeEqual(digestBuf, sigBuf);
	} catch {
		return false;
	}
}
