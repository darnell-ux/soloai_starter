/** Narrow shapes for Lemon Squeezy webhook POST bodies (not full API typings). */

export type LemonWebhookMeta = {
	event_name?: string;
	custom_data?: Record<string, unknown>;
};

export type LemonWebhookEnvelope = {
	meta?: LemonWebhookMeta;
	data?: {
		type?: string;
		id?: string;
		attributes?: Record<string, unknown>;
	};
};
