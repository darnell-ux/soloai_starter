/**
 * TaxNexus content script — Amazon page data collection ONLY.
 *
 * Scope (manifest content_scripts.matches): sellercentral.amazon.com ONLY.
 * www.amazon.com was removed on 2026-09-22 — the CA-text signal it existed to
 * serve fired on Proposition 65 chemical warnings, which are unrelated to
 * nexus and appear on a large share of listings. This file:
 *   - reads the DOM to detect California fulfillment-center (FC) inventory signals
 *   - reports a structured payload to the service worker
 *
 * It MUST NOT:
 *   - make any network/API request (fetch/XHR). All API calls go through the
 *     service worker. There is intentionally no fetch() in this file.
 *   - import ES modules (content scripts are not modules). Constants below are
 *     an inlined copy of ../../shared/messages.js — keep them in sync.
 */
(() => {
  'use strict';

  const MSG = {
    PAGE_SIGNALS: 'taxnexus/page-signals'
  };
  const COLLECT_NOW = 'taxnexus/collect-now';

  // Known California Amazon fulfillment-center code prefixes (airport-style).
  // A code such as "ONT8" or "SMF1" on a Seller Central inventory page means
  // the seller's stock physically sits in California — the single fact that
  // trips both FTB "doing business" (R&TC 23101(a)) and CDTFA registration,
  // at ANY sales volume. See reference-launch/taxnexus-audit-logic-spec.md §1.
  const CA_FC_PREFIXES = [
    'SMF', 'LAX', 'ONT', 'OAK', 'SBD', 'FAT',
    'MCE', 'SCK', 'LGB', 'RIC', 'BUR', 'XUSC'
  ];
  const CA_FC_REGEX = new RegExp(
    '\\b(?:' + CA_FC_PREFIXES.join('|') + ')\\d{0,2}\\b',
    'g'
  );
  // Plain-language CA location mentions on inventory/placement pages.
  const CA_TEXT_REGEX = /\b(california|,\s*CA\b|\bCA\s+9\d{4})\b/i;

  // Cap the scanned text so a huge DOM can't blow up the regex pass.
  const MAX_TEXT = 200000;
  // Shadow trees nest. Bound the walk so a pathological page cannot hang the
  // collector; 10 is far deeper than any real component hierarchy.
  const MAX_SHADOW_DEPTH = 10;

  /**
   * Rendered page text, INCLUDING open shadow roots.
   *
   * `document.body.innerText` stops at every shadow boundary, and Seller
   * Central is built out of web components. Measured on a real FBA inventory
   * page (2026-09-22, logged in, empty inventory): 1,384 of 2,668 characters of
   * page text — 52% — sat inside shadow roots and were invisible to a plain
   * innerText read. On a populated page the inventory table is among them,
   * which is exactly where fulfillment-center codes appear. Reading only the
   * light DOM would mean finding nothing on a page that visibly shows ONT8.
   *
   * Content scripts CAN read open shadow roots, so walk them. Closed roots stay
   * invisible — nothing an extension can do about those.
   */
  function collectText(root, depth) {
    if (depth > MAX_SHADOW_DEPTH) return '';
    let out = '';
    try {
      if (typeof root.innerText === 'string') {
        // An Element: innerText already covers its light-DOM subtree.
        out += root.innerText;
      } else {
        // A ShadowRoot has no innerText of its own; read its element children.
        for (const child of root.children || []) out += (child.innerText || '') + '\n';
      }

      const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const el of all) {
        if (el.shadowRoot) out += '\n' + collectText(el.shadowRoot, depth + 1);
        if (out.length > MAX_TEXT) break;
      }
    } catch (err) {
      // A single unreadable node must not lose the whole page.
      console.debug('[TaxNexus] shadow walk skipped a node:', err);
    }
    return out;
  }

  /**
   * Inspect the rendered page for California inventory signals.
   * Returns a serialisable payload; performs no network activity.
   */
  function collectSignals() {
    const text = collectText(document.body, 0).slice(0, MAX_TEXT);

    const fcMatches = Array.from(new Set(text.match(CA_FC_REGEX) || []));
    const hasCaText = CA_TEXT_REGEX.test(text);
    const hasCaInventory = fcMatches.length > 0;

    const signals = [];
    if (hasCaInventory) {
      signals.push('CA fulfillment-center code(s): ' + fcMatches.join(', '));
    }
    if (hasCaText) {
      signals.push('California location text present on page');
    }

    return {
      type: MSG.PAGE_SIGNALS,
      payload: {
        hasCaInventory,
        // Reported separately from hasCaInventory, and deliberately NOT an
        // alert on its own: an FC code proves stock physically sits in CA,
        // whereas "California" in page text can be a Prop 65 chemical warning.
        // The service worker keys its alert off hasCaInventory only; this is
        // context shown in the popup's signal list.
        hasCaText,
        fcCodes: fcMatches,
        signals,
        host: location.host,
        path: location.pathname,
        capturedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Identity of a collection result. The service worker calls the assess API
   * for every payload it receives, so an SPA re-render that changes nothing
   * must not re-send — otherwise idle browsing hammers the endpoint.
   */
  function signatureOf(payload) {
    return [
      payload.path,
      payload.hasCaInventory ? '1' : '0',
      payload.hasCaText ? '1' : '0',
      payload.fcCodes.join(',')
    ].join('|');
  }

  let lastSignature = null;

  function report(force) {
    let message;
    try {
      message = collectSignals();
    } catch (err) {
      // Never throw into the page; collection failures are non-fatal.
      console.debug('[TaxNexus] collection skipped:', err);
      return;
    }
    const signature = signatureOf(message.payload);
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    // Hand off to the service worker. The SW owns ALL outbound API calls.
    chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
  }

  // --- SPA navigation ---------------------------------------------------
  // Seller Central is a single-page app: clicking from Orders to FBA
  // Inventory swaps the view WITHOUT a document load, so `run_at:
  // document_idle` never fires again and the badge would keep showing the
  // previous view's verdict. Since that click-through is how sellers
  // normally reach their inventory, missing it means missing the detection
  // in ordinary use.
  //
  // Why polling rather than hooking history.pushState: a content script runs
  // in an isolated world with its OWN wrappers for page globals, so patching
  // `history.pushState` here never intercepts the page's own calls. Reading
  // `location` is cross-world safe, so we compare it on a timer instead.
  // popstate/hashchange are still worth listening to — they let back/forward
  // and hash routing respond immediately instead of waiting for a tick.
  const URL_POLL_MS = 1000;
  const SETTLE_MS = 800; // let the new view render before reading its text

  let lastUrl = location.href;
  let settleTimer = null;

  function scheduleCollect() {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      report();
    }, SETTLE_MS);
  }

  function checkForNavigation() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    scheduleCollect();
  }

  addEventListener('popstate', checkForNavigation);
  addEventListener('hashchange', checkForNavigation);
  setInterval(checkForNavigation, URL_POLL_MS);

  // Re-collect on demand (popup -> SW -> chrome.scripting re-inject, or a direct
  // message from the SW). Responds so the SW can await a fresh pass.
  // Forced: an explicit "Re-scan this page" must report even if nothing changed,
  // so the user gets feedback rather than silence.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === COLLECT_NOW) {
      report(true);
      sendResponse({ ok: true });
    }
    return false;
  });

  // Initial collection once the page has settled.
  report();
})();
