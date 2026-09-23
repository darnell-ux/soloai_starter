// Shared test harness: loads the ACTUAL shipped service worker
// (public/service-worker.js) inside a vm sandbox with a fake `chrome` and
// `fetch`, so every test exercises the real code path rather than a
// reimplementation.
//
// Used by service-worker.test.mjs (decision path) and storage.test.mjs
// (snooze / dismiss / stale-key cleanup).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const SCRIPT = readFileSync(
	resolve(import.meta.dirname, '../public/service-worker.js'),
	'utf8'
);

const COLLECTOR = readFileSync(
	resolve(import.meta.dirname, '../public/content/amazon-collector.js'),
	'utf8'
);

export const STORAGE_KEY = 'taxnexus.latest';
export const SNOOZE_KEY = 'snooze_until';
export const DISMISSED_KEY = 'dismissed_tabs';
export const LAST_LEVEL_KEY = 'last_alert_level';
export const DETECTION_PREFIX = 'detection_';
export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Instantiate the service worker with a mock `chrome`.
 *
 * There is deliberately no fetch stand-in to configure: the extension makes no
 * network requests at all. The sandbox's `fetch` records the attempt and then
 * throws, so if a network call is ever reintroduced the suite fails loudly
 * instead of silently depending on the network. Inspect `w.fetchCalls`.
 *
 * @param {object} [seed]  initial chrome.storage.local contents
 * @param {object} [opts]  { activeTab, noFetch }
 *   activeTab — the tab chrome.tabs.query returns
 *   noFetch   — omit `fetch` from the sandbox entirely, so merely *referencing*
 *               it is a ReferenceError. Stricter than a throwing fetch: proves
 *               the code path has no dependency on fetch existing, and cannot
 *               be satisfied by a try/catch swallowing a failed request.
 */
export function loadWorker(seed = {}, opts = {}) {
	let onMessage = null;
	let onRemoved = null;
	let onStartup = null;
	let onInstalled = null;
	const store = { ...seed };
	const fetchCalls = [];
	const uninstallUrls = [];

	// Badge state is tracked per tab as well as globally, because suppression
	// (snooze / dismiss) is precisely a question of which tabs got a badge.
	const badge = { text: undefined, color: undefined, byTab: {} };
	const writeBadge = (field) => (o) => {
		const value = field === 'text' ? o.text : o.color;
		if (typeof o.tabId === 'number') {
			badge.byTab[o.tabId] = { ...(badge.byTab[o.tabId] || {}), [field]: value };
		} else {
			badge[field] = value;
		}
	};

	const sandbox = {
		console: { warn() {}, info() {}, debug() {}, log() {} },
		Date,
		Set,
		Array,
		Object,
		Number,
		Boolean,
		String,
		Math,
		Promise,
		RegExp,
		JSON,
		encodeURIComponent,
		fetch: (...args) => {
			fetchCalls.push(args);
			throw new Error(
				'the extension must not make network requests — see assessLocally() in service-worker.js'
			);
		},
		chrome: {
			runtime: {
				lastError: undefined,
				onMessage: {
					addListener: (fn) => {
						onMessage = fn;
					}
				},
				onInstalled: {
					addListener: (fn) => {
						onInstalled = fn;
					}
				},
				setUninstallURL: (url, cb) => {
					uninstallUrls.push(url);
					if (cb) cb();
				},
				onStartup: {
					addListener: (fn) => {
						onStartup = fn;
					}
				}
			},
			action: {
				setBadgeBackgroundColor: async (o) => writeBadge('color')(o),
				setBadgeText: async (o) => writeBadge('text')(o)
			},
			storage: {
				local: {
					set: async (obj) => {
						Object.assign(store, obj);
					},
					// Mirrors the real API's three shapes: a single key, an array of
					// keys, or null for "everything".
					get: async (query) => {
						if (query == null) return { ...store };
						const keys = Array.isArray(query) ? query : [query];
						const out = {};
						for (const k of keys) if (k in store) out[k] = store[k];
						return out;
					},
					remove: async (query) => {
						for (const k of Array.isArray(query) ? query : [query]) delete store[k];
					}
				}
			},
			tabs: {
				query: async () => (opts.activeTab ? [opts.activeTab] : []),
				sendMessage: async () => {},
				onRemoved: {
					addListener: (fn) => {
						onRemoved = fn;
					}
				}
			},
			scripting: { executeScript: async () => {} }
		}
	};

	if (opts.noFetch) delete sandbox.fetch;

	vm.runInNewContext(SCRIPT, sandbox);
	assert.ok(onMessage, 'service worker registered an onMessage listener');

	/** Deliver a message and resolve with whatever the handler sends back. */
	const send = (message, sender = {}) =>
		new Promise((res) => onMessage(message, sender, res));

	/**
	 * Deliver page signals as the content script would. Passing `tabId` models a
	 * real content-script sender (sender.tab.id); omitting it models the legacy
	 * tab-less path.
	 */
	const sendPageSignals = (payload, tabId) =>
		send({ type: 'taxnexus/page-signals', payload }, tabId == null ? {} : { tab: { id: tabId } });

	/** Run the chrome.tabs.onRemoved handler and wait for its async work. */
	const closeTab = async (tabId) => {
		assert.ok(onRemoved, 'service worker registered a tabs.onRemoved listener');
		onRemoved(tabId, {});
		await flush();
	};

	/** Run the chrome.runtime.onStartup handler and wait for its async work. */
	const fireStartup = async () => {
		assert.ok(onStartup, 'service worker registered a runtime.onStartup listener');
		onStartup();
		await flush();
	};

	/** Run the chrome.runtime.onInstalled handler (fresh install / update). */
	const fireInstalled = async () => {
		assert.ok(onInstalled, 'service worker registered a runtime.onInstalled listener');
		onInstalled({ reason: 'install' });
		await flush();
	};

	return {
		send,
		sendPageSignals,
		closeTab,
		fireStartup,
		fireInstalled,
		store,
		badge,
		fetchCalls,
		uninstallUrls
	};
}

/**
 * Let queued microtasks settle. onRemoved/onStartup handlers are fire-and-forget
 * (Chrome does not await them), so tests drain the queue instead.
 */
export async function flush(rounds = 10) {
	for (let i = 0; i < rounds; i += 1) await Promise.resolve();
}

/**
 * Copy a value out of the vm realm before comparing it.
 *
 * Arrays the service worker builds internally get the *sandbox* realm's
 * Array.prototype, so assert.deepEqual against a host-realm literal fails on
 * reference identity even when the contents are identical.
 */
export const hostArray = (value) => Array.from(value ?? []);

/** Build a detection_{tabId} record with an explicit age, for cleanup tests. */
export function detectionRecord(tabId, ageMs, now = Date.now()) {
	return {
		key: `${DETECTION_PREFIX}${tabId}`,
		value: { tabId, risk: 'exposed', alertLevel: 'high', storedAt: now - ageMs }
	};
}

/**
 * Boot the ACTUAL shipped content script against a fixture page, with handles
 * to drive it afterwards: SPA navigation, the poll tick, window events, and a
 * direct COLLECT_NOW message.
 *
 * Timers are captured rather than real — setTimeout fires immediately (the
 * settle delay is not what any test is asserting) and setInterval hands back
 * its callback so a test can tick deterministically.
 *
 * Pass `onSend` to forward each emitted message somewhere — that is how the
 * integration test wires this to a real service worker.
 *
 * @param {string} innerText  rendered page text
 * @param {object} [opts]     { host, pathname, onSend }
 */
export function loadCollector(innerText, opts = {}) {
	const host = opts.host ?? 'sellercentral.amazon.com';
	const pathname = opts.pathname ?? '/inventory/fba';

	const sent = [];
	const listeners = {};
	let pollFn = null;
	let onMessageFn = null;

	const page = { text: innerText, shadow: opts.shadow ?? [] };
	const location = { host, pathname, href: `https://${host}${pathname}` };

	/**
	 * Elements carrying an open shadow root, as the collector's walk expects to
	 * find them. Seller Central is built from web components, so this is not a
	 * hypothetical shape — see the note in amazon-collector.js.
	 */
	const shadowHosts = () =>
		page.shadow.map((text) => ({
			shadowRoot: {
				children: [{ innerText: text }],
				querySelectorAll: () => []
			}
		}));

	const sandbox = {
		// A getter so the script re-reads page text on every collection, the way a
		// real DOM would after an SPA swaps the view.
		document: {
			get body() {
				return {
					innerText: page.text,
					querySelectorAll: () => shadowHosts()
				};
			}
		},
		location,
		console: { debug() {}, warn() {}, log() {} },
		Date,
		Set,
		RegExp,
		Array,
		setTimeout: (fn) => {
			fn();
			return 1;
		},
		clearTimeout: () => {},
		setInterval: (fn) => {
			pollFn = fn;
			return 1;
		},
		addEventListener: (type, fn) => {
			listeners[type] = fn;
		},
		chrome: {
			runtime: {
				lastError: undefined,
				sendMessage: (msg, cb) => {
					sent.push(msg);
					opts.onSend?.(msg);
					if (cb) cb();
				},
				onMessage: {
					addListener: (fn) => {
						onMessageFn = fn;
					}
				}
			}
		}
	};

	vm.runInNewContext(COLLECTOR, sandbox);

	return {
		sent,
		last: () => sent[sent.length - 1],
		/** Simulate an SPA route change, then let the poll notice it. */
		navigate(newPath, newText) {
			location.pathname = newPath;
			location.href = `https://${host}${newPath}`;
			if (newText !== undefined) page.text = newText;
			pollFn?.();
		},
		/** Change the rendered text without navigating. */
		setText(newText) {
			page.text = newText;
		},
		/** Replace the text living inside open shadow roots. */
		setShadow(texts) {
			page.shadow = texts;
		},
		/** Change the URL and text WITHOUT running a poll tick. */
		setUrl(newPath, newText) {
			location.pathname = newPath;
			location.href = `https://${host}${newPath}`;
			if (newText !== undefined) page.text = newText;
		},
		/** Run one poll tick. */
		tick: () => pollFn?.(),
		/** Fire a listener the script registered on window. */
		fire: (type) => listeners[type]?.(),
		/** Deliver a COLLECT_NOW message the way the service worker would. */
		collectNow: () => onMessageFn?.({ type: 'taxnexus/collect-now' }, {}, () => {})
	};
}
