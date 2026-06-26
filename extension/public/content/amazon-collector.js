/**
 * TaxNexus content script — Amazon page data collection ONLY.
 *
 * Scope (manifest content_scripts.matches): sellercentral.amazon.com and
 * www.amazon.com. This file:
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

  /**
   * Inspect the rendered page for California inventory signals.
   * Returns a serialisable payload; performs no network activity.
   */
  function collectSignals() {
    // Cap the scanned text so a huge DOM can't blow up the regex pass.
    const text = (document.body?.innerText || '').slice(0, 200000);

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
        fcCodes: fcMatches,
        signals,
        host: location.host,
        path: location.pathname,
        capturedAt: new Date().toISOString()
      }
    };
  }

  function report() {
    let message;
    try {
      message = collectSignals();
    } catch (err) {
      // Never throw into the page; collection failures are non-fatal.
      console.debug('[TaxNexus] collection skipped:', err);
      return;
    }
    // Hand off to the service worker. The SW owns ALL outbound API calls.
    chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
  }

  // Re-collect on demand (popup -> SW -> chrome.scripting re-inject, or a direct
  // message from the SW). Responds so the SW can await a fresh pass.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === COLLECT_NOW) {
      report();
      sendResponse({ ok: true });
    }
    return false;
  });

  // Initial collection once the page has settled.
  report();
})();
