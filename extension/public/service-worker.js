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
  GET_STATE: 'taxnexus/get-state',
  SNOOZE: 'taxnexus/snooze',
  DISMISS: 'taxnexus/dismiss'
};
const COLLECT_NOW = 'taxnexus/collect-now';
const STORAGE = {
  LATEST: 'taxnexus.latest',
  SNOOZE_UNTIL: 'snooze_until',
  DISMISSED_TABS: 'dismissed_tabs',
  LAST_ALERT_LEVEL: 'last_alert_level',
  DETECTION_PREFIX: 'detection_'
};
const RISK = { EXPOSED: 'exposed', CLEAR: 'clear', UNKNOWN: 'unknown' };
const ALERT = { HIGH: 'high', LOW: 'low', NONE: 'none' };

/** Snooze silences every alert for 7 days. Persisted, so it survives restart. */
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
/** Per-tab detection records older than this are swept on startup. */
const DETECTION_TTL_MS = 24 * 60 * 60 * 1000;

const detectionKey = (tabId) => `${STORAGE.DETECTION_PREFIX}${tabId}`;

// The TaxNexus app's nexus-assessment endpoint (SvelteKit: src/routes/api/taxnexus/assess).
// For local dev against the running app, switch to 'http://localhost:5173'.
// NOTE on permissions: we deliberately keep host_permissions empty so the
// manifest's `permissions` stays exactly [activeTab, storage, scripting]. That
// means this cross-origin fetch relies on the API returning permissive CORS
// headers for the extension origin (see extension/README.md → "API access").
const API_BASE = 'https://taxnexusapp.com';
const ASSESS_ENDPOINT = `${API_BASE}/api/taxnexus/assess`;

// The trial CTA. This is the ENTIRE Strapi/app integration surface beyond the
// assess call — a UTM-tagged link the popup opens; the extension never reads
// or writes Strapi content itself.
const TRIAL_URL = `${API_BASE}/trial`;
const trialUrl = (alertLevel) =>
  `${TRIAL_URL}?source=chrome_extension&alert=${encodeURIComponent(alertLevel || ALERT.NONE)}`;

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

/**
 * Severity shown to the user. An FC code is proof of physical CA stock (HIGH);
 * bare "California" page text is a hint worth checking, not proof (LOW).
 */
function alertLevelFor(signals, risk) {
  if (signals.hasCaInventory || risk === RISK.EXPOSED) return ALERT.HIGH;
  if (signals.hasCaText) return ALERT.LOW;
  return ALERT.NONE;
}

// --- snooze / dismiss state -------------------------------------------------

/** One batched read of every alert-suppression key. */
async function suppressionState(tabId) {
  const keys = [STORAGE.SNOOZE_UNTIL, STORAGE.DISMISSED_TABS];
  const stored = await chrome.storage.local.get(keys);
  const snoozeUntil = Number(stored[STORAGE.SNOOZE_UNTIL]) || 0;
  const dismissed = Array.isArray(stored[STORAGE.DISMISSED_TABS])
    ? stored[STORAGE.DISMISSED_TABS]
    : [];
  return {
    snoozeUntil,
    snoozed: snoozeUntil > Date.now(),
    dismissedTabs: dismissed,
    dismissed: typeof tabId === 'number' && dismissed.includes(tabId)
  };
}

/** Silence all alerts for 7 days and clear the badge everywhere. */
async function snooze() {
  const until = Date.now() + SNOOZE_DURATION_MS;
  await chrome.storage.local.set({ [STORAGE.SNOOZE_UNTIL]: until });
  await chrome.action.setBadgeText({ text: '' });
  return { ok: true, snoozeUntil: until };
}

/** Clear the alert for a single tab, leaving every other tab alone. */
async function dismissTab(tabId) {
  if (typeof tabId !== 'number') return { ok: false, reason: 'no_tab' };
  const { dismissedTabs } = await suppressionState();
  if (!dismissedTabs.includes(tabId)) {
    await chrome.storage.local.set({
      [STORAGE.DISMISSED_TABS]: [...dismissedTabs, tabId]
    });
  }
  await chrome.action.setBadgeText({ text: '', tabId });
  return { ok: true, tabId };
}

async function setBadge(risk, tabId) {
  // A tabId scopes the badge to one tab; without one Chrome sets the global
  // default. Both paths go through here so suppression is checked exactly once.
  const target = typeof tabId === 'number' ? { tabId } : {};

  if (risk === RISK.EXPOSED) {
    await chrome.action.setBadgeBackgroundColor({ color: '#b91c1c', ...target });
    await chrome.action.setBadgeText({ text: '!', ...target });
  } else if (risk === RISK.CLEAR) {
    await chrome.action.setBadgeBackgroundColor({ color: '#15803d', ...target });
    await chrome.action.setBadgeText({ text: '✓', ...target });
  } else {
    await chrome.action.setBadgeText({ text: '', ...target });
  }
}

/** Persist the latest signals + assessment and reflect it in the toolbar badge. */
async function handlePageSignals(signals, tabId) {
  let assessment = null;
  try {
    assessment = await assessNexus(signals);
  } catch (err) {
    console.warn('[TaxNexus] assess request failed:', err);
  }
  const risk = riskFromAssessment(signals, assessment);
  const alertLevel = alertLevelFor(signals, risk);
  const record = {
    signals,
    assessment,
    risk,
    alertLevel,
    ctaUrl: trialUrl(alertLevel),
    updatedAt: new Date().toISOString()
  };

  // One batched write: the global "latest" record the popup falls back to, the
  // last alert level, and — when we know the tab — that tab's own detection.
  const writes = {
    [STORAGE.LATEST]: record,
    [STORAGE.LAST_ALERT_LEVEL]: alertLevel
  };
  if (typeof tabId === 'number') {
    writes[detectionKey(tabId)] = { ...record, tabId, storedAt: Date.now() };
  }
  await chrome.storage.local.set(writes);

  // Storage is always written (the popup still shows the finding on demand);
  // only the *interruption* — the badge — is suppressed.
  const { snoozed, dismissed } = await suppressionState(tabId);
  if (snoozed || dismissed) {
    await setBadge(RISK.UNKNOWN, tabId);
    return { ...record, suppressed: snoozed ? 'snoozed' : 'dismissed' };
  }

  await setBadge(risk, tabId);
  return record;
}

/** Re-run collection on the active tab using activeTab + scripting. */
async function rescanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return { ok: false, reason: 'no_active_tab' };

  const onAmazon = /^https:\/\/(www|sellercentral)\.amazon\.com\//.test(tab.url || '');
  if (!onAmazon) return { ok: false, reason: 'not_amazon' };

  // A re-scan is a deliberate user action, so it un-dismisses this tab.
  const { dismissedTabs } = await suppressionState();
  if (dismissedTabs.includes(tab.id)) {
    await chrome.storage.local.set({
      [STORAGE.DISMISSED_TABS]: dismissedTabs.filter((id) => id !== tab.id)
    });
  }

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

// --- housekeeping -----------------------------------------------------------

/**
 * Drop detection_{tabId} records older than 24h. Tab ids are recycled by Chrome
 * across sessions, so a stale record could otherwise be shown against an
 * unrelated tab that happens to reuse the id.
 */
async function cleanupStaleDetections(now = Date.now()) {
  const all = await chrome.storage.local.get(null);
  const stale = Object.keys(all || {}).filter((key) => {
    if (!key.startsWith(STORAGE.DETECTION_PREFIX)) return false;
    const storedAt = Number(all[key]?.storedAt) || 0;
    // A record with no usable timestamp is from an older schema — sweep it too.
    return now - storedAt > DETECTION_TTL_MS;
  });
  if (stale.length) await chrome.storage.local.remove(stale);
  return stale;
}

/** Tab ids do not survive a browser restart, so per-tab dismissals cannot either. */
async function resetDismissedTabs() {
  await chrome.storage.local.remove(STORAGE.DISMISSED_TABS);
}

// Single message router. Returns true to keep the response channel open for
// the async handlers.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;

  // The content script's own tab; the popup has no sender.tab and passes an
  // explicit tabId instead.
  const senderTabId = sender?.tab?.id;

  switch (message.type) {
    case MSG.PAGE_SIGNALS:
      handlePageSignals(message.payload, senderTabId).then(sendResponse);
      return true;
    case MSG.RESCAN:
      rescanActiveTab().then(sendResponse);
      return true;
    case MSG.GET_STATE:
      getState().then(sendResponse);
      return true;
    case MSG.SNOOZE:
      snooze().then(sendResponse);
      return true;
    case MSG.DISMISS:
      dismissTab(typeof message.tabId === 'number' ? message.tabId : senderTabId).then(sendResponse);
      return true;
    default:
      return false;
  }
});

// A closed tab's dismissal and detection record are both dead weight.
chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const { dismissedTabs } = await suppressionState();
    if (dismissedTabs.includes(tabId)) {
      await chrome.storage.local.set({
        [STORAGE.DISMISSED_TABS]: dismissedTabs.filter((id) => id !== tabId)
      });
    }
    await chrome.storage.local.remove(detectionKey(tabId));
  })();
});

// Clear any stale badge on install/startup.
chrome.runtime.onInstalled.addListener(() => chrome.action.setBadgeText({ text: '' }));

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    await chrome.action.setBadgeText({ text: '' });
    await cleanupStaleDetections();
    await resetDismissedTabs();
  })();
});
