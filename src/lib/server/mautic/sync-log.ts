/** Redacted structured logging for Mautic integration. */

export function logMauticStage(stage: string, fields?: Record<string, string>): void {
	if (fields && Object.keys(fields).length) {
		const extra = Object.entries(fields)
			.map(([k, v]) => `${k}=${v}`)
			.join(' ');
		console.info(`[mautic] ${stage} ${extra}`);
	} else {
		console.info(`[mautic] ${stage}`);
	}
}
