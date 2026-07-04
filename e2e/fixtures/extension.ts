/**
 * Playwright fixture that loads the built MV3 extension (extension/dist) into a
 * persistent Chromium context.
 *
 * MV3 extensions can only be loaded via a persistent context, and loading an
 * unpacked extension requires a headed browser (or a display via xvfb) — the
 * old headless mode won't register the service worker. The spec that uses this
 * fixture therefore skips under CI unless a display is configured.
 *
 * The background service worker is lazy — it may not surface until an event
 * wakes it — so the spec navigates first, then acquires it (see getServiceWorker).
 */
import {
	test as base,
	chromium,
	type BrowserContext,
	type Worker
} from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const EXTENSION_PATH = path.resolve(here, '../../extension/dist');

export const test = base.extend<{ context: BrowserContext }>({
	// eslint-disable-next-line no-empty-pattern
	context: async ({}, use) => {
		// A real on-disk profile dir is more reliable for extension loading than ''.
		const userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tx-ext-'));
		const context = await chromium.launchPersistentContext(userDataDir, {
			channel: 'chrome', // stable Chrome loads unpacked MV3 extensions most reliably
			headless: false, // extensions require a headed context (use xvfb in CI)
			args: [
				`--disable-extensions-except=${EXTENSION_PATH}`,
				`--load-extension=${EXTENSION_PATH}`
			]
		});
		await use(context);
		await context.close();
		await fs.promises.rm(userDataDir, { recursive: true, force: true });
	}
});

/** Grab the (possibly lazy) MV3 background service worker for a loaded extension. */
export async function getServiceWorker(context: BrowserContext): Promise<Worker> {
	const existing = context.serviceWorkers();
	if (existing.length > 0) return existing[0];
	return context.waitForEvent('serviceworker', { timeout: 20_000 });
}

export const expect = test.expect;
