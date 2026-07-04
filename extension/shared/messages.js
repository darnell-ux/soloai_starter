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
  GET_STATE: 'taxnexus/get-state'
};

// chrome.storage.local keys
export const STORAGE = {
  LATEST: 'taxnexus.latest' // { signals, assessment, updatedAt }
};

// Risk levels surfaced in the popup + badge.
export const RISK = {
  EXPOSED: 'exposed',
  CLEAR: 'clear',
  UNKNOWN: 'unknown'
};
