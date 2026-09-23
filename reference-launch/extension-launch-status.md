# Nexus Alert extension — launch status

**As of:** 2026-09-22
**Extension version:** 1.0.0 (unreleased — not yet submitted to the Chrome Web Store)
**App version in production:** 1.1.2 (`https://taxnexusapp.com/health`)

**One blocker remains: the three store screenshots.** They need a pilot seller
with California inventory placement, which cannot be staged. Everything else is
submission-ready.

> Supersedes the behaviour described in
> `extension-phases-5-8-complete.md`, which is an accurate record of that
> work but predates the changes in "What changed after phases 5–8" below.

---

## Submission readiness

| Item | State |
|---|---|
| Extension builds, loads unpacked, no errors | ✅ verified in Chrome |
| Automated tests | ✅ 38/38 green |
| Permissions minimal and defensible | ✅ `activeTab, storage, scripting`; one host |
| Zero network requests | ✅ test-enforced and verified in the shipped build |
| Icons | ✅ real artwork, two treatments |
| Listing copy + permission justifications | ✅ `extension/store-listing.md` |
| Data-usage disclosures | ✅ all "No", no judgement calls left |
| Privacy policy live and accurate | ✅ deployed 2026-09-22 |
| `/trial` CTA target live | ✅ verified at every alert level |
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

## Next steps

1. **Get a pilot seller to take the three screenshots.** The only blocker. Send
   the request in `extension/store-assets/README.md`, then run
   `node store-assets/verify-screenshots.mjs`.
2. **Run the manual checklist in `extension/TESTING.md`** against a real Seller
   Central account — 11 items. Two have never been exercised on a real page:
   item 4 (SPA navigation) and item 11 (offline blindside). See "Offline
   blindside" below for what is already proven and what those two still need.
3. **Work `extension/LAUNCH-CHECKLIST.md` top to bottom**, then submit.
4. After approval: add the reverse CTA (an "Install the free Chrome alert"
   link on the TaxNexus homepage and `/taxnexus`). Cheapest item on the
   distribution list and entirely under your control.

### Known gaps, none blocking

- **No E2E harness.** Three Playwright targets specified in `TESTING.md`, none
  written.
- **No error reporting.** Service worker exceptions die silently in users'
  browsers. Current substitute is the support email plus the bug template in
  `TESTING.md`.
- **Iframes.** `all_frames` is off, so inventory rendered only inside an iframe
  is not detected. Deliberate — enabling it widens the review surface.
- **Lint/format never run on the `/trial` route files.** The repo's
  `node_modules` is missing `prettier-plugin-svelte` and `eslint-config-prettier`;
  `npm install` at the root restores both. `svelte-check` passes clean, so this
  is style verification only.
- **Privacy policy is still the technical draft** described in the note at the
  top of `src/routes/privacy/+page.svelte` — written to match actual behaviour,
  not reviewed by counsel.
