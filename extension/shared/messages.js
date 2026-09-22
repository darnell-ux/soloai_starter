// Single source of truth for the extension's internal message contract and
// storage keys. The popup imports this module (it is bundled by Vite).
//
// NOTE: the service worker (public/service-worker.js) and the content script
// (public/content/amazon-collector.js) are intentionally NOT bundled — they are
// copied verbatim so they load without a build step and so the content script
// is never an ES module. Each of those files keeps an inlined copy of the few
// constants it needs; keep the values below in sync with those copies.

export const MSG = {
	// content script -> service worker: fresh page signals were collected
	PAGE_SIGNALS: 'taxnexus/page-signals',
	// popup -> service worker: re-run collection on the active Amazon tab
	RESCAN: 'taxnexus/rescan',
	// popup -> service worker: read the latest stored assessment
	GET_STATE: 'taxnexus/get-state',
	// popup -> service worker: silence all alerts for SNOOZE_DURATION_MS
	SNOOZE: 'taxnexus/snooze',
	// popup -> service worker: clear the alert for one tab only
	DISMISS: 'taxnexus/dismiss'
};

// service worker -> content script: collect again now
export const COLLECT_NOW = 'taxnexus/collect-now';

// chrome.storage.local keys.
export const STORAGE = {
	LATEST: 'taxnexus.latest', // { signals, assessment, risk, alertLevel, updatedAt }
	SNOOZE_UNTIL: 'snooze_until', // timestamp ms; alerts stay silent until then
	DISMISSED_TABS: 'dismissed_tabs', // array of tab ids dismissed this session
	LAST_ALERT_LEVEL: 'last_alert_level', // string: the most recent ALERT value
	DETECTION_PREFIX: 'detection_' // detection_{tabId} -> per-tab detection record
};

/** Storage key holding the detection record for a single tab. */
export function detectionKey(tabId) {
	return `${STORAGE.DETECTION_PREFIX}${tabId}`;
}

/** Risk levels surfaced in the popup + badge. */
export const RISK = {
	EXPOSED: 'exposed',
	CLEAR: 'clear',
	UNKNOWN: 'unknown'
};

/**
 * Alert level — the user-facing severity, derived from which CA signal fired.
 *
 *   HIGH  a CA fulfillment-center code (ONT8, SMF1, …) is on the page. The
 *         seller's stock physically sits in California: "doing business" under
 *         R&TC 23101(a) at any sales volume. Decisive.
 *   LOW   California location text only, no FC code — e.g. a product page that
 *         merely ships from / mentions CA. Worth a look, not proof.
 *   NONE  no CA signal at all.
 */
export const ALERT = {
	HIGH: 'high',
	LOW: 'low',
	NONE: 'none'
};

/** Snooze silences every alert for 7 days (survives browser restart). */
export const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Per-tab detection records older than this are swept on startup. */
export const DETECTION_TTL_MS = 24 * 60 * 60 * 1000;

/** The one outbound link the extension offers: the TaxNexus trial, UTM-tagged. */
export const TRIAL_URL = 'https://taxnexusapp.com/trial';

/**
 * Build the trial CTA URL. The extension makes NO API calls to Strapi or to the
 * app beyond /api/taxnexus/assess — this link is the entire "integration".
 */
export function trialUrl(alertLevel) {
	return `${TRIAL_URL}?source=chrome_extension&alert=${encodeURIComponent(alertLevel || ALERT.NONE)}`;
}
