// Manual / automated verification of the core CA warehouse detection flow.
//
// This loads the ACTUAL shipped content script (public/content/amazon-collector.js)
// inside a sandbox with a fake `document`/`chrome`, feeds it fixture Seller
// Central markup, and asserts the message it emits to the service worker. It
// exercises the real detection code path, not a reimplementation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const SCRIPT = readFileSync(
  resolve(import.meta.dirname, '../public/content/amazon-collector.js'),
  'utf8'
);

/** Run the content script against fixture page text; return the message it sends. */
function runCollector(innerText, host = 'sellercentral.amazon.com', pathname = '/inventory/fba') {
  let captured = null;
  const sandbox = {
    document: { body: { innerText } },
    location: { host, pathname },
    console: { debug() {}, warn() {}, log() {} },
    Date,
    Set,
    RegExp,
    Array,
    chrome: {
      runtime: {
        lastError: undefined,
        sendMessage: (msg, cb) => {
          captured = msg;
          if (cb) cb();
        },
        onMessage: { addListener() {} }
      }
    }
  };
  vm.runInNewContext(SCRIPT, sandbox);
  return captured;
}

test('detects CA inventory from fulfillment-center codes (ONT8, SMF1)', () => {
  const page = `
    FBA Inventory — Active
    SKU GADGET-01  Fulfillment Center: ONT8   Units: 240
    SKU GADGET-02  Fulfillment Center: SMF1   Units: 88
  `;
  const msg = runCollector(page);
  assert.equal(msg.type, 'taxnexus/page-signals');
  assert.equal(msg.payload.hasCaInventory, true);
  assert.deepEqual(msg.payload.fcCodes.sort(), ['ONT8', 'SMF1']);
  assert.ok(msg.payload.signals.some((s) => s.includes('ONT8')));
});

test('detects CA via plain location text even without an FC code', () => {
  const page = 'Inventory placement: Tracy, California 95377 — distribution';
  const msg = runCollector(page);
  // No FC code present -> not flagged as inventory, but the CA text signal fires.
  assert.equal(msg.payload.hasCaInventory, false);
  assert.ok(msg.payload.signals.some((s) => /California/i.test(s)));
});

test('does NOT flag a non-California page (Texas FC)', () => {
  const page = 'FBA Inventory  Fulfillment Center: DFW7  Units: 500  Coppell, TX 75019';
  const msg = runCollector(page);
  assert.equal(msg.payload.hasCaInventory, false);
  assert.deepEqual(msg.payload.fcCodes, []);
});

test('emits no network call surface — payload is data only', () => {
  const msg = runCollector('Fulfillment Center: LAX9');
  // The message is plain serialisable data; the content script never fetches.
  assert.equal(typeof msg.payload.capturedAt, 'string');
  assert.ok(!('fetch' in msg));
  // Strip comments, then assert there is genuinely no fetch()/XHR call in code.
  const code = SCRIPT.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(code, /\bfetch\s*\(/);
  assert.doesNotMatch(code, /XMLHttpRequest/);
});
