# Chrome Web Store listing — TaxNexus Nexus Alert

Copy-paste source for the Web Store developer dashboard. Character counts are
the store's hard limits; the count in parentheses is what this copy actually
uses.

---

## Name (max 45)

```
TaxNexus — CA Nexus Alert for FBA Sellers
```

(41 chars.) This string is also `name` in `public/manifest.json` — the store
takes the listing name from the manifest, so the two must not drift.

---

## Short description (max 132)

```
Detects California sales tax nexus triggers while you browse Amazon. Free alert for FBA sellers.
```

(96 chars.)

---

## Category

**Productivity**

---

## Privacy policy URL

```
https://taxnexusapp.com/privacy
```

---

## Full description (max 16,000)

```
Amazon decides where your inventory goes. California decides what that costs you.

If Amazon has ever placed your FBA stock in a California fulfillment center, you
are "doing business" in California under Revenue & Taxation Code section
23101(a) — at any sales volume, with no safe harbor and no minimum threshold.
That means an $800 minimum franchise tax per year, a Franchise Tax Board filing
obligation, and CDTFA seller's permit registration. Most sellers find out three
years later, when the penalties and interest have already compounded.

TaxNexus Nexus Alert is a free toolbar warning that tells you the moment it
sees the signal.

WHAT IT DOES

While you browse Amazon Seller Central, the extension reads the page you are
already looking at and watches for California fulfillment-center codes — ONT8,
SMF1, LAX9, OAK4, SBD1 and the rest of the California network. When one shows
up, the toolbar icon turns red and the popup tells you plainly what it means:
your inventory is physically in California, and the nexus clock is running.

You get two states:
• HIGH — a California fulfillment-center code is on the page. Physical presence
  confirmed. This is the one that matters.
• Clear — no California inventory signal on this page.

The extension deliberately does not alert on pages that merely mention
California. Only a fulfillment-center code proves where your stock actually
sits, and an alert you learn to ignore is worse than no alert.

Snooze alerts for 7 days if you have already handled it, or dismiss a single tab
without silencing the rest.

WHAT IT DOESN'T DO

This is the part most sellers ask about first, so: the extension does not read
your Amazon account, your orders, your revenue, your customer list, or your
credentials. It does not log in as you. It does not scrape your inventory to a
server. It has no analytics, no tracking pixel, and no advertising code of any
kind. It never sees a page you do not open yourself.

The extension makes no network requests at all. Not a minimal set — none. It
does not phone home, does not check in, and does not send a single byte
anywhere. Every check runs inside your browser, and everything it remembers is
kept in local browser storage that is deleted when you uninstall. The only time
anything leaves your machine is when you yourself click the "Start free trial"
link, which opens a normal web page.

A practical consequence: it keeps working with no connection at all. If your
inventory page loads, the alert fires.

WHO IT'S FOR

Amazon FBA sellers — particularly anyone enrolled in Inventory Placement
Service or distributed placement, where Amazon moves stock between fulfillment
centers without asking you. Also useful for bookkeepers and tax preparers who
manage FBA clients and need to spot the exposure before an FTB notice does.

If you sell only FBM from a single non-California location and Amazon never
holds your stock, you probably will not see an alert. That is the correct
answer, and it is worth confirming.

HOW IT WORKS

Amazon labels fulfillment centers with airport-style codes. California's
warehouses share a known set of prefixes. The extension scans the rendered text
of Seller Central inventory and placement pages for those codes, entirely inside
your browser, and maps a match to the relevant California obligation. The rule
it applies is the same one the TaxNexus web app uses, evaluated locally — there
is no server call to make and nothing to send.

Detection is a signal, not a legal determination. The extension tells you where
to look; a qualified tax professional tells you what to do.

PRIVACY FIRST

• No account required. No sign-up to use the alert.
• No browsing history collected, stored, or transmitted.
• Nothing leaves your browser. The extension makes no network requests.
• Runs only on sellercentral.amazon.com — nowhere else, not even the rest of Amazon.
• All state is kept in local browser storage and is deleted when you uninstall.
• Full policy: https://taxnexusapp.com/privacy

IMPORTANT

TaxNexus provides general information about California tax thresholds. It is not
tax advice, does not create a professional relationship, and should not be
relied on as a substitute for a qualified tax professional's judgment.

Built by TaxNexus — California nexus, in plain language.
```

(~3,050 chars / ~510 words.)

---

## Permission justifications

Paste each into the matching field in the dashboard's privacy tab. Keep them
literal — reviewers check the claim against the code.

### `activeTab`

> Used only when the user clicks "Re-scan this page" in the popup. That click
> grants temporary access to the current tab so the extension can re-run its
> California fulfillment-center check on demand. The extension has no standing
> access to tabs and does not read tab URLs, titles, or history in the
> background.

### `storage`

> Stores the extension's own state in `chrome.storage.local`: the most recent
> detection result, the per-tab dismissed list, the 7-day snooze expiry, and the
> last alert level. This is what lets a snooze survive a browser restart and
> keeps a dismissed tab dismissed. Nothing is synced to a server and nothing
> personal is stored.

### `scripting`

> Fallback path for the "Re-scan this page" action. If the content script is not
> already present in the tab — for example the user installed the extension
> after opening the page — `chrome.scripting.executeScript` injects the same
> Amazon-only collector file that the manifest would have injected. It runs the
> identical bundled script; no remote or dynamically generated code is ever
> executed.

### Host access — `https://sellercentral.amazon.com/*`

> The extension's single function. Seller Central FBA inventory and placement
> pages show the fulfillment-center codes that reveal whether the seller's stock
> sits in a California warehouse — the fact that triggers California "doing
> business" status. The content script reads only the rendered text of these
> pages to find those codes. It reads the DOM only and makes no network requests
> from the page.

This is the **only** host the extension runs on. `https://www.amazon.com/*` was
requested in an earlier draft and removed before submission — it existed to
flag pages that merely mentioned California, which in practice matched
Proposition 65 chemical warnings rather than anything about inventory. Dropping
it narrowed the extension to the one site its purpose actually requires.

Note: host access is granted declaratively through `content_scripts.matches`
rather than a `host_permissions` array, which keeps the requested permission set
to exactly `activeTab`, `storage`, `scripting`. If a reviewer asks where the
host permissions are declared, point them at `content_scripts` in the manifest.

---

## Single-purpose statement

> The extension has one purpose: warn Amazon FBA sellers when a page they are
> viewing shows that their inventory is stored in California, which creates a
> state tax obligation. Every permission it requests serves that single warning.

---

## Data-usage disclosures (dashboard checkboxes)

Answer **No** to every "does your extension collect…" category:

| Category | Answer |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | No — page text is read in memory and never transmitted |

Then tick all three certifications: no sale of data, no use unrelated to the
single purpose, no use to determine creditworthiness.

### Every answer here is now unambiguous

There was previously a judgement call on **Website content**: the extension sent
one derived bit off the machine (`inventory: 1` or `0`) to the assess API, which
is derived from page content, making a flat "No" arguable rather than clearly
correct.

That was resolved on 2026-09-22 by removing the network call entirely — it could
only ever return one of two fixed answers, so it now computes locally. The
extension makes zero network requests, so every box above is a straightforward
"No" with nothing to defend.

If a reviewer asks, the claim is checkable in seconds: open the Network tab and
use the extension. There is no request to find.
