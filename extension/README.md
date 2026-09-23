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
   detects CA fulfillment-center                 • assesses locally (no network)
   codes (ONT8, SMF1, …)                         • writes chrome.storage.local
   re-runs on SPA navigation                     • sets toolbar badge
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
| `public/service-worker.js` | Background logic + local assessment (no network) |
| `public/content/amazon-collector.js` | Amazon-scoped DOM collection |
| `public/icons/` | Generated: `icon*` (tiled, store) + `toolbar*` (transparent) |
| `src/popup/` | Svelte 5 popup (compiled by Vite) |
| `shared/messages.js` | Message/storage contract (source of truth) |
| `test/detection.test.mjs` | Real content script: detection + SPA navigation |
| `test/service-worker.test.mjs` | Assess → risk → alert level → badge decisions |
| `test/storage.test.mjs` | Snooze, per-tab dismiss, stale-key cleanup |
| `test/spa-integration.test.mjs` | Content script ↔ service worker across the seam |
| `TESTING.md` | Manual checklist, E2E targets, edge cases, bug template |
| `store-listing.md` | Chrome Web Store copy + permission justifications |
| `LAUNCH-CHECKLIST.md` | Pre-submission gate and distribution plan |

## State model

All state is `chrome.storage.local`; nothing syncs.

| Key | Type | Meaning |
|---|---|---|
| `taxnexus.latest` | object | Most recent detection record, any tab |
| `detection_{tabId}` | object | That tab's record + `storedAt`; swept after 24h |
| `snooze_until` | timestamp ms | Alerts silent until this time (7 days) |
| `dismissed_tabs` | array | Tab ids dismissed; cleared on tab close and restart |
| `last_alert_level` | string | `high` \| `none` |

**Alert levels.** A CA fulfillment-center code is proof of physical stock in
California → `high`. Everything else → `none`.

There was a `low` level for "California text on the page, no FC code". It was
removed on 2026-09-22 after testing against live pages: it fired on
**Proposition 65 chemical warnings** ("known to the State of California to
cause cancer"), which appear on a large share of Amazon listings and say
nothing about where inventory sits — a colon-cleanse supplement was showing a
nexus alert. That level was the only reason the extension needed
`www.amazon.com` host access, so removing it also narrowed
`content_scripts.matches` to Seller Central alone.

CA *text* is still collected (`signals.hasCaText`) and displayed as page
context; it simply no longer raises an alert by itself.

**Suppression suppresses the interruption, not the finding.** While snoozed or
dismissed the badge stays dark, but storage is still written and the popup still
shows the detection on demand. Snooze survives a browser restart (it is a
timestamp); per-tab dismissals deliberately do not, because Chrome recycles tab
ids across sessions.

## No network access at all

`permissions` is intentionally exactly `["activeTab", "storage", "scripting"]`
with **no `host_permissions`**. The Amazon content script is scoped through
`content_scripts.matches` (declarative content scripts grant their own scoped
host access without enlarging the `permissions` array).

**The extension makes zero network requests.** Not a minimised set — none. The
only outbound thing it does is open a link when the user clicks the trial CTA.

It used to POST to `/api/taxnexus/assess`, which forced a CORS dependency (no
host permission for the API origin, so the endpoint had to reflect the extension
origin). That call was removed on 2026-09-22 once it became clear it could only
ever return one of two fixed answers: the extension sent `sales: 0`,
`hasEmployees: false` and `entityType: 'LLC'` as constants, leaving a single
boolean as the only variable. The round trip was computing a constant, so
`assessLocally()` in `service-worker.js` now returns it directly.

What that bought:

- every Web Store data-disclosure answer is an unambiguous **No**
- a reviewer can verify the privacy claim in the Network tab in ten seconds
- a clear page reads CLEAR **offline**; it used to degrade to "No data yet"
- no CORS dependency, and no exposure to the endpoint's 30/min per-IP rate limit

Two values are duplicated from `src/lib/server/taxnexus/assess-nexus.ts`: the
`Physical inventory in CA (Amazon FBA/3PL Nexus)` trigger string and the `$800`
minimum franchise tax. Deliberately **not** duplicated are `FORM_DATABASE` (the
popup never renders forms) and the indexed thresholds (`SALES_THRESHOLD`,
`PROPERTY_THRESHOLD` — this path never reaches them, so the annual FTB
re-indexing does not touch the extension). `test/service-worker.test.mjs` pins
both duplicated values.

## Verification against the 8 review criteria

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | MV3, loads unpacked | ✅ | `manifest.json` `manifest_version: 3`; `npm run build` → load `dist/`; relative asset paths in `dist/index.html` |
| 2 | Popup UI opens w/o errors | ✅ | `action.default_popup: index.html`; Svelte popup compiled, no top-level throws |
| 3 | Service worker registered | ✅ | `background.service_worker` + `type: module`; routes all background logic |
| 4 | Content scripts Amazon-only | ✅ | `content_scripts.matches` = `sellercentral.amazon.com` only; collection only, no fetch |
| 5 | API calls via SW only | ✅ | vacuously — there are **no** network calls anywhere. Test-enforced: the harness `fetch` throws if called, and the Vite modulepreload polyfill is disabled so the popup bundle is literally clean |
| 6 | Minimal permissions | ✅ | exactly `activeTab, storage, scripting`; each is used (scripting: `executeScript`; storage: `local`; activeTab: rescan) |
| 7 | Manual test of CA detection | ✅ | `npm test` — 43 cases against the real shipped files (see below) |
| 8 | One flow flagged for E2E | ✅ | see "E2E candidate" below |

## Manual test record (#7) — CA warehouse detection flow

`test/detection.test.mjs` loads the **actual** `amazon-collector.js` in a sandbox
with fixture Seller Central markup and asserts the message it emits:

- ✅ CA FC codes `ONT8` + `SMF1` → `hasCaInventory: true`, both codes reported
- ✅ "Tracy, California 95377" text → CA location signal (no FC code → not inventory)
- ✅ Texas FC `DFW7` → not flagged (no false positive)
- ✅ payload is data-only; no `fetch(`/`XMLHttpRequest` anywhere in the script
- ✅ `hasCaInventory` and `hasCaText` are reported as independent booleans
- ✅ a Proposition 65 warning is **not** treated as an inventory signal
- ✅ an SPA route change (Orders → FBA Inventory, no document load) re-collects
- ✅ unchanged pages do not re-report; an explicit re-scan always does
- ✅ a full session makes **zero** network requests (harness `fetch` throws)
- ✅ the HIGH alert still fires with `fetch` absent from the environment entirely

Run: `npm test` → `tests 43 / pass 43 / fail 0` across detection, SPA
navigation, service-worker decisions, storage state, and an integration pass
that wires the real content script to the real service worker.

This is logic-level verification. It does **not** drive a real browser, render
the popup, or exercise the live `/api/taxnexus/assess` round trip — which is
exactly why that end-to-end path is the E2E candidate. The manual checklist that
covers the rest is in `TESTING.md`.

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
