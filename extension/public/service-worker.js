/**
 * TaxNexus service worker — ALL background logic and the ONLY place that talks
 * to the network. The popup and the content script never call fetch(); they
 * message this worker, which owns every outbound API call.
 *
 * Loaded as a module (manifest background.type = "module") but intentionally
 * self-contained: it is copied verbatim (not bundled), so constants below are
 * an inlined copy of ../shared/messages.js — keep them in sync.
 */

const MSG = {
  PAGE_SIGNALS: 'taxnexus/page-signals',
  RESCAN: 'taxnexus/rescan',
  GET_STATE: 'taxnexus/get-state'
};
const COLLECT_NOW = 'taxnexus/collect-now';
const STORAGE = { LATEST: 'taxnexus.latest' };
const RISK = { EXPOSED: 'exposed', CLEAR: 'clear', UNKNOWN: 'unknown' };

// The TaxNexus app's nexus-assessment endpoint (SvelteKit: src/routes/api/taxnexus/assess).
// For local dev against the running app, switch to 'http://localhost:5173'.
// NOTE on permissions: we deliberately keep host_permissions empty so the
// manifest's `permissions` stays exactly [activeTab, storage, scripting]. That
// means this cross-origin fetch relies on the API returning permissive CORS
// headers for the extension origin (see extension/README.md → "API access").
const API_BASE = 'https://taxnexusapp.com';
const ASSESS_ENDPOINT = `${API_BASE}/api/taxnexus/assess`;

/**
 * Ask the TaxNexus API to assess nexus exposure for the collected signals.
 * This is the one and only network call in the whole extension.
 */
async function assessNexus(signals) {
  const body = {
    // Any CA inventory at all -> nonzero, which trips the API's
    // "Physical inventory in CA" trigger regardless of sales volume.
    inventory: signals.hasCaInventory ? 1 : 0,
    sales: 0,
    hasEmployees: false,
    entityType: 'LLC'
  };

  const res = await fetch(ASSESS_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`assess failed: ${res.status}`);
  }
  return res.json();
}

function riskFromAssessment(signals, assessment) {
  // Local CA inventory detection alone is decisive: physical presence makes a
  // seller "doing business" at any sales volume, so a detected CA fulfillment-
  // center code means EXPOSED even when the assess API is unreachable. This must
  // come BEFORE the null-assessment check so the blindside warning still fires
  // during an API outage (otherwise a real CA signal degrades to "No data yet").
  if (signals.hasCaInventory) return RISK.EXPOSED;
  if (!assessment) return RISK.UNKNOWN;
  return assessment.hasNexus ? RISK.EXPOSED : RISK.CLEAR;
}

async function setBadge(risk) {
  if (risk === RISK.EXPOSED) {
    await chrome.action.setBadgeBackgroundColor({ color: '#b91c1c' });
    await chrome.action.setBadgeText({ text: '!' });
  } else if (risk === RISK.CLEAR) {
    await chrome.action.setBadgeBackgroundColor({ color: '#15803d' });
    await chrome.action.setBadgeText({ text: '✓' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

/** Persist the latest signals + assessment and reflect it in the toolbar badge. */
async function handlePageSignals(signals) {
  let assessment = null;
  try {
    assessment = await assessNexus(signals);
  } catch (err) {
    console.warn('[TaxNexus] assess request failed:', err);
  }
  const risk = riskFromAssessment(signals, assessment);
  const record = { signals, assessment, risk, updatedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [STORAGE.LATEST]: record });
  await setBadge(risk);
  return record;
}

/** Re-run collection on the active tab using activeTab + scripting. */
async function rescanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return { ok: false, reason: 'no_active_tab' };

  const onAmazon = /^https:\/\/(www|sellercentral)\.amazon\.com\//.test(tab.url || '');
  if (!onAmazon) return { ok: false, reason: 'not_amazon' };

  // Prefer a direct message to the already-injected content script; if it is
  // not there (e.g. first run), fall back to re-injecting via chrome.scripting.
  try {
    await chrome.tabs.sendMessage(tab.id, { type: COLLECT_NOW });
    return { ok: true, via: 'message' };
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/amazon-collector.js']
    });
    return { ok: true, via: 'inject' };
  }
}

async function getState() {
  const stored = await chrome.storage.local.get(STORAGE.LATEST);
  return stored[STORAGE.LATEST] || null;
}

// Single message router. Returns true to keep the response channel open for
// the async handlers.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;

  switch (message.type) {
    case MSG.PAGE_SIGNALS:
      handlePageSignals(message.payload).then(sendResponse);
      return true;
    case MSG.RESCAN:
      rescanActiveTab().then(sendResponse);
      return true;
    case MSG.GET_STATE:
      getState().then(sendResponse);
      return true;
    default:
      return false;
  }
});

// Clear any stale badge on install/startup.
chrome.runtime.onInstalled.addListener(() => chrome.action.setBadgeText({ text: '' }));
