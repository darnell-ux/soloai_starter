// Verification of the service worker's core decision path:
//   PAGE_SIGNALS message -> assess (mocked) -> chrome.storage.local + badge.
//
// Loads the ACTUAL shipped service worker (public/service-worker.js) inside a
// sandbox with a fake `chrome` and `fetch`, delivers a page-signals message,
// and asserts the persisted risk + toolbar badge. Exercises the real code path,
// not a reimplementation — the counterpart to detection.test.mjs for the SW.
//
// The critical case is "CA inventory detected but the assess API is DOWN": the
// extension must still report EXPOSED (its whole reason to exist is the offline
// blindside warning), not degrade to UNKNOWN.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const SCRIPT = readFileSync(
  resolve(import.meta.dirname, '../public/service-worker.js'),
  'utf8'
);

const STORAGE_KEY = 'taxnexus.latest';

/**
 * Instantiate the service worker with a mock `chrome`/`fetch`. Returns helpers
 * to deliver a message and to inspect the resulting storage + badge state.
 *
 * `fetchImpl` stands in for the assess API call; pass one that resolves (ok),
 * returns a non-ok response, or rejects to simulate an outage.
 */
function loadWorker(fetchImpl) {
  let onMessage = null;
  const store = {};
  const badge = { text: undefined, color: undefined };

  const sandbox = {
    console: { warn() {}, info() {}, debug() {}, log() {} },
    Date,
    Set,
    Array,
    RegExp,
    JSON,
    fetch: fetchImpl,
    chrome: {
      runtime: {
        lastError: undefined,
        onMessage: { addListener: (fn) => { onMessage = fn; } },
        onInstalled: { addListener() {} }
      },
      action: {
        setBadgeBackgroundColor: async (o) => { badge.color = o.color; },
        setBadgeText: async (o) => { badge.text = o.text; }
      },
      storage: {
        local: {
          set: async (obj) => { Object.assign(store, obj); },
          get: async (key) => (key in store ? { [key]: store[key] } : {})
        }
      },
      tabs: { query: async () => [], sendMessage: async () => {} },
      scripting: { executeScript: async () => {} }
    }
  };

  vm.runInNewContext(SCRIPT, sandbox);
  assert.ok(onMessage, 'service worker registered an onMessage listener');

  // The handler returns true and calls sendResponse(record) when done — resolve
  // on that callback so tests can await the full async pass.
  const sendPageSignals = (payload) =>
    new Promise((res) => onMessage({ type: 'taxnexus/page-signals', payload }, {}, res));

  return { sendPageSignals, store, badge };
}

const okAssess = (bodyObj) => async () => ({ ok: true, json: async () => bodyObj });
const failAssess = () => async () => { throw new Error('network down'); };

test('CA inventory + assess says nexus -> EXPOSED, red "!" badge', async () => {
  const w = loadWorker(okAssess({ hasNexus: true, triggers: ['Physical inventory in CA'], minTax: 800 }));
  const record = await w.sendPageSignals({ hasCaInventory: true, fcCodes: ['ONT8'], signals: ['ONT8'] });
  assert.equal(record.risk, 'exposed');
  assert.equal(w.store[STORAGE_KEY].risk, 'exposed');
  assert.equal(w.badge.text, '!');
});

test('CA inventory + assess API DOWN -> still EXPOSED (offline blindside warning)', async () => {
  const w = loadWorker(failAssess());
  const record = await w.sendPageSignals({ hasCaInventory: true, fcCodes: ['SMF1'], signals: ['SMF1'] });
  // The regression this guards: a real CA signal must NOT degrade to UNKNOWN
  // just because the assess call failed.
  assert.equal(record.risk, 'exposed');
  assert.equal(record.assessment, null);
  assert.equal(w.badge.text, '!');
});

test('no CA inventory + assess says no nexus -> CLEAR, green check badge', async () => {
  const w = loadWorker(okAssess({ hasNexus: false, triggers: [] }));
  const record = await w.sendPageSignals({ hasCaInventory: false, fcCodes: [], signals: [] });
  assert.equal(record.risk, 'clear');
  assert.equal(w.badge.text, '✓');
});

test('no CA inventory + assess API DOWN -> UNKNOWN, no badge', async () => {
  const w = loadWorker(failAssess());
  const record = await w.sendPageSignals({ hasCaInventory: false, fcCodes: [], signals: [] });
  assert.equal(record.risk, 'unknown');
  assert.equal(w.badge.text, '');
});
