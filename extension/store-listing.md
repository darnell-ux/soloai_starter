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

You get three states:
• HIGH — a California fulfillment-center code is on the page. Physical presence
  confirmed. This is the one that matters.
• LOW — the page mentions a California location but no FC code. Worth checking,
  not proof.
• Clear — no California signal on this page.

Snooze alerts for 7 days if you have already handled it, or dismiss a single tab
without silencing the rest.

WHAT IT DOESN'T DO

This is the part most sellers ask about first, so: the extension does not read
your Amazon account, your orders, your revenue, your customer list, or your
credentials. It does not log in as you. It does not scrape your inventory to a
server. It has no analytics, no tracking pixel, and no advertising code of any
kind. It never sees a page you do not open yourself.

The extension makes exactly one network request, and only when a page signal is
found: an anonymous call to the TaxNexus nexus-threshold API carrying a single
number — whether California inventory was detected, as a 1 or a 0. No product
data, no account data, no identifiers. Everything else stays on your machine in
local browser storage.

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
your browser, and maps a match to the relevant California obligation. The logic
is the same threshold engine behind the TaxNexus web app.

Detection is a signal, not a legal determination. The extension tells you where
to look; a qualified tax professional tells you what to do.

PRIVACY FIRST

• No account required. No sign-up to use the alert.
• No browsing history collected, stored, or transmitted.
• No personal or financial data leaves your browser.
• Runs only on amazon.com and sellercentral.amazon.com — nowhere else.
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

### Host access — `https://www.amazon.com/*`

> Amazon product and listing pages can display California shipped-from and
> location information. The content script reads the rendered page text to
> detect that signal and shows a LOW alert. It reads the DOM only and makes no
> network requests from the page.

### Host access — `https://sellercentral.amazon.com/*`

> This is the core function. Seller Central FBA inventory and placement pages
> show the fulfillment-center codes that reveal whether the seller's stock sits
> in a California warehouse — the fact that triggers California "doing business"
> status. The content script reads only the rendered text of these pages to
> find those codes.

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
| Website content | **Decide before submitting — see below** |

Then tick all three certifications: no sale of data, no use unrelated to the
single purpose, no use to determine creditworthiness.

### The one disclosure that needs a decision

Page text is read in memory and is never transmitted — but the assess call does
send *one derived bit* off the machine (`inventory: 1` or `0`, meaning "a CA
fulfillment-center code was or wasn't present"). That is derived from website
content, so "No" is arguable but not obviously correct, and a wrong answer here
is a policy violation rather than a fixable listing error.

Two clean ways out, in order of preference:

1. **Declare "Yes" for Website content** and state in the justification that the
   only value transmitted is a single boolean flag with no page text, URL, or
   identifier attached. Honest, and costs nothing at review.
2. **Stop transmitting it.** `riskFromAssessment()` already treats a local CA
   detection as decisive on its own — the assess call adds nothing to the HIGH
   case. Dropping the call for detected-CA pages would make the extension fully
   offline for its main path and let every box be an unambiguous No.

Do not submit with an unreviewed "No" here.
