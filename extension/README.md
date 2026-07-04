# TaxNexus Nexus Alert Toolbar

A Manifest V3 Chrome extension that warns Amazon FBA sellers when their inventory
signals **California nexus exposure** — the moment that makes a seller "doing
business" under FTB R&TC 23101(a) and triggers CDTFA registration, at *any* sales
volume. This is awareness/blindside-protection, not tax advice. See
`../reference-launch/taxnexus-audit-logic-spec.md` for the underlying logic.

## Architecture

```
Amazon Seller Central page
        │  (DOM read only — no network)
        ▼
content/amazon-collector.js  ──sendMessage──►  service-worker.js
   detects CA fulfillment-center                 • the ONLY fetch() in the app
   codes (ONT8, SMF1, …)                         • POST /api/taxnexus/assess
                                                 • writes chrome.storage.local
                                                 • sets toolbar badge
        ┌──────────────────────────────────────────────┘
        ▼
   Popup.svelte  ◄── reads state via GET_STATE / storage.onChanged
   (Svelte 5, compiled by Vite — no network, no API logic)
```

Internal message contract + storage keys live in `shared/messages.js`. The
service worker and content script keep inlined copies (they are not bundled);
the popup imports the module.

## Build & load

```bash
cd extension
npm install
npm run icons     # one-time: generates public/icons/*.png
npm run build     # compiles the Svelte popup -> dist/, copies public/ verbatim
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select **`extension/dist`**.

`npm run dev` rebuilds on change (reload the extension in Chrome to pick it up).

## Layout

| Path | Role |
|------|------|
| `public/manifest.json` | MV3 manifest (copied to `dist/`) |
| `public/service-worker.js` | Background logic + the only network calls |
| `public/content/amazon-collector.js` | Amazon-scoped DOM collection |
| `public/icons/` | Toolbar icons (generated) |
| `src/popup/` | Svelte 5 popup (compiled by Vite) |
| `shared/messages.js` | Message/storage contract (source of truth) |
| `test/detection.test.mjs` | Runs the real content script against fixtures |

## API access (why permissions stay minimal)

`permissions` is intentionally exactly `["activeTab", "storage", "scripting"]`
with **no `host_permissions`**. The Amazon content script is scoped through
`content_scripts.matches` (declarative content scripts grant their own scoped
host access without enlarging the `permissions` array).

Because there is no host permission for the API origin, the service worker's
`fetch` to `https://taxnexusapp.com/api/taxnexus/assess` relies on the API
returning permissive **CORS** headers for the extension origin. Two production
options:

1. Add `Access-Control-Allow-Origin` for the extension on the SvelteKit
   `/api/taxnexus/assess` route (keeps permissions minimal — preferred), **or**
2. Add `"host_permissions": ["https://taxnexusapp.com/*"]` to the manifest
   (avoids CORS but widens the permission surface).

This scaffold ships option 1's assumption. For local testing against the running
app, set `API_BASE` in `service-worker.js` to `http://localhost:5173`.

## Verification against the 8 review criteria

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | MV3, loads unpacked | ✅ | `manifest.json` `manifest_version: 3`; `npm run build` → load `dist/`; relative asset paths in `dist/index.html` |
| 2 | Popup UI opens w/o errors | ✅ | `action.default_popup: index.html`; Svelte popup compiled, no top-level throws |
| 3 | Service worker registered | ✅ | `background.service_worker` + `type: module`; routes all background logic |
| 4 | Content scripts Amazon-only | ✅ | `content_scripts.matches` = sellercentral + www.amazon.com; collection only, no fetch |
| 5 | API calls via SW only | ✅ | single `fetch(` is `service-worker.js:43`; popup & content script have none (test-enforced) |
| 6 | Minimal permissions | ✅ | exactly `activeTab, storage, scripting`; each is used (scripting: `executeScript`; storage: `local`; activeTab: rescan) |
| 7 | Manual test of CA detection | ✅ | `npm test` — 4 cases against the real content script (see below) |
| 8 | One flow flagged for E2E | ✅ | see "E2E candidate" below |

## Manual test record (#7) — CA warehouse detection flow

`test/detection.test.mjs` loads the **actual** `amazon-collector.js` in a sandbox
with fixture Seller Central markup and asserts the message it emits:

- ✅ CA FC codes `ONT8` + `SMF1` → `hasCaInventory: true`, both codes reported
- ✅ "Tracy, California 95377" text → CA location signal (no FC code → not inventory)
- ✅ Texas FC `DFW7` → not flagged (no false positive)
- ✅ payload is data-only; no `fetch(`/`XMLHttpRequest` anywhere in the script

Run: `npm test` → `tests 4 / pass 4 / fail 0`.

This is logic-level verification of the detection path. It does **not** drive a
real browser, render the popup, or exercise the live `/api/taxnexus/assess`
round trip — which is exactly why that end-to-end path is the E2E candidate.

## E2E candidate for future work (#8)

**Mission-critical flow:** *Seller Central FBA inventory page → CA exposure shown
in the popup.* Full chain: content script collects on a real page → service
worker calls `/api/taxnexus/assess` → `chrome.storage` updated → badge turns red
→ popup opens and renders "CA nexus exposure detected" with the triggers.

This is the product's core promise (the blindside warning) and the one flow that
spans every component plus the network boundary, so it carries the most
integration risk. Recommended harness: Playwright with a persistent context and
`--load-extension=dist` (Chromium), a stubbed/mocked `assess` endpoint for
determinism, asserting badge text and popup contents.
