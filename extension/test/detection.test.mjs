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

/**
 * Boot the content script against a fixture page and keep the handles needed
 * to drive it afterwards — SPA navigation, the poll tick, and a direct
 * COLLECT_NOW message.
 *
 * Timers are captured rather than real: setTimeout fires immediately (the
 * settle delay is not what we're testing) and setInterval hands back its
 * callback so a test can tick it deterministically.
 */
function startCollector(innerText, host = 'sellercentral.amazon.com', pathname = '/inventory/fba') {
  const sent = [];
  const listeners = {};
  let pollFn = null;
  let onMessageFn = null;

  const page = { text: innerText };
  const location = { host, pathname, href: `https://${host}${pathname}` };

  const sandbox = {
    // A getter so the script re-reads page text on every collection, the way a
    // real DOM would after an SPA swaps the view.
    document: {
      get body() {
        return { innerText: page.text };
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

  vm.runInNewContext(SCRIPT, sandbox);

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
  // The service worker hits the assess API for every payload, so a no-op
  // re-render or a same-signal route change must not trigger a network call.
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
