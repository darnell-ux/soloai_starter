import type { PageServerLoad } from './$types';

// Where Chrome sends people after they uninstall the Nexus Alert extension
// (registered via chrome.runtime.setUninstallURL). No identifier is attached
// and none is created here — this page cannot tell one uninstaller from
// another. It exists to give an otherwise invisible event a landing spot and
// to offer a way to say what went wrong.

const SOURCES = ['chrome_extension', 'web'] as const;
export type UninstallSource = (typeof SOURCES)[number];

function parseSource(raw: string | null): UninstallSource {
	const value = (raw ?? '').toLowerCase();
	return (SOURCES as readonly string[]).includes(value) ? (value as UninstallSource) : 'web';
}

export const prerender = false;

export const load: PageServerLoad = ({ url }) => ({
	source: parseSource(url.searchParams.get('source'))
});
