# Nexus Alert extension — launch status

**As of:** 2026-09-22
**Extension version:** 1.0.0 (unreleased — not yet submitted to the Chrome Web Store)
**App version in production:** 1.1.2 (`https://taxnexusapp.com/health`)

**One blocker remains: the three store screenshots.** They need a pilot seller
with California inventory placement, which cannot be staged. Everything else is
submission-ready — 48 unit + 4 E2E tests green, security-reviewed with no
findings, and the detection path confirmed against real Seller Central markup.

**Before screenshots, ask the seller one question** (ten seconds, and it can
invalidate everything else): open your FBA inventory page with CA stock — does
the toolbar badge turn red? See "Verified against real Seller Central".

> Supersedes the behaviour described in
> `extension-phases-5-8-complete.md`, which is an accurate record of that
> work but predates the changes in "What changed after phases 5–8" below.

---

## Submission readiness

| Item | State |
|---|---|
| Extension builds, loads unpacked, no errors | ✅ verified in Chrome |
| Automated tests | ✅ 50 unit + 4 E2E, all green |
| Permissions minimal and defensible | ✅ `activeTab, storage, scripting`; one host |
| Zero network requests | ✅ test-enforced and verified in the shipped build |
| Icons | ✅ real artwork, two treatments |
| Listing copy + permission justifications | ✅ `extension/store-listing.md` |
| Data-usage disclosures | ✅ all "No", no judgement calls left |
| Privacy policy live and accurate | ✅ deployed 2026-09-22 |
| `/trial` CTA target live | ✅ verified at every alert level |
| Security review | ✅ no findings ≥8/10, two independent passes |
| **Three screenshots (1280×800)** | ❌ **blocked — needs a pilot seller** |

### The blocker

Two of the three screenshots require a California fulfillment-center code
visible on a real Seller Central FBA inventory page. This cannot be staged:
`content_scripts.matches` is `sellercentral.amazon.com` only, so a local fixture
never triggers the content script, and a mocked Amazon page in a store listing
is a misleading-screenshot rejection. The store requires at least one
screenshot, so **no pilot seller means no submission**.

`extension/store-assets/README.md` contains a request that can be sent to a
seller verbatim, including the macOS delayed-capture trick and the redaction
list that makes it a safe ask. `extension/store-assets/verify-screenshots.mjs`
checks whatever comes back (presence, exact dimensions, stray alpha) and prints
the `sips` command to fix each problem.

---

## What the extension does now

Runs **only** on `sellercentral.amazon.com`. Reads the rendered page text for
California fulfillment-center codes (ONT8, SMF1, LAX9, …). A code means the
seller's stock physically sits in California, which is "doing business" under
R&TC 23101(a) at any sales volume.

Two states: **HIGH** (FC code present) and **none**. The assessment is computed
locally — `$800` minimum franchise tax and the "Physical inventory in CA
(Amazon FBA/3PL Nexus)" trigger.

Snooze silences all alerts for 7 days and survives a browser restart. Dismiss
clears one tab only and is cleared when that tab closes or the browser
restarts. Suppression hides the badge, never the finding — the popup still
shows the detection on demand.

Re-collects on SPA navigation, which is how sellers actually reach their
inventory page.

**Makes no network requests of any kind.** The only outbound action is opening
`taxnexusapp.com/trial?source=chrome_extension&alert={level}` when the user
clicks the CTA.

---

## What changed after phases 5–8

All of this came out of loading the extension in a real browser. None of it was
visible from the test suite.

**The LOW alert was removed, and with it `www.amazon.com` host access.** Tested
against a live product page, LOW fired on a **Proposition 65 chemical warning**
— `amazon.com/dp/B08G38VHDW`, a colon-cleanse supplement, was showing a
California nexus alert because its listing carries "WARNING: California's
Proposition 65". Prop 65 labels appear on a large share of Amazon listings. That
alert was the only justification for the broad host permission, so dropping it
narrowed the extension to Seller Central alone and removed the
"overbroad host access" rejection risk. Regression tests in both
`detection.test.mjs` and `service-worker.test.mjs` use the real string.

**SPA navigation is now handled.** Seller Central is a single-page app: clicking
Orders → FBA Inventory does not reload the document, so `run_at: document_idle`
fired only once per real page load. Since that click-through is how sellers
normally reach inventory, the extension would have silently missed its primary
detection in ordinary use — only a hard reload worked. Now watched via
`popstate`/`hashchange` plus a 1s `location.href` poll. Note: patching
`history.pushState` does **not** work from a content script (isolated world gets
its own wrappers), which is why it polls.

**The assess API call was removed entirely.** It could only ever return one of
two fixed answers — the extension sent `sales: 0`, `hasEmployees: false`,
`entityType: 'LLC'` as constants, leaving one boolean as the only variable. The
round trip was computing a constant. Removing it made every data-disclosure
answer an unambiguous "No", removed the CORS dependency, removed exposure to the
endpoint's 30/min per-IP limit, and made a clear page read CLEAR while offline
instead of degrading to "No data yet".

**Two UI defects fixed.** The status banner (reading `risk`) could contradict
the severity chip (reading `alertLevel`) — a green "No CA inventory signal"
beside an amber LOW chip. And the popup labelled another tab's result as
"Signals on this page"; it now says "Last scan (another tab)". That second bug
predated the scope change, which just made it the common case.

**Real icons.** An amber map pin replacing the scaffold placeholder (a solid
square with a dot). Two treatments using the manifest's two icon keys: a dark
tile for the store, a transparent glyph for the toolbar so it works on light and
dark themes.

**Privacy policy corrected.** It previously implied the extension sends
fulfillment-center detections to us. Split into its own bullet stating plainly
that nothing is transmitted. Effective date bumped per §11.

---

## Production / ops

`/trial` shipped this session — it was 404 before, which meant the extension's
only CTA was dead.

### The v1.1.0 outage (~10 minutes, 2026-09-22 21:54–22:04)

Deploying v1.1.0 took the whole site to 502 while the app container was
perfectly healthy and listening on :3000.

**Cause:** `nginx.conf` proxies to the `app` hostname with **no `resolver`
directive**, so nginx resolves it once at config load and caches the IP for the
life of the process. A deploy recreates the app container (new Docker IP) but
never recreates nginx. nginx had been up 7 weeks — nothing had deployed
successfully since August — so the first rebuild in that window left it
proxying to a dead IP.

**Two things that made it confusing, and will again:** rolling back did not fix
it (the rollback recreates the container too, yielding another new IP), and the
app looked completely fine — `0 restarts`, `state=running`, `Listening on
http://0.0.0.0:3000`.

**Fixed:** `scripts/deploy.sh` now runs `nginx -t` + `nginx -s reload` after
`up -d`. Confirmed working — the v1.1.2 deploy recreated the container with no
outage. If the site ever 502s after a deploy, dispatch `vps-nginx-reload` before
suspecting the app.

### Deploy path

**Only the tag → `release.yml` path deploys**, running on the self-hosted runner
on the VPS. Cut a release with an annotated semver tag; bump `APP_VERSION` in
`src/routes/health/+server.ts` **and** `package.json` together, since `/health`'s
reported version is the only external proof new code is live.

`deploy.yml` — the SSH-based workflow that fired on every push to `main` — was
**deleted**. It had failed every run since 2026-08-14 (`VPS_SSH_KEY` removed
when the self-hosted runner replaced it; inbound SSH is firewalled off, only
80/443 public). It never reached production, but it put a red X on every push
and actively misled outage triage. Pushing to `main` now deploys nothing and
claims nothing.

**No SSH from a laptop.** To inspect or act on the VPS, dispatch a workflow on
the self-hosted runner: `vps-diagnose.yml` (read-only: `compose ps`, app logs,
restart count, disk/memory) or `vps-nginx-reload.yml` (validate + reload, then
verify `/health`).

### Tags

| Tag | What |
|---|---|
| `v1.0.0` | prior production state |
| `v1.1.0` | `/trial` + phases 5–8 — **caused the 502** |
| `v1.0.1` | rollback to the v1.0.0 tree (did not restore service; kept as audit trail) |
| `v1.1.1` | `/trial` + the nginx reload fix — first clean deploy |
| `v1.1.2` | privacy policy update |

---

## Verified in production

```
/health    200   version 1.1.2
/trial     200   alert=high | none render their correct copy; alert=bogus falls back safely
/privacy   200   "Browser extension" bullet live, effective date 2026-09-22
/          200
/taxnexus  200
```

`/api/taxnexus/assess` still returns 200 with CORS reflected for
`chrome-extension://` origins. The extension no longer uses it; the reflection
is kept because the endpoint is public either way. Removing that branch of
`corsHeaders()` is safe if you want the smaller surface.

---

## Verified against real Seller Central (2026-09-22 evening)

The biggest open question was whether the extension could read Seller Central
**at all**. It is answered, and the first answer was bad.

### The finding: innerText was blind to half the page

Measured on a real authenticated FBA inventory page (empty inventory, so no FC
codes present — the structure was the point):

```
innerText chars: 1284      iframes: 5      shadow hosts: 89
{ shallow: 1284, full: 2668, hiddenInShadow: 1384 }
```

**52% of the page text sat inside shadow roots**, invisible to
`document.body.innerText`, which stops at every shadow boundary. Seller Central
is built on Amazon's Cloudscape components — 89 shadow hosts on one page. On a
populated inventory page the table is among them, so the extension would have
reported "No CA inventory signal" on a page visibly showing ONT8. A silent
false negative on the one thing the product exists to catch.

Fixed by walking open shadow roots in `collectText()`.

### The fix, confirmed on the real app

A CA fulfillment-center code was planted **inside an open shadow root** on a
live Seller Central page (`sellercentral.amazon.com/amazonsell/business`), then
"Re-scan this page" clicked:

- badge went red `!`
- popup: **"CA nexus exposure detected"** + **HIGH** chip
- `CA fulfillment-center code(s): ONT8` under Signals, with the correct live
  host/path — the per-tab record, not the "another tab" fallback
- `Physical inventory in CA (Amazon FBA/3PL Nexus)` and `$800/yr`, computed
  locally with no network call

Removing the fixture and re-scanning returned it to green "No CA inventory
signal" — so detection reads the page live rather than latching.

**This same test would have failed before the fix.** It is the strongest
evidence available short of real inventory.

### What this changes

The remaining unknown is much narrower than it was. It is no longer "can the
extension read Seller Central" — it can, including shadow DOM. It is now only:

> Do real fulfillment-center codes sit in **open** shadow roots (works today),
> **closed** shadow roots (unreadable by any extension), or inside one of the
> page's **5 iframes** (`all_frames` is off, so currently out of scope)?

A pilot seller answers that in about ten seconds: open the FBA inventory page
and see whether the badge turns red. **Ask for that before asking for
screenshots** — if it fails, the detection approach needs rework and the
screenshots are moot.

### Also confirmed on the real app, incidentally

- the content script runs on authenticated Seller Central, not just the
  logged-out landing page
- **item 6** (clear state) passes on a real page
- **item 9** — the snooze survived an extension reload and a browser session
- `chrome.storage.local.clear()` resets cleanly to "No data yet"

---

## Offline blindside — partially verified

The product's core promise: a seller whose stock sits in a California warehouse
gets warned, connection or no connection. Status as of 2026-09-22:

**Proven automatically (3 tests).** The service worker is instantiated with
`fetch` *deleted from the sandbox*, so referencing it at all is a
`ReferenceError`. This is stricter than simulating a failed request — a
`try/catch` around a network call could not satisfy it, only genuinely not
having one.

- the HIGH alert fires with no network stack present, and the assessment is
  **complete** (`$800` + the trigger string), not degraded — a red badge with a
  hollow result would be a worse failure than no badge
- snooze, dismiss, re-scan, get-state, tab close and startup cleanup all
  survive too. The realistic failure is a connection dropping mid-session, not
  a cold start, so the alert path alone is not enough
- a clear page reads CLEAR rather than "no data yet" — the behaviour that
  changed when the assess call was removed

**Still needs a real browser and a real page.** The automated version proves the
*code* has no network dependency. It cannot prove Chrome behaves as expected
with the network toggle off, and it cannot scan a real Seller Central page.
That remains manual checklist item 11.

**The item 11 procedure was wrong and has been corrected.** It previously read
"go offline, *then* load a CA inventory page" — but offline first means Seller
Central never loads, so there is no page to scan and the extension looks broken
for a reason unrelated to it. Anyone running it as written would have recorded
a false failure. The corrected sequence: load online → confirm the badge →
`chrome.storage.local.clear()` → go offline → **Re-scan this page** → badge must
turn red with a complete result. This also matches the realistic scenario.

---

## Test coverage

| Suite | Count | Run | Covers |
|---|---|---|---|
| Unit (`node:test`) | 48 | `npm test` | Real shipped files in a `vm` sandbox: detection, SPA navigation, worker decisions, storage state, content-script ↔ worker integration |
| E2E (Playwright) | 4 | `npm run build && npm run test:e2e` | Real Chromium with the built extension loaded |
| Manual | 11 items | `extension/TESTING.md` | Usability, real Amazon markup, anything needing real inventory |

**The E2E trick worth knowing:** `content_scripts.matches` is
`sellercentral.amazon.com` only, so a localhost fixture is never injected.
Playwright request interception serves fixture HTML *at that origin*, so the
real manifest match applies and the shipped content script runs unmodified — no
seller account, no test-only manifest edits, no network.

E2E fixtures put the FC code inside a **real open shadow root**. The unit tests
can only mock shadow roots, so this is the only automated coverage exercising
the shadow walk in a browser — which matters, because that walk was the fix for
the highest-severity defect found in this session.

**Mutation-checked, not assumed.** Disabling the shadow walk in `dist/` makes
the first E2E test fail. Worth repeating that check after any `collectText()`
refactor — a suite that passes vacuously is worse than no suite.

What automation deliberately does **not** cover: visual polish, real Amazon
markup, and anything requiring real inventory. Those stay manual.

---

## Security review (2026-09-22)

**No findings at reportable confidence (≥8/10). No HIGH, MEDIUM, or LOW.**

Two independent passes over `ebbd307..HEAD`, the second explicitly adversarial
and instructed to break the first's conclusions. Six attack paths traced and
ruled out:

| Path | Verdict |
|---|---|
| Page content → `href`/`{@html}` sink in the popup | Unreachable. No `@html` anywhere; `ctaUrl` is one of two constants behind a hardcoded `https://` prefix. Page-derived values reach only escaped text interpolation. |
| Web page messaging the extension | Impossible. No `externally_connectable`, no `onMessageExternal` listener. |
| Shadow-DOM walk introducing a sink | None. String concatenation into two regex tests. Never touches `contentDocument`/`contentWindow`; cross-origin iframe text stays unreadable. |
| `?alert`/`?source` prototype pollution | Safe. Validated via `Array.includes` against closed lists; no user-controlled key is ever written into an object. |
| Workflow secret/untrusted interpolation | Safe. Secrets via `env:`, referenced as quoted `"$APP_DIR"`, never `${{ }}` inlined into a shell body. `workflow_dispatch` requires repo write access. |
| Newly persisted sensitive data | None. Stores `location.pathname` only — `search`/`hash`, where a session or merchant token would live, are never read. |

Two properties worth recording because they carry real weight:

- **The FC regex genuinely constrains its output.** Matches are drawn from a
  fixed `[A-Z]{3,4}\d{0,2}` set — they cannot contain `<`, `"`, `'`, or `:`.
  Even if a sink existed, `fcCodes` could not carry a payload.
- **`rescanActiveTab()`'s host check is correctly anchored**, rejecting both
  `sellercentral.amazon.com.evil.com` and
  `evil.com/?x=https://sellercentral.amazon.com/`.

**The diff is net security-positive.** Deleting `deploy.yml` removed a genuine
command-injection primitive — it interpolated
`${{ github.event.inputs.branch }}` straight into an SSH action script. Host
permissions were narrowed to one origin, and removing all network egress means
there is no exfiltration path left to get wrong.

Limitations: static review of one diff range. Does not cover pre-existing code,
the Docker/nginx/VPS configuration, or dependency supply chain, and no runtime
exploitation was attempted.

---

## Growth / business-model fit

Reviewed 2026-09-23 against a data-capture / contextual-widget / lead-gen
framework. The honest result: **that framework describes a different extension**,
and several of its central recommendations we declined deliberately.

| Framework recommendation | Our position |
|---|---|
| Capture signals, sync to Strapi/MySQL | **Declined.** All egress removed 2026-09-22 — it made every data disclosure an unambiguous "No" and made the alert work offline. |
| Inject a Svelte widget into the host page | **Declined.** We read the DOM and never write to it. Seller Central's CSP, 89 shadow hosts and the review surface make injection a poor trade. |
| Install as a Mautic lead event | **Not built.** Mautic runs in the stack (26 refs in `docker-compose.yml`); the extension is not connected to it. |
| Freemium split | **Aligned.** Free = the blindside alert; paid = the full audit, penalties and entity comparison in the app. The extension is an on-ramp, not a competitor, and it does not gate the moment that creates urgency. |
| Affiliate / referral links | **Rejected, not deferred.** An extension that warns sellers about tax liability and also surfaces referral links corrodes the credibility the product runs on. |
| Minimum permissions, consent, disclosure | **Exceeds it.** Three permissions, one host, zero egress, local-only storage, user controls, policy kept in step. |

### The real gap: no funnel visibility

There is no install, activation, or detection signal. The only telemetry is the
tail end — `trial_landing_view` and `trial_signup_click` on `/trial`, tagged
with `source` and `alert_level`. After launch, "is this working in the wild?"
is currently unanswerable.

The tension is genuine: adding telemetry reopens the "Website content"
disclosure that was closed on 2026-09-22 and weakens the
"makes no network requests" claim, which is a competitive strength in the
listing. Three ways to get signal without spending that:

1. **Uninstall URL — done 2026-09-23.** `chrome.runtime.setUninstallURL` points
   at `taxnexusapp.com/uninstall?source=chrome_extension`. No permission needed
   and the extension still makes no request — Chrome navigates a tab after the
   user clicks Uninstall. No identifier is attached, so uninstalls cannot be
   linked to each other or to a person. The page fires an `extension_uninstall`
   GA4 event and asks which of four things went wrong; the first option is "it
   never alerted me, even though I have CA inventory", because that would be a
   detection bug, not a preference.
2. **Web Store dashboard** — installs, weekly users, uninstall rate. Free, no
   code. Already in `LAUNCH-CHECKLIST.md`'s monitoring plan.
3. **Opt-in telemetry, off by default** — a v1.1 decision, not a launch one.
   Worth revisiting only *after* detection is confirmed on real inventory; if
   detection does not work, funnel metrics measure nothing.

Both the store listing and the privacy policy were corrected when the uninstall
URL landed — each previously claimed the trial CTA was the *only* thing that
opens a page. Privacy policy effective date bumped to 2026-09-23 per its own
§11.

---

## Next steps

1. **Ask a pilot seller one question first:** open your FBA inventory page with
   CA stock and tell me whether the toolbar badge turns red. Ten seconds, and it
   settles whether real FC codes are reachable (open shadow roots) or not
   (closed roots / iframes). If that fails, screenshots are moot and the
   detection approach needs rework — see "Verified against real Seller Central".
2. **Then get the three screenshots.** The submission blocker. Send the request
   in `extension/store-assets/README.md`, then run
   `node store-assets/verify-screenshots.mjs`.
3. **Run the manual checklist in `extension/TESTING.md`** against a real Seller
   Central account — 11 items. Two have never been exercised on a real page:
   item 4 (SPA navigation) and item 11 (offline blindside). See "Offline
   blindside" below for what is already proven and what those two still need.
4. **Work `extension/LAUNCH-CHECKLIST.md` top to bottom**, then submit.
5. After approval: add the reverse CTA (an "Install the free Chrome alert"
   link on the TaxNexus homepage and `/taxnexus`). Cheapest item on the
   distribution list and entirely under your control.

### Known gaps, none blocking

- **No error reporting.** Service worker exceptions die silently in users'
  browsers. Current substitute is the support email plus the bug template in
  `TESTING.md`.
- **Iframes — now an open question, not a settled tradeoff.** `all_frames` is
  off, so inventory rendered only inside an iframe is not detected. The real
  Seller Central inventory page has **5 iframes**. Whether FC codes land in one
  is unknown and is part of what the pilot seller's first check answers. If they
  do, the fix is `all_frames: true` (same-origin frames only — cross-origin
  stays unreadable), at the cost of a wider review surface.
- **CSP not empirically tested.** Reasoned about only: all logic stays in the
  isolated world and nothing is injected inline, so Amazon's CSP should not
  apply to us. Never verified against a CSP failure mode.
- **Lint/format never run on the `/trial` route files.** The repo's
  `node_modules` is missing `prettier-plugin-svelte` and `eslint-config-prettier`;
  `npm install` at the root restores both. `svelte-check` passes clean, so this
  is style verification only.
- **Privacy policy is still the technical draft** described in the note at the
  top of `src/routes/privacy/+page.svelte` — written to match actual behaviour,
  not reviewed by counsel.
