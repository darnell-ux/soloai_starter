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

export const STORAGE_KEY = 'taxnexus.latest';
export const SNOOZE_KEY = 'snooze_until';
export const DISMISSED_KEY = 'dismissed_tabs';
export const LAST_LEVEL_KEY = 'last_alert_level';
export const DETECTION_PREFIX = 'detection_';
export const DAY_MS = 24 * 60 * 60 * 1000;

/** A fetch stand-in that resolves with the given assess response body. */
export const okAssess = (bodyObj) => async () => ({ ok: true, json: async () => bodyObj });
/** A fetch stand-in that simulates the assess API being unreachable. */
export const failAssess = () => async () => {
	throw new Error('network down');
};

/**
 * Instantiate the service worker with a mock `chrome`/`fetch`.
 *
 * @param {Function} fetchImpl  stands in for the assess API call
 * @param {object}   [seed]     initial chrome.storage.local contents
 * @param {object}   [opts]     { activeTab } — the tab chrome.tabs.query returns
 */
export function loadWorker(fetchImpl, seed = {}, opts = {}) {
	let onMessage = null;
	let onRemoved = null;
	let onStartup = null;
	const store = { ...seed };

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
		fetch: fetchImpl,
		chrome: {
			runtime: {
				lastError: undefined,
				onMessage: {
					addListener: (fn) => {
						onMessage = fn;
					}
				},
				onInstalled: { addListener() {} },
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

	return { send, sendPageSignals, closeTab, fireStartup, store, badge };
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
