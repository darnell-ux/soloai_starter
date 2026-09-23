import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DIST = resolve(HERE, '../dist');

// The content script matches https://sellercentral.amazon.com/* ONLY, so a
// fixture served from localhost would never be injected. Playwright's request
// interception lets us serve our own HTML *at that origin*, so the real
// manifest match applies and the shipped content script runs unmodified. That
// is the whole trick that makes these tests possible without a seller account.
export const SELLER_CENTRAL = 'https://sellercentral.amazon.com/';
const SELLER_CENTRAL_GLOB = 'https://sellercentral.amazon.com/**';

/**
 * A stand-in for a Seller Central inventory page.
 *
 * `inShadow` puts the fulfillment-center row inside an OPEN shadow root,
 * because that is the shape of the real thing — measured 2026-09-22, 52% of
 * Seller Central's page text lives in shadow roots. The unit tests mock shadow
 * roots; this exercises real ones in a real browser, which is the point of
 * having E2E at all.
 */
export function inventoryFixture({ fcCode = null, inShadow = true } = {}) {
	const row = fcCode
		? `SKU GADGET-01  Fulfillment Center: ${fcCode}  Units: 240`
		: 'No products match your search';

	const mount = inShadow
		? `host.attachShadow({ mode: 'open' }).innerHTML =
         '<div>' + ${JSON.stringify(row)} + '</div>';`
		: `host.textContent = ${JSON.stringify(row)};`;

	return `<!doctype html>
<html><head><meta charset="utf-8"><title>Manage FBA Inventory</title></head>
<body>
  <h1>Manage FBA Inventory</h1>
  <div id="inventory-host"></div>
  <script>
    const host = document.getElementById('inventory-host');
    ${mount}
  </script>
</body></html>`;
}

/**
 * Launch Chromium with the built extension loaded.
 *
 * `userDataDir` must be a real directory (not '') for any test that closes and
 * reopens the browser — that is how the snooze-survives-restart test works.
 */
export async function launchWithExtension(userDataDir) {
	if (!existsSync(DIST)) {
		throw new Error(`dist/ not found at ${DIST} — run "npm run build" first`);
	}

	const context = await chromium.launchPersistentContext(userDataDir, {
		channel: process.env.PW_CHANNEL || 'chromium',
		args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`]
	});

	const worker = await serviceWorker(context);
	const extensionId = worker.url().split('/')[2];

	// Serve our fixture at the real Seller Central origin. Everything else on
	// that host is refused, so a test can never accidentally hit the network.
	let body = inventoryFixture();
	await context.route(SELLER_CENTRAL_GLOB, (route) =>
		route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body })
	);

	return {
		context,
		extensionId,
		/** Swap the page the fixture origin serves, before the next navigation. */
		setFixture: (html) => {
			body = html;
		}
	};
}

/** The extension's service worker, waiting for registration if needed. */
export async function serviceWorker(context) {
	const [existing] = context.serviceWorkers();
	return existing ?? (await context.waitForEvent('serviceworker'));
}

/**
 * Evaluate in the service worker, re-acquiring the handle each call.
 *
 * MV3 workers are terminated when idle and respawned on demand, so a handle
 * captured once can go stale mid-test. Fetching it per call keeps these tests
 * from flaking for reasons that have nothing to do with the extension.
 */
export async function swEval(context, fn, arg) {
	const worker = await serviceWorker(context);
	return worker.evaluate(fn, arg);
}

/** Whole chrome.storage.local, as the worker sees it. */
export const readStorage = (context) =>
	swEval(context, () => chrome.storage.local.get(null));

/** Badge text for one tab (''), which is what suppression looks like. */
export const badgeFor = (context, tabId) =>
	swEval(context, (id) => chrome.action.getBadgeText({ tabId: id }), tabId);

/** Poll storage until `predicate` returns something truthy, then return it. */
export async function waitForStorage(context, predicate, { timeout = 20_000, label = 'condition' } = {}) {
	const deadline = Date.now() + timeout;
	let last = null;
	while (Date.now() < deadline) {
		last = await readStorage(context);
		const hit = predicate(last);
		if (hit) return hit;
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error(
		`timed out after ${timeout}ms waiting for ${label}. storage was:\n${JSON.stringify(last, null, 2)}`
	);
}

/** All detection_{tabId} records currently in storage. */
export function detectionRecords(store) {
	return Object.entries(store)
		.filter(([k]) => k.startsWith('detection_'))
		.map(([, v]) => v);
}

/** Open the popup as a tab and wait for it to finish its initial load. */
export async function openPopup(context, extensionId) {
	const page = await context.newPage();
	await page.goto(`chrome-extension://${extensionId}/index.html`);
	// The popup renders "Loading…" until its batched storage read resolves.
	await page.locator('main').waitFor();
	await page.getByText('Loading…').waitFor({ state: 'hidden' }).catch(() => {});
	return page;
}

/** A disposable profile directory, and its cleanup. */
export function profile() {
	const dir = mkdtempSync(join(tmpdir(), 'taxnexus-e2e-'));
	return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
