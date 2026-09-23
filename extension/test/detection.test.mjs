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
import { loadCollector } from './harness.mjs';

const SCRIPT = readFileSync(
  resolve(import.meta.dirname, '../public/content/amazon-collector.js'),
  'utf8'
);

/**
 * Thin positional wrapper over the shared collector harness (harness.mjs), so
 * there is exactly one implementation of the content-script sandbox — this file
 * and spa-integration.test.mjs drive the same code.
 */
const startCollector = (innerText, host, pathname) =>
  loadCollector(innerText, { host, pathname });

/** Run the content script once; return the message it sends. */
function runCollector(innerText, host, pathname) {
  return startCollector(innerText, host, pathname).last();
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

// --- SPA navigation ---------------------------------------------------------
// Seller Central swaps views without a document load, so `run_at: document_idle`
// fires exactly once per real page load. Clicking Orders -> FBA Inventory is how
// sellers normally reach their inventory; if that produced no collection, the
// product would silently miss its primary detection in ordinary use.

test('SPA navigation to an inventory view triggers a fresh collection', () => {
  const s = startCollector('Seller Central — Orders  Nothing to see', 'sellercentral.amazon.com', '/orders');
  assert.equal(s.sent.length, 1, 'initial collection on load');
  assert.equal(s.last().payload.hasCaInventory, false);

  // The seller clicks through to FBA Inventory: URL changes, no page reload.
  s.navigate('/inventory/fba', 'FBA Inventory  Fulfillment Center: ONT8  Units: 240');

  assert.equal(s.sent.length, 2, 'navigation produced a second collection');
  assert.equal(s.last().payload.hasCaInventory, true, 'CA inventory detected after the route change');
  assert.deepEqual(s.last().payload.fcCodes, ['ONT8']);
  assert.equal(s.last().payload.path, '/inventory/fba', 'payload carries the NEW path');
});

test('a poll tick with no navigation sends nothing', () => {
  const s = startCollector('FBA Inventory  Fulfillment Center: ONT8');
  assert.equal(s.sent.length, 1);

  s.tick();
  s.tick();

  assert.equal(s.sent.length, 1, 'unchanged URL must not re-report');
});

test('navigating between pages with identical signals does not re-report', () => {
  // Dedup keeps the service worker from rewriting storage and repainting the
  // badge on every poll tick, so a no-op re-render or a same-signal route
  // change must not re-report.
  const s = startCollector('Seller Central home — no inventory here', 'sellercentral.amazon.com', '/home');
  assert.equal(s.sent.length, 1);

  s.navigate('/home', 'Seller Central home — no inventory here');
  assert.equal(s.sent.length, 1, 'same URL, same text -> nothing sent');

  s.setText('Seller Central — still nothing');
  s.tick();
  assert.equal(s.sent.length, 1, 'text churn without navigation -> nothing sent');
});

test('back/forward navigation is picked up via popstate, without waiting for a tick', () => {
  // popstate exists so browser back/forward responds immediately instead of up
  // to a second later. Deliberately never calls tick(), so a regression that
  // relied on the poll would fail here.
  const s = startCollector('Orders  Nothing here', 'sellercentral.amazon.com', '/orders');
  assert.equal(s.sent.length, 1);
  assert.equal(s.last().payload.hasCaInventory, false);

  s.setUrl('/inventory/fba', 'FBA Inventory  Fulfillment Center: SMF1');
  s.fire('popstate');

  assert.equal(s.sent.length, 2, 'popstate alone drove the collection');
  assert.deepEqual(s.last().payload.fcCodes, ['SMF1']);
  assert.equal(s.last().payload.path, '/inventory/fba');
});

test('hash routing is picked up via hashchange, without waiting for a tick', () => {
  const s = startCollector('Orders  Nothing here', 'sellercentral.amazon.com', '/orders');
  assert.equal(s.sent.length, 1);

  s.setUrl('/inventory#fba', 'FBA Inventory  Fulfillment Center: ONT8');
  s.fire('hashchange');

  assert.equal(s.sent.length, 2, 'hashchange alone drove the collection');
  assert.deepEqual(s.last().payload.fcCodes, ['ONT8']);
});

test('an explicit Re-scan reports even when nothing changed', () => {
  // Dedup must never swallow a deliberate user action — silence would read
  // as a broken button.
  const s = startCollector('FBA Inventory  Fulfillment Center: ONT8');
  assert.equal(s.sent.length, 1);

  s.tick();
  assert.equal(s.sent.length, 1, 'dedup holds for automatic passes');

  s.collectNow();
  assert.equal(s.sent.length, 2, 'forced re-scan always reports');
  assert.equal(s.last().payload.hasCaInventory, true);
});

// --- shadow DOM --------------------------------------------------------------
// Seller Central is built from web components and document.body.innerText stops
// at every shadow boundary. Measured on a real FBA inventory page (logged in,
// empty inventory, 2026-09-22): shallow 1284 chars, full 2668, so 1384 — 52% of
// the page text — was invisible to a plain innerText read. On a populated page
// the inventory table is among that, which is where FC codes live.

test('finds an FC code that exists ONLY inside an open shadow root', () => {
  // The regression that matters: light DOM says nothing, the component says ONT8.
  const msg = loadCollector('FBA Inventory  Filters  Page preferences', {
    shadow: ['SKU GADGET-01  Fulfillment Center: ONT8  Units: 240']
  }).last();

  assert.equal(msg.payload.hasCaInventory, true, 'shadow content must be scanned');
  assert.deepEqual(msg.payload.fcCodes, ['ONT8']);
});

test('merges light-DOM and shadow text rather than replacing one with the other', () => {
  const msg = loadCollector('Fulfillment Center: SMF1', {
    shadow: ['Fulfillment Center: ONT8']
  }).last();

  assert.equal(msg.payload.hasCaInventory, true);
  assert.deepEqual(msg.payload.fcCodes.sort(), ['ONT8', 'SMF1'], 'both sources contribute');
});

test('a non-CA code in shadow DOM still does not flag', () => {
  // Piercing shadow roots must not become a source of false positives.
  const msg = loadCollector('FBA Inventory', {
    shadow: ['Fulfillment Center: DFW7  Coppell, TX 75019']
  }).last();

  assert.equal(msg.payload.hasCaInventory, false);
  assert.deepEqual(msg.payload.fcCodes, []);
});

test('a page with no shadow roots still works exactly as before', () => {
  const msg = loadCollector('Fulfillment Center: LAX9', { shadow: [] }).last();
  assert.equal(msg.payload.hasCaInventory, true);
  assert.deepEqual(msg.payload.fcCodes, ['LAX9']);
});

test('shadow content is re-read on SPA navigation, not cached from first load', () => {
  // The collector reads the DOM fresh each pass; if it cached the shadow walk,
  // navigating into the inventory view would report the previous view's text.
  const s = loadCollector('Orders', { pathname: '/orders', shadow: ['nothing here'] });
  assert.equal(s.last().payload.hasCaInventory, false);

  s.setShadow(['Fulfillment Center: SMF1  Units: 88']);
  s.navigate('/inventory/fba', 'FBA Inventory');

  assert.equal(s.last().payload.hasCaInventory, true);
  assert.deepEqual(s.last().payload.fcCodes, ['SMF1']);
});
