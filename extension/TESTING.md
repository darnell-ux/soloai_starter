# Testing — TaxNexus Nexus Alert

Automated coverage lives in `test/` and runs with `npm test` (node:test, no
browser). Everything below is what automation does *not* cover.

```bash
cd extension && npm test     # 28 tests, must be green before any submission
```

| File | Covers |
|---|---|
| `test/detection.test.mjs` | the real content script against fixture Seller Central markup |
| `test/service-worker.test.mjs` | assess → risk → alert level → badge decision path |
| `test/storage.test.mjs` | snooze, per-tab dismiss, stale-key cleanup, storage schema |
| `test/harness.mjs` | shared `chrome`/`fetch` mock — not a test file itself |

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
- [ ] **4. No alert off Seller Central.** Open any `www.amazon.com/dp/` product
      page — ideally one with a Proposition 65 warning. The extension must do
      **nothing**: no badge, and the popup shows the last Seller Central result
      or "No data yet". The content script does not run here at all. (This is a
      regression check: a CA nexus alert once fired on a supplement listing
      because of its Prop 65 label.)
- [ ] **5. Clear state.** Open a Seller Central page with only non-CA codes
      (DFW7, PHX3). No red badge, popup reads "No CA inventory signal".
- [ ] **6. Dismiss is per-tab.** With two tabs both showing HIGH, dismiss one.
      That tab's badge clears; **the other tab still shows `!`**. Re-scan the
      dismissed tab — the alert comes back.
- [ ] **7. Snooze silences everything.** Click "Snooze 7 days". Badge clears on
      all tabs. Load a fresh CA page — still no badge, but the popup still shows
      the detection (suppression hides the interruption, not the finding).
- [ ] **8. Snooze survives restart.** Fully quit and reopen Chrome. Still
      snoozed. Confirm in `chrome://extensions` → service worker → Console:
      `chrome.storage.local.get('snooze_until')` returns a future timestamp.
- [ ] **9. CTA URL is correct.** Click "Start free trial" from a HIGH alert. Lands
      on `taxnexusapp.com/trial?source=chrome_extension&alert=high` and the page
      shows the high-alert copy. From a clear popup, confirm `alert=none`.
- [ ] **10. Offline blindside still works.** DevTools → Network → Offline, then
      load a CA inventory page. Badge must **still** turn red — the local FC-code
      detection is decisive without the API. This is the product's core promise;
      if it fails, do not ship.

### Also worth running before a release

- [ ] Uninstall removes all state (reinstall → "No data yet", no stale snooze).
- [ ] No network requests to anything but `taxnexusapp.com` (Network tab,
      filter by domain, over a full browsing session).
- [ ] Popup renders correctly at 100% and 150% browser zoom.

---

## E2E Playwright targets

Chromium with a persistent context and `--load-extension=dist`. Stub
`/api/taxnexus/assess` for determinism. Three flows, in priority order:

**1. CA detection → badge → popup (the mission-critical path)**
Load a fixture page served locally but matching the Seller Central URL pattern,
containing `ONT8`. Assert: content script fires → SW writes
`detection_{tabId}` → badge text is `!` → popup renders "CA nexus exposure
detected" with the code listed. This flow spans every component plus the network
boundary and carries the most integration risk.

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

**Amazon SPA navigation.** Seller Central is a single-page app: navigating from
Orders to Inventory often does not reload the document, so the content script's
`document_idle` entry point never runs again and the badge keeps showing the
previous page's verdict. There is no `chrome.tabs.onUpdated` or history listener
today — the mitigation is the manual "Re-scan this page" button. If false
"clear" states get reported after navigation, this is the first suspect. A
`MutationObserver` or a `webNavigation.onHistoryStateUpdated` listener would fix
it, at the cost of a new permission.

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
