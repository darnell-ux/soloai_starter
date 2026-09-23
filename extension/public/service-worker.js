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
const ALERT = { HIGH: 'high', NONE: 'none' };

/** Snooze silences every alert for 7 days. Persisted, so it survives restart. */
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
/** Per-tab detection records older than this are swept on startup. */
const DETECTION_TTL_MS = 24 * 60 * 60 * 1000;

const detectionKey = (tabId) => `${STORAGE.DETECTION_PREFIX}${tabId}`;

// The trial CTA. A UTM-tagged link the popup opens — a link, not a request.
// This is the extension's ENTIRE integration surface with the app.
const APP_BASE = 'https://taxnexusapp.com';
const TRIAL_URL = `${APP_BASE}/trial`;
const trialUrl = (alertLevel) =>
  `${TRIAL_URL}?source=chrome_extension&alert=${encodeURIComponent(alertLevel || ALERT.NONE)}`;

// Where Chrome sends the user when they uninstall. This is the ONLY churn
// signal available to a zero-telemetry extension: we never learn about
// installs, activations or detections, so without it an uninstall is entirely
// invisible and there is no way to ask what went wrong.
//
// It does NOT make the extension network-connected. Nothing is sent from here;
// Chrome navigates a tab after the user clicks Uninstall, which is a user
// action on their own machine. No identifier is attached — the page cannot tell
// one uninstaller from another, which is deliberate.
const UNINSTALL_URL = `${APP_BASE}/uninstall?source=chrome_extension`;

/**
 * Register the uninstall page. Set on install/update AND on browser startup:
 * the value persists per-profile once set, but a single failed call would
 * otherwise never be retried, silently costing the only signal we have.
 */
function registerUninstallUrl() {
  try {
    chrome.runtime.setUninstallURL(UNINSTALL_URL, () => void chrome.runtime.lastError);
  } catch (err) {
    console.debug('[TaxNexus] could not set uninstall URL:', err);
  }
}

// --- assessment (fully local) ------------------------------------------------
//
// This used to POST to /api/taxnexus/assess. It no longer makes ANY network
// request, because the call could only ever return one of two fixed answers.
//
// The extension sent three of the four inputs as constants — sales: 0,
// hasEmployees: false, entityType: 'LLC' — leaving `inventory` (1 or 0) as the
// only variable. Walking the server's engine (src/lib/server/taxnexus/
// assess-nexus.ts) with those inputs: sales 0 never reaches the $757,070
// threshold, hasEmployees false never trips payroll, and inventory 1 is below
// the $75,707 property threshold so it always lands on the "Physical inventory
// in CA" branch. Two inputs, two possible outputs, both verified against
// production. The round trip was computing a constant.
//
// Removing it means the extension makes zero network requests of any kind,
// which is both a much stronger privacy claim and one a Web Store reviewer can
// confirm in the Network tab. It also means a clear page reads CLEAR while
// offline instead of degrading to "No data yet".
//
// Only two values are duplicated from the server: the trigger string and the
// $800 minimum franchise tax. Deliberately NOT duplicated: FORM_DATABASE (the
// popup never renders forms) and the indexed thresholds (this path never
// reaches them). $800 is statutory and long stable; if FTB ever changes the
// rule that any CA inventory creates nexus, this extension needs a rethink
// regardless of where the constant lives.
const MIN_FRANCHISE_TAX = 800;
const CA_INVENTORY_TRIGGER = 'Physical inventory in CA (Amazon FBA/3PL Nexus)';

const ASSESSMENT_EXPOSED = Object.freeze({
  hasNexus: true,
  triggers: Object.freeze([CA_INVENTORY_TRIGGER]),
  minTax: MIN_FRANCHISE_TAX
});
const ASSESSMENT_CLEAR = Object.freeze({
  hasNexus: false,
  triggers: Object.freeze([]),
  minTax: 0
});

/** Mirrors assessNexus() in the app for the only inputs this extension uses. */
function assessLocally(signals) {
  return signals.hasCaInventory ? ASSESSMENT_EXPOSED : ASSESSMENT_CLEAR;
}

function riskFromAssessment(signals, assessment) {
  // Physical presence makes a seller "doing business" at any sales volume, so a
  // detected CA fulfillment-center code is decisive on its own. Now that the
  // assessment is computed locally this can never be indeterminate — there is no
  // network call left to fail, which is exactly the point: the blindside warning
  // works with the machine offline.
  if (signals.hasCaInventory) return RISK.EXPOSED;
  return assessment.hasNexus ? RISK.EXPOSED : RISK.CLEAR;
}

/**
 * Severity shown to the user. Only a CA fulfillment-center code (or an assess
 * response that says nexus) raises an alert.
 *
 * `signals.hasCaText` deliberately does NOT raise one. It used to, as a "LOW"
 * level, until real-page testing showed it firing on Proposition 65 chemical
 * warnings — which mention California on a large share of Amazon listings and
 * say nothing about where inventory sits. The text is still collected and
 * shown as page context; it just isn't an alert by itself.
 */
function alertLevelFor(signals, risk) {
  if (signals.hasCaInventory || risk === RISK.EXPOSED) return ALERT.HIGH;
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
  const assessment = assessLocally(signals);
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

  // Must mirror content_scripts.matches in the manifest — Seller Central only.
  const onAmazon = /^https:\/\/sellercentral\.amazon\.com\//.test(tab.url || '');
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
chrome.runtime.onInstalled.addListener(() => {
  registerUninstallUrl();
  void chrome.action.setBadgeText({ text: '' });
});

chrome.runtime.onStartup.addListener(() => {
  registerUninstallUrl();
  void (async () => {
    await chrome.action.setBadgeText({ text: '' });
    await cleanupStaleDetections();
    await resetDismissedTabs();
  })();
});
