/**
 * Future-friendly shape for emitting Paraglide / JSON i18n resources without coupling to a specific toolchain.
 */

export type I18nResourceBundle = {
	locale: string;
	version: string;
	messages: Record<string, string>;
};

export function fieldsToMessages(fields: ReadonlyArray<{ key: string; value: string }>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const f of fields) {
		out[f.key] = f.value;
	}
	return out;
}

export function toI18nResourceBundle(targetLang: string, fields: Record<string, string>): I18nResourceBundle {
	return {
		locale: targetLang,
		version: '1',
		messages: { ...fields }
	};
}
