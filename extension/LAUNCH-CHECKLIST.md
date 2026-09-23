# Launch checklist — TaxNexus Nexus Alert v1.0.0

## Pre-submission

Work top to bottom. Items 1–8 are blocking; 9–15 are things that cause a
rejection or a bad first week rather than a broken extension.

- [ ] **1.** `cd extension && npm test` — 50/50 green, then
      `npm run test:e2e` — 4/4 green.
- [ ] **2.** `npm run build` succeeds and `dist/` contains `manifest.json`,
      `service-worker.js`, `content/amazon-collector.js`, `index.html`,
      `icons/` (4 PNGs), `assets/`.
- [ ] **3.** Full manual checklist in `TESTING.md` passed on **this** build —
      all 11 items, one sitting. Items 4 (SPA navigation) and 11 (offline
      blindside) especially; both need a real Seller Central page.
- [ ] **4.** `manifest.json`: `version` is `1.0.0`, `short_name` and
      `homepage_url` present, permissions still exactly
      `["activeTab", "storage", "scripting"]`. **Check the field limits the
      uploader enforces** — they are silent until they reject you:

      ```bash
      cd extension && node -e "
      const m=require('./dist/manifest.json');
      const c=(f,v,max)=>console.log(f.padEnd(12), v.length+'/'+max, v.length<=max?'ok':'OVER');
      c('name',m.name,75); c('short_name',m.short_name,12); c('description',m.description,132);"
      ```

      `short_name` ≤ **12** and `description` ≤ **132**. Both were over on
      2026-09-23 ("TaxNexus Alert" at 14, description at 133) and would have
      failed at upload.
- [ ] **5.** `package.json` version matches the manifest version.
- [ ] **6.** Three screenshots captured at 1280×800 per
      `store-assets/README.md`, **with seller-identifying data redacted**.
      Verify with `node store-assets/verify-screenshots.mjs`.
      **Critical path — needs a pilot seller with CA placement.** Two of the
      three require a California fulfillment-center code on a real FBA
      inventory page, which cannot be staged: the content script only runs on
      `sellercentral.amazon.com`, and a mocked page in a store listing is a
      misleading-screenshot rejection. The store requires at least one
      screenshot, so no seller means no submission. Schedule this into the
      first live-testing session; `store-assets/README.md` has a request you
      can send the seller verbatim.
- [ ] **7.** `https://taxnexusapp.com/privacy` returns 200 in production and the
      policy text actually describes this extension's data handling. A privacy
      URL that 404s or that only covers the web app is a guaranteed rejection.
- [ ] **8.** `https://taxnexusapp.com/trial?source=chrome_extension&alert=high`
      returns 200 in production and shows the high-alert copy. The CTA is the
      only outbound link in the product — a 404 here wastes every install.
- [ ] **9.** Data disclosures: answer **No** to every category. This is no
      longer a judgement call — the extension makes zero network requests, so
      there is nothing to defend. Verify before ticking: open DevTools on the
      service worker, use the extension, confirm the Network tab stays empty.
- [ ] **10.** Listing copy pasted from `store-listing.md` — name, short
      description, full description, all five permission justifications, the
      single-purpose statement.
- [ ] **11.** Developer account exists and is **paid + verified** — the one-time
      $5 registration fee and email verification are hard prerequisites that
      gate the very first upload, and verification is not instant. Do this
      before the screenshots arrive, not after. Publisher name should be
      something a seller will trust (not a personal Gmail handle).
- [ ] **12.** A support contact exists and someone reads it — support email or
      a linked page. Reviewers check; so do users leaving 1-star reviews.
- [ ] **13.** ZIP built from `dist/` only — not the repo, not `node_modules`,
      not `src/`. From `extension/`: `cd dist && zip -r ../taxnexus-alert-1.0.0.zip .`
      Then confirm nothing stowed away:

      ```bash
      unzip -l taxnexus-alert-1.0.0.zip | grep -iE "\.map|\.ts$|node_modules|\.env|test|__MACOSX|\.DS_Store"
      ```

      No output is the pass. Dry run on 2026-09-23: 32 KB, 14 entries, clean.
- [ ] **14.** Uploaded ZIP test-loaded one final time: unzip to a temp folder,
      load unpacked, confirm it still works. Catches a bad zip root, which is a
      common and embarrassing failure.
- [ ] **15.** Git tag cut at the exact commit that produced the ZIP, so a
      rejection can be diffed against something real.

## Common rejection reasons to avoid

Ordered by how likely each is to hit *this* extension.

**Permission justification mismatch.** The most likely rejection here. Host
access is declared through `content_scripts.matches`, not `host_permissions`,
which reviewers sometimes flag as an undeclared permission. The note at the
bottom of the permission justifications in `store-listing.md` pre-empts this —
make sure it is actually pasted in.

**`scripting` looks unjustified.** A reviewer sees `scripting` and assumes
remote code execution. The justification must say plainly that it injects the
same bundled, in-package collector file and never remote or generated code.
Remote code execution is a hard rejection and an appeal takes weeks.

**Privacy policy that doesn't match the manifest.** The policy must name this
extension and describe what it reads (Seller Central page text). Verified
2026-09-22: `taxnexusapp.com/privacy` does mention the extension by name. Note
that it still describes the extension as *detecting* figures used to compute an
estimate — accurate, but if you revise it, the stronger statement is now
available: nothing is transmitted, because the extension makes no requests.

**Overbroad host access — resolved, keep it that way.** An earlier draft also
matched `https://www.amazon.com/*`, which covers all of Amazon shopping and is
far wider than "FBA seller tool" implies. It was dropped on 2026-09-22 when the
alert it powered proved to fire on Proposition 65 warnings. The extension now
matches `sellercentral.amazon.com` only, which is trivially defensible. Do not
widen it again without a feature that genuinely needs it.

**Screenshots that don't show the extension.** Screenshots of Amazon with no
visible popup or badge get rejected as not depicting the product. All three
shots must show extension UI.

**Misleading claims.** Do not let any listing copy imply tax advice, guaranteed
compliance, or an official relationship with Amazon, the FTB, or the CDTFA. The
disclaimer is in the full description; keep it there.

**Keyword stuffing in the name or description.** "Amazon" appears in the copy
descriptively, which is fine. Do not add "Amazon FBA Seller Tool Tax Nexus
Calculator" style strings.

**Single-purpose violation.** Everything ships in one narrow function today.
Resist adding an unrelated feature before first approval.

## Post-submission monitoring

**Days 0–7 — review window.** Review usually lands in 1–3 business days, and
can take longer for a first submission from a new publisher. Do not resubmit
while pending; it resets the queue position. If rejected, read the specific
policy cited, fix only that, and reply in the appeal with what changed.

**On approval, immediately:**
- Install from the public store listing on a clean profile — store builds can
  differ from local unpacked in ways that only show up here.
- Verify the live CTA round trip: click through to `/trial`, confirm the
  `source=chrome_extension` hit shows in GA4.
- Confirm the listing renders correctly on mobile web (people do browse the
  store on phones).

**Weekly for the first month:**
- Web Store dashboard: installs, weekly users, uninstall rate. A high uninstall
  rate in week one usually means the alert is either not firing or firing
  wrongly. A silent extension is the expected steady state for a seller with no
  CA placement, so read uninstalls alongside whether HIGH ever fired for them.
- Reviews and support email — reply to every review in week one, including the
  bad ones. Early review sentiment is sticky.
- Chrome release notes for anything touching MV3 service worker lifecycle or
  `chrome.storage`.
- GA4 `/trial` landing events split by `alert_level`. `high` is the funnel that
  matters; a meaningful volume of `none` means people are clicking the CTA from
  a clear popup, which is worth knowing before rewording it.

**Set up before you need it:** a crash/error signal. There is none today —
service worker exceptions die silently in users' browsers. The cheapest version
is a support email in the listing and an explicit ask in the description for
bug reports using the template in `TESTING.md`.

## First 30 days — distribution

**Reddit r/AmazonFBA (highest intent, highest risk).** The subreddit removes
self-promotion posted as a launch announcement. What works instead: answer
existing "do I owe California tax?" threads — there are several a month — with
the actual substantive answer about R&TC 23101(a) and inventory placement,
mentioning the free extension only as a footnote. Build comment history first.
Read the rules and message the mods before any standalone post. Also consider
r/FulfillmentByAmazon and r/tax, which are more tolerant of tool mentions.
Budget: 2–3 substantive comments a week, no post in week one.

**Chrome Web Store SEO.** Store search is dominated by title and description
keyword matching. "California", "nexus", "sales tax", "FBA", and "Amazon seller"
all need to appear naturally in the first two lines of the full description —
they do in the current copy. Install velocity and rating drive ranking more than
anything else, so the first 20 installs and first 5 reviews matter
disproportionately: ask early users directly for a review.

**LinkedIn.** The real audience here is bookkeepers and e-commerce accountants
who manage multiple FBA clients — a much better multiplier than individual
sellers. Post the specific insight, not the tool: "Amazon moved a client's
inventory into ONT8 and created a California filing obligation they didn't know
about. Here's how the rule actually works." Two or three posts across the month,
each ending with the extension link. Tag the CA tax practitioner community.

**TaxNexus landing page CTA.** The loop closes here: `/trial` already takes
`?source=chrome_extension&alert={level}`. Add the reverse path — a visible
"Install the free Chrome alert" CTA on the TaxNexus homepage and on
`/taxnexus`, so web visitors who aren't ready to sign up still install
something that keeps the brand in their toolbar. This is the cheapest item on
the list and the only one fully under your control.

**Two things worth doing that aren't on the original list:**
- A short demo GIF (badge turning red on a real inventory page) reused across
  Reddit, LinkedIn, and the store listing. Costs an hour, carries every channel.
- Seller-focused Facebook groups and Discord servers, where tool recommendations
  are routine rather than policed. Lower quality traffic than Reddit, far lower
  friction.
