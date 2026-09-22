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
  assert.equal(msg.payload.hasCaText, true);
  assert.ok(msg.payload.signals.some((s) => /California/i.test(s)));
});

test('does NOT flag a non-California page (Texas FC)', () => {
  const page = 'FBA Inventory  Fulfillment Center: DFW7  Units: 500  Coppell, TX 75019';
  const msg = runCollector(page);
  assert.equal(msg.payload.hasCaInventory, false);
  assert.equal(msg.payload.hasCaText, false);
  assert.deepEqual(msg.payload.fcCodes, []);
});

test('reports hasCaInventory and hasCaText as separate booleans', () => {
  // The two must stay distinct: only hasCaInventory (an FC code) is proof that
  // stock physically sits in California, and only it raises an alert. hasCaText
  // is page context. Collapsing them is precisely the Prop 65 bug below.
  const withCode = runCollector('Fulfillment Center: ONT8');
  assert.equal(withCode.payload.hasCaInventory, true);
  assert.equal(withCode.payload.hasCaText, false, 'FC code alone is not location text');

  const textOnly = runCollector('Ships from Los Angeles, CA 90001');
  assert.equal(textOnly.payload.hasCaInventory, false);
  assert.equal(textOnly.payload.hasCaText, true);

  const both = runCollector('Fulfillment Center: SMF1 — Sacramento, California 95837');
  assert.equal(both.payload.hasCaInventory, true);
  assert.equal(both.payload.hasCaText, true);
});

test('a Proposition 65 warning is NOT an inventory signal', () => {
  // Verbatim from a real listing (amazon.com/dp/B08G38VHDW, 2026-09-22) that
  // was raising a CA nexus alert on a dietary supplement. The collector may
  // report the text, but it must never claim CA inventory — the service worker
  // keys its alert off hasCaInventory alone for exactly this reason.
  const page = `UMZU zuPOO Colon Cleanse Capsules, 30 Capsules
    WARNING: California's Proposition 65
    Ships from Amazon.com  Sold by UMZU`;
  const msg = runCollector(page);

  assert.equal(msg.payload.hasCaInventory, false, 'Prop 65 is a chemical warning, not inventory');
  assert.deepEqual(msg.payload.fcCodes, [], 'no fulfillment-center code on the page');
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
