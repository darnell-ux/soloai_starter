# Nexus Alert extension — Phases 5–8 completion report

> **Partly superseded — see `extension-launch-status.md` for current state.**
> This is an accurate record of the phases 5–8 work, but browser testing later
> the same day changed several things it describes. Most notably: the **LOW
> alert and `www.amazon.com` host access were removed** (LOW fired on
> Proposition 65 chemical warnings), and the **assess API call was removed
> entirely** (it could only return one of two fixed answers), so the extension
> now makes no network requests. Test count is 35, not 26. Read this for the
> phase history; read the status doc for what ships.

**Date:** 2026-09-22
**Scope:** `extension/` + `src/routes/trial/`
**Result:** all four phases complete; 26/26 tests green; `dist/` builds clean.

---

## Headline finding

Phases 5.1–5.3 and 6.1 were specified as *verification* steps ("confirm X is
implemented"). **None of them existed.** The scaffold shipped a different and
much smaller state model than the spec assumed:

| Spec assumed | Scaffold actually had |
|---|---|
| `snooze_until`, `dismissed_tabs`, `last_alert_level`, `detection_{tabId}` | a single key, `taxnexus.latest` |
| Snooze and dismiss features | neither existed anywhere in the codebase |
| Alert *levels* (`alert={level}`, LOW/HIGH screenshots) | risk states only: `exposed` / `clear` / `unknown` |
| Popup batched `chrome.storage.local.get([...])` | popup did **zero** storage reads — it messaged the SW via `GET_STATE` |
| CTA to `/trial?source=chrome_extension&alert=` | `Popup.svelte` linked to `taxnexusapp.com/audit`; the SW had no CTA at all |
| Per-tab detection state | `handlePageSignals` ignored `sender` entirely — state was global |

So Phase 5 was a build, not a confirmation pass. Everything listed was
implemented rather than verified.

What *was* already correct and needed no change: the `/api/taxnexus/assess`
CORS handling for `chrome-extension://` origins (Phase 6.4) and the `/privacy`
route the store listing depends on.

---

## Phase 5 — Storage & state

Rewrote `public/service-worker.js` around a real per-tab state model.

**Snooze (5.1).** `MSG.SNOOZE` writes `snooze_until = Date.now() + 7 days` and
clears the badge globally. It is a stored timestamp, so it survives a browser
restart by construction — the startup handler deliberately does not clear it.

**Dismiss per tab (5.2).** `MSG.DISMISS` appends the tab id to `dismissed_tabs`
and clears that tab's badge via `chrome.action.setBadgeText({ text: '', tabId })`.
`chrome.tabs.onRemoved` drops the id and deletes that tab's `detection_{tabId}`
record.

**Batched popup reads (5.3).** `Popup.svelte` now performs exactly one
`chrome.storage.local.get([...])` per load, covering `taxnexus.latest`,
`snooze_until`, `dismissed_tabs`, `last_alert_level`, and the active tab's
`detection_{tabId}`. It prefers the per-tab record and falls back to the global
one. `GET_STATE` remains in the message contract and is still served by the SW,
but the popup no longer needs it.

**Startup cleanup (5.4).** `chrome.runtime.onStartup` sweeps `detection_*` keys
whose `storedAt` is older than 24h, using a single `get(null)` + one batched
`remove()`. Records with no usable timestamp (older schema, partial write) are
treated as stale rather than kept forever.

**Schema (5.5).** Matches the spec exactly and is asserted by a test:

| Key | Type |
|---|---|
| `snooze_until` | timestamp ms |
| `dismissed_tabs` | array of tab ids |
| `last_alert_level` | string |
| `detection_{tabId}` | detection result object (+ `tabId`, `storedAt`) |

### Design decisions made where the spec was silent

**Alert levels had to be defined.** The spec references `{level}` and
LOW/HIGH screenshots without defining them. The content script already
distinguished an FC-code match from a CA-text match, so those map to:
`high` (FC code — physical CA stock, decisive), `low` (CA location text only,
typical of a `www.amazon.com/dp/` page), `none`. This matches the three
requested screenshots exactly. An API-reported `hasNexus` also escalates to
`high`, so risk and level can never disagree in the UI.

To support this the content-script payload gained a `hasCaText` boolean —
previously the CA-text signal only existed as a human-readable string inside
`signals[]`, which is not something the SW could branch on.

**Suppression hides the interruption, not the finding.** While snoozed or
dismissed, storage is still written and the popup still shows the detection;
only the badge stays dark. Silently discarding a detected CA exposure would
work against the product's entire purpose.

**Dismissals are cleared on startup, snooze is not.** Chrome recycles tab ids
across sessions, so a persisted `dismissed_tabs` would suppress alerts on
unrelated tabs after a restart. Not in the spec; added because the alternative
is a silent-failure bug. Both behaviours are test-asserted.

---

## Phase 6 — Trial integration

**6.1 CTA URL.** Now defined in `service-worker.js` and emitted on every
detection record as `ctaUrl`:
`https://taxnexusapp.com/trial?source=chrome_extension&alert={level}`.
The popup renders it as "Start free trial →", replacing the old `/audit` link.
Test-asserted for both `high` and `low`.

**6.2 / 6.3 The `/trial` route did not exist — created it.**
- `src/routes/trial/+page.server.ts` — validates `?alert` and `?source` against
  closed allowlists rather than echoing untrusted query params, and exposes
  `signedIn` from `locals.user`.
- `src/routes/trial/+page.svelte` — three copy variants keyed to alert level
  (high = urgent R&TC 23101(a) framing, low = "worth checking", none = general
  pitch), an extension-specific privacy reassurance line, and a CTA into the
  existing Better Auth signup at `/signup?redirectTo=/taxnexus`. Signed-in users
  skip signup and go straight to the audit tool. Fires `trial_landing_view` and
  `trial_signup_click` GA4 events tagged with source and alert level, so the
  funnel is measurable per level. Carries the standard not-tax-advice
  disclaimer.

**6.4 CORS — confirmed, unchanged.** `src/routes/api/taxnexus/assess/+server.ts`
lines 24–36 reflect `chrome-extension://` and `moz-extension://` origins, with
an `OPTIONS` preflight handler and `Vary: Origin`. Still in place; not touched.

---

## Phase 7 — Testing

**Test results: 26 passed, 0 failed** (was 8 before this work).

```
tests 26 / pass 26 / fail 0     node --test
```

| File | Tests | Notes |
|---|---|---|
| `test/detection.test.mjs` | 5 | +1 for the new `hasCaText` / `hasCaInventory` split |
| `test/service-worker.test.mjs` | 7 | original 4 preserved, +3 for alert-level derivation and tab-less senders |
| `test/storage.test.mjs` | 14 | **new** — snooze, dismiss, cleanup, schema, CTA |
| `test/harness.mjs` | — | **new** — shared `chrome`/`fetch` mock, not a test file |

The harness was extracted because the SW rewrite broke the old inline mock in
three ways: it couldn't handle `get([array])` or `get(null)`, had no `remove()`,
and had no `tabs.onRemoved` / `runtime.onStartup` (the SW now registers both, so
the old mock threw at load). Both SW test files now share it, and it tracks
badge state *per tab*, which is what makes the dismiss-isolation test possible.

Tests still load the actual shipped files in a `vm` sandbox — real code paths,
not reimplementations.

**7.3 `extension/TESTING.md` created** — 10-item manual checklist, the 3
priority E2E Playwright targets with a stated reason each, known edge cases, and
a bug report template that includes a `chrome.storage.local.get(null)` dump step.

---

## Phase 8 — Store prep

- **`extension/store-listing.md`** — name (41/45), short description (96/132),
  ~510-word full description, all five permission justifications, single-purpose
  statement, and the data-disclosure table.
- **`extension/store-assets/README.md`** — the three 1280×800 screenshots with
  capture setup, framing notes, redaction requirements, and file naming.
- **`extension/public/manifest.json`** — version `1.0.0`, added `homepage_url`
  and `short_name`. `package.json` bumped to match.
- **`extension/LAUNCH-CHECKLIST.md`** — 15-item pre-submission gate, rejection
  reasons ordered by likelihood for *this* extension, post-submission monitoring,
  and the 30-day distribution plan.

---

## Deviations from the original spec

1. **Phases 5.1–5.3 and 6.1 were builds, not verifications** — see above. The
   single largest deviation.
2. **Alert levels were defined, not confirmed** — the spec used `{level}`,
   `LOW`, and `HIGH` without defining them. Rationale above.
3. **Content-script payload gained `hasCaText`** — required to derive levels.
   `detection.test.mjs` updated accordingly, as Phase 7.2 anticipated.
4. **`manifest.name` changed to the store listing name.** The spec put
   "TaxNexus — CA Nexus Alert for FBA Sellers" only in the listing, but the Web
   Store takes the listing name from the manifest, so leaving them different
   would have shipped two different product names.
5. **`test/harness.mjs` added** (not in the spec) and **`service-worker.test.mjs`
   updated** (not in the spec) — both forced by the SW rewrite; the old mock
   could not load the new worker.
6. **Two behaviours added beyond the spec:** startup clearing of
   `dismissed_tabs`, and re-scan un-dismissing a tab. Both prevent silent
   wrong-state bugs; both are test-asserted.
7. **The "Website content" store disclosure is left as an open decision,** not
   answered. The extension transmits one derived boolean (`inventory: 1|0`) to
   the assess API, which makes a flat "No" arguable but not clearly correct.
   `store-listing.md` documents both resolutions. **This blocks submission, not
   the build.**

## Known gaps

- **Lint/format not run on the new route files.** The app's `node_modules` is
  missing `prettier-plugin-svelte` and `eslint-config-prettier`, so both tools
  error out. `npm run check` (svelte-check) passes clean — 1655 files, 0 errors,
  0 warnings — so this is a style-verification gap, not a correctness one.
  `npm install` in the repo root will restore both.
- **Amazon SPA navigation is still unhandled.** Navigating within Seller Central
  without a document reload does not re-trigger collection; the mitigation is
  the manual "Re-scan this page" button. Documented in `TESTING.md`.
- **No E2E harness yet.** The three Playwright targets are specified but not
  implemented.
- **No error reporting.** Service worker exceptions die silently in users'
  browsers.

---

## Chrome load instructions

```bash
cd /Users/darnellbaker/soloai_starter/extension
npm install        # first time only
npm run icons      # first time only — generates public/icons/*.png
npm run build
```

Then:

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select `/Users/darnellbaker/soloai_starter/extension/dist`
4. Click the puzzle-piece icon in the toolbar → **pin** "TaxNexus Alert"
5. Test on an `amazon.com/dp/` URL — expect a LOW alert if the page mentions a
   California location, no alert otherwise
6. Test on a Seller Central FBA inventory page with a CA FC code — expect the
   red `!` badge and a HIGH alert in the popup

`dist/` verified to contain: `manifest.json`, `service-worker.js`,
`content/amazon-collector.js`, `index.html`, `icons/` (4 PNGs), `assets/`.

To reload after a code change: `npm run build`, then hit the refresh arrow on
the extension's card in `chrome://extensions/`. Note that
`chrome.runtime.onStartup` does **not** fire on a dev reload — only on a real
browser start — so the stale-key sweep must be tested by quitting Chrome.

---

## Next steps for live testing

1. **Run the 10-item manual checklist in `TESTING.md`** against a real Seller
   Central account. Item 10 (offline blindside warning) is the one that must not
   fail — it is the product's core promise.
2. **Deploy `/trial` to production and verify it returns 200** for
   `?source=chrome_extension&alert=high`. The extension CTA is dead until this
   ships, and `LAUNCH-CHECKLIST.md` item 8 blocks submission on it.
3. **Confirm `/privacy` covers the extension specifically**, not just the web
   app — a generic policy is a standard rejection reason.
4. **Resolve the "Website content" disclosure** (deviation 7).
5. **Capture the three screenshots** per `store-assets/README.md`, with
   seller-identifying data redacted.
6. **Decide on the `www.amazon.com` LOW alert.** It is the weakest feature and
   the widest permission surface. If it proves noisy or review pushes back on
   host breadth, scoping the content script to Seller Central only is the clean
   answer.
7. Then work `LAUNCH-CHECKLIST.md` top to bottom.
