# Testing — TaxNexus Nexus Alert

Automated coverage lives in `test/` and runs with `npm test` (node:test, no
browser). Everything below is what automation does *not* cover.

```bash
cd extension && npm test     # 43 tests, must be green before any submission
```

| File | Covers |
|---|---|
| `test/detection.test.mjs` | the real content script: detection + SPA navigation |
| `test/service-worker.test.mjs` | local assessment → risk → badge; zero-network and no-fetch-at-all cases |
| `test/storage.test.mjs` | snooze, per-tab dismiss, stale-key cleanup, storage schema |
| `test/spa-integration.test.mjs` | content script wired to the service worker — navigation drives a real badge change |
| `test/harness.mjs` | shared `chrome` mock + both script loaders; its `fetch` throws — not a test file |

The automated suite loads the *shipped* files in a vm sandbox, so it tests the
code that actually ships rather than a reimplementation. What it cannot do:
render the popup, drive a real Amazon page, or exercise a real
`chrome.storage.local`.

---

## Manual testing checklist

Run against a real unpacked build (`npm run build`, load `extension/dist`)
before every store submission. A run is only valid if every item is checked in
one sitting on one build.

- [ ] **1. Clean install.** Load unpacked into a fresh Chrome profile. No errors
      in `chrome://extensions` → "Errors", and the service worker shows as
      **active** (not "Inactive" with a red badge).
- [ ] **2. Popup opens cold.** Click the toolbar icon before visiting any Amazon
      page. Shows "No data yet", no console errors in the popup's devtools.
- [ ] **3. HIGH alert fires.** Open a Seller Central FBA inventory page showing a
      California FC code (ONT8 / SMF1 / LAX9). Badge turns red `!` within a few
      seconds; popup shows "CA nexus exposure detected" with a HIGH chip and the
      detected code listed under "Signals on this page".
- [ ] **4. SPA navigation fires.** From a Seller Central page with no CA stock,
      click through to FBA Inventory **without reloading** (use the in-app nav,
      not the address bar). The badge must turn red within ~2s. Then hit browser
      Back and confirm it clears. This is how sellers actually reach inventory;
      if it only works on a hard reload, it does not work.
- [ ] **5. No alert off Seller Central.** Open any `www.amazon.com/dp/` product
      page — ideally one with a Proposition 65 warning. The extension must do
      **nothing**: no badge, and the popup shows the last Seller Central result
      or "No data yet". The content script does not run here at all. (This is a
      regression check: a CA nexus alert once fired on a supplement listing
      because of its Prop 65 label.)
- [ ] **6. Clear state.** Open a Seller Central page with only non-CA codes
      (DFW7, PHX3). No red badge, popup reads "No CA inventory signal".
- [ ] **7. Dismiss is per-tab.** With two tabs both showing HIGH, dismiss one.
      That tab's badge clears; **the other tab still shows `!`**. Re-scan the
      dismissed tab — the alert comes back.
- [ ] **8. Snooze silences everything.** Click "Snooze 7 days". Badge clears on
      all tabs. Load a fresh CA page — still no badge, but the popup still shows
      the detection (suppression hides the interruption, not the finding).
- [ ] **9. Snooze survives restart.** Fully quit and reopen Chrome. Still
      snoozed. Confirm in `chrome://extensions` → service worker → Console:
      `chrome.storage.local.get('snooze_until')` returns a future timestamp.
- [ ] **10. CTA URL is correct.** Click "Start free trial" from a HIGH alert. Lands
      on `taxnexusapp.com/trial?source=chrome_extension&alert=high` and the page
      shows the high-alert copy. From a clear popup, confirm `alert=none`.
- [ ] **11. Offline blindside still works.** The product's core promise. **Order
      matters** — going offline *first* and then navigating means Seller Central
      itself never loads, so there is no page to scan and the extension looks
      broken for a reason that has nothing to do with it. Do this instead:
      1. Load a Seller Central FBA inventory page with a CA code **online**, and
         confirm the red `!` badge.
      2. Clear state so nothing can be served from a previous pass: in the popup
         console, `await chrome.storage.local.clear()`. Badge goes dark.
      3. **Now** go offline: DevTools → Network → **Offline**.
      4. Click **Re-scan this page** in the popup.
      5. The badge must turn red `!` again and the popup must show the HIGH
         chip, the FC code, and the `$800/yr` line — a complete result, not a
         degraded one.

      While offline, also confirm the **Network tab stays completely empty** for
      the extension. There is no request it could make; seeing one means
      something was reintroduced.

      If this fails, do not ship — it is the entire reason the product exists.

### Running the checklist without a seller account

`https://sellercentral.amazon.com/` returns **200 to a logged-out visitor**, so
the content script runs there with no account at all. That means the real
code path — content script → service worker → per-tab storage → badge — can be
exercised by adding fixture text to the page in your own browser.

**What this does and does not prove.** It validates the mechanism: detection,
per-tab state, SPA handling, suppression, the badge. It does **not** prove the
FC codes are reachable on a real inventory page — if Amazon renders them inside
an iframe, a canvas, or an attribute rather than as rendered text,
`document.body.innerText` will not see them and the extension will find nothing
on a page that visibly shows a code. **Only a real Seller Central run settles
that**, and it is the single most valuable thing to check with a pilot seller.

This is a local test fixture. It is not a substitute for real screenshots — see
`store-assets/README.md`.

**Setup.** Open `https://sellercentral.amazon.com/`, then open that *page's*
console (⌥⌘J on macOS — not the popup's console) and paste:

```js
window.__tnFixture = (code = 'ONT8') => {
  let el = document.getElementById('tn-fixture');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tn-fixture';
    // innerText only sees RENDERED text, so force it visible.
    el.style.cssText =
      'position:fixed;bottom:0;left:0;z-index:2147483647;background:#fff;color:#000;padding:4px;font:12px monospace';
    document.body.appendChild(el);
  }
  el.textContent = `Fulfillment Center: ${code}  Units: 240`;
  return el.textContent;
};
window.__tnClear = () => document.getElementById('tn-fixture')?.remove();
```

**Item 3 — HIGH alert.** `__tnFixture('ONT8')`, then click **Re-scan this page**
in the popup. Badge turns red `!`; popup shows the HIGH chip and `ONT8`.

**Item 4 — SPA navigation.** The point is that no re-scan is needed:

```js
__tnClear();
history.pushState({}, '', '/orders?t=' + Date.now());   // start on a clear "view"
// wait ~2s, badge should be green ✓
__tnFixture('SMF1');
history.pushState({}, '', '/inventory/fba?t=' + Date.now());
// wait ~2s, badge must turn red WITHOUT touching the popup
```

Then `history.back()` and confirm it responds (popstate fires immediately
rather than waiting for the 1s poll).

**Item 6 — clear state.** `__tnFixture('DFW7')` (a Texas FC), re-scan, confirm
no red badge and "No CA inventory signal on this page".

**Item 7 — dismiss is per-tab.** Open `sellercentral.amazon.com` in two tabs,
run the setup + `__tnFixture('ONT8')` + re-scan in each so both show red.
Dismiss one; the other must stay red.

**Item 11 — offline blindside.** Follow the corrected order above: fixture set
and badge red **online**, then `await chrome.storage.local.clear()` in the popup
console, then DevTools → Network → **Offline**, then **Re-scan this page**. Red
badge with a complete result.

Items 1, 2, 5, 8, 9, 10 need no fixture and no account as written.

### Also worth running before a release

- [ ] Uninstall removes all state (reinstall → "No data yet", no stale snooze).
- [ ] **Zero** network requests from the extension over a full browsing session
      (DevTools → Network on the service worker). Not "only taxnexusapp.com" —
      none at all. This is a claim the store listing makes explicitly.
- [ ] Popup renders correctly at 100% and 150% browser zoom.

---

## E2E Playwright targets

Chromium with a persistent context and `--load-extension=dist`. Nothing needs
stubbing — the extension makes no network requests, so these are deterministic
by default. Three flows, in priority order:

**1. CA detection → badge → popup (the mission-critical path)**
Load a fixture page served locally but matching the Seller Central URL pattern,
containing `ONT8`. Assert: content script fires → SW writes
`detection_{tabId}` → badge text is `!` → popup renders "CA nexus exposure
detected" with the code listed. This flow spans every component of the
extension and carries the most integration risk.

**2. Snooze suppression across a restart**
Trigger a HIGH alert, click Snooze, assert the badge clears. Close the
persistent context and reopen it against the same user-data-dir. Trigger
detection again and assert the badge stays empty while
`chrome.storage.local.get('snooze_until')` is still in the future. This is the
one behaviour whose whole point is surviving a process boundary, which is
exactly what unit tests cannot prove.

**3. Per-tab dismiss isolation**
Open two tabs that both detect CA inventory. Dismiss tab A. Assert tab A's badge
is empty and tab B's is still `!`, then assert re-scanning tab A restores it.
Per-tab badge scoping is the easiest thing to silently regress into a global
badge, and no unit test sees a real second tab.

---

## Known edge cases

**Amazon SPA navigation (handled).** Seller Central is a single-page app:
clicking Orders → FBA Inventory does not reload the document, so `run_at:
document_idle` fires only once per real page load. Since that click-through is
how sellers normally reach their inventory, an unhandled SPA route change meant
silently missing the primary detection in ordinary use.

The content script now watches for route changes itself: `popstate` and
`hashchange` listeners for immediate response, plus a 1s `location.href` poll as
the backstop, then re-collects after an 800ms settle delay.

Two implementation notes worth keeping in mind before anyone "simplifies" this:

- **Patching `history.pushState` does not work from a content script.** The
  isolated world gets its own wrappers for page globals, so the page's own
  `pushState` calls are never intercepted. Reading `location` is cross-world
  safe, which is why this polls instead.
- **Payloads are deduplicated by signature** (path + inventory flag + text flag
  + FC codes). This originally existed because the service worker called the
  assess API for every payload, so an SPA re-rendering on a timer would hammer
  the endpoint. That call is gone, but dedup stays: it keeps the SW from
  rewriting storage and re-painting the badge on every tick. An explicit
  "Re-scan this page" bypasses dedup — a deliberate user action must never be
  silently swallowed.

If detections are missed after navigation, check the poll is still running
(`setInterval` survives, but an exception thrown inside `checkForNavigation`
would kill it) before suspecting the detector.

**CSP restrictions.** Amazon serves a strict Content-Security-Policy. It does not
block content scripts (they run in an isolated world), but it does block any
attempt to inject an inline `<script>` into the page. Keep all logic in the
isolated world. If a future feature needs page-context access, it will need a
`web_accessible_resources` entry and a file-based injection — inline will fail
silently in production while working fine in a local fixture.

**Iframes.** The manifest does not set `all_frames`, so the collector runs only
in the top document. Seller Central renders some inventory widgets in iframes;
inventory shown only inside one will not be detected. Enabling `all_frames`
would fix that but would also run the script in every ad and tracking iframe
Seller Central embeds — a real performance and review-surface cost. Current
call: leave it off, and rely on the main inventory tables which are
top-document.

**Tab id recycling.** Chrome reuses tab ids across sessions. Both the 24h
`detection_*` sweep and the startup clear of `dismissed_tabs` exist to stop a
recycled id inheriting an unrelated tab's state. If per-tab state ever looks
"stuck to the wrong tab", check that `chrome.runtime.onStartup` actually fired —
it does not fire on extension reload during development, only on real browser
startup.

**Proposition 65 (resolved — do not reintroduce).** The extension used to also
match `www.amazon.com/*` and raise a LOW alert on any page whose text mentioned
California. On a real listing (`amazon.com/dp/B08G38VHDW`, 2026-09-22) that
matched *"WARNING: California's Proposition 65"* — a chemical warning printed on
a large share of Amazon products — and showed a California nexus alert on a
dietary supplement.

Both the LOW level and the `www.amazon.com` host match were removed. Only a
fulfillment-center code raises an alert now. If anyone proposes alerting on page
text again, this is the counterexample: the phrase "California" on a shopping
page carries no information about where inventory is stored, and a badge users
learn to ignore is worse than no badge. `test/detection.test.mjs` and
`test/service-worker.test.mjs` both carry regression tests using the real string.

---

## Bug report template

```markdown
### Summary
<one sentence: what happened, not what you think caused it>

### Environment
- Extension version:      (manifest.json "version")
- Build:                  (unpacked from dist / Web Store)
- Chrome version:         (chrome://version)
- OS:
- Page type:              (FBA inventory / placement / other Seller Central)

### Steps to reproduce
1.
2.
3.

### Expected
### Actual

### Alert state at the time
- Badge showed:           (red ! / green ✓ / empty)
- Popup status line:
- Alert level chip:       (HIGH / none)
- Snoozed?                (yes/no — check storage below)
- Tab dismissed?          (yes/no)

### Storage dump
chrome://extensions → the extension → "service worker" → Console:

    await chrome.storage.local.get(null)

Paste the result, with any detection_* payloads redacted if they contain
anything you would rather not share:

```
<paste>
```

### Console errors
- Service worker console:
- Popup console (right-click popup → Inspect):
- Page console (F12 on the Amazon tab):

### Attachments
- [ ] Screenshot of the popup
- [ ] Screenshot of chrome://extensions showing any error
- [ ] Sanitized copy of the page HTML, if detection was wrong
```
