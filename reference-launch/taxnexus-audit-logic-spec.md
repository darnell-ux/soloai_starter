# TaxNexus — California Exposure: Audit Logic & Sourced Constants

**Source-of-truth spec for the free Audit's determination, scale, and escalation logic.**
Hand this to Cursor / Claude Code as the basis for the Audit engine. Every number below carries a source and a verified-on date so nothing gets hardcoded blind.

- **Verified-on (this pass):** 2026-06-21
- **Status:** working spec — figures confirmed against FTB/CDTFA and recent CA tax-appeal commentary; see §9 caveats before shipping any number to a user.
- **Not tax advice.** This encodes public agency rules so the Audit can give a *plain-language read*, not a filing. FTB's and CDTFA's official English pages are the binding source. A CPA should sign off on the logic before it gives anyone a dollar figure.

---

## 0. How to use this file

1. **Constants are versioned, not permanent.** Anything marked 🔁 is indexed or changes by legislation. Store each as `{ value, source_url, verified_on }` and re-check on a schedule. Showing a user a stale threshold *is* the stale-advice failure the landing page (§5) mocks.
2. **Two agencies, two nexus types.** The single most important thing to get right (§1). Most wrong advice online collapses them into one.
3. **Physical nexus has no safe harbor.** A small seller with CA inventory is still exposed — confirmed by a 2025 decision (§6). The Audit must never reassure a small FBA/3PL/FBT seller that they're "under the threshold, so fine."

---

## 1. The model in one screen

California can reach a seller two different ways, run by two different agencies. They are **independent** — you can owe one, the other, or both.

| | **FTB** (income / franchise) | **CDTFA** (sales / use) |
|---|---|---|
| **What it is** | The $800 minimum franchise/LLC tax + income tax | Sales & use tax collection/remittance |
| **Physical-presence trigger** | Inventory in a CA warehouse = "doing business" under R&TC 23101(a) → **$800 owed, any volume** | Inventory in a CA warehouse = "engaged in business" → **register from dollar one** |
| **Economic trigger (no CA presence)** | CA sales over the indexed factor threshold (🔁 ~$757,070 for 2025) | CA sales over **$500,000** (current or prior calendar year) |
| **Does Amazon handle it?** | No. Never. | Partly — marketplace facilitator remits tax on *facilitated* sales, but physical presence + direct-channel sales still create obligations |
| **Recurs annually?** | Yes, until status ends | Yes, while registered / nexus persists |

**The crux for FBA/3PL/FBT sellers:** inventory physically in California triggers *both* agencies regardless of how little you sell. Economic thresholds are a *separate, additional* doorway for remote sellers who have **no** CA inventory.

---

## 2. Constants (the numbers)

### 2.1 FTB — income / franchise tax

| Item | Value | Code / source | Notes |
|---|---|---|---|
| Minimum franchise / LLC tax | **$800 / year** | R&TC 17941 (LLC), 23153 (corp); FTB 3522 | Owed even at $0 profit once "doing business." Pay the greater of regular tax or $800. |
| "Doing business" — general standard | Actively engaging in **any** transaction for gain in CA | R&TC 23101(a) | No dollar floor. This is the one FBA inventory trips. |
| "Doing business" — factor thresholds 🔁 | See year-by-year table below (or 25% of total) | R&TC 23101(b) | Indexed annually. **Latest published year is 2025; FTB had not posted 2026 as of its 2025-11-07 update** — use 2025 as latest confirmed and re-check. Original 2011 base was $500k / $50k / $50k. |

**FTB factor-presence thresholds by year** (confirmed against FTB, page last updated 2025-11-07, verified 2026-06-21). The Audit needs *every* year to assess multi-year back exposure — meet *any one* (or 25% of your total) and you're "doing business":

| Tax year | CA sales | CA real/tangible property | CA payroll |
|---|---|---|---|
| 2025 | $757,070 | $75,707 | $75,707 |
| 2024 | $735,019 | $73,502 | $73,502 |
| 2023 | $711,538 | $71,154 | $71,154 |
| 2022 | $690,144 | $69,015 | $69,015 |
| 2021 | $637,252 | $63,726 | $63,726 |
| 2020 | $610,395 | $61,040 | $61,040 |
| 2019 | $601,967 | $60,197 | $60,197 |
| 2018 | $583,867 | $58,387 | $58,387 |

> **Reminder:** these thresholds only matter for the *economic-only* path (a seller with **no** CA inventory). Any seller with inventory in a CA warehouse is "doing business" under 23101(a) regardless of these numbers — so the Audit must never use "under threshold" to clear an inventory-holding seller.
| 23101(a) vs (b) | **Independent.** Meeting *either* = doing business | OTA: Diet Standards, Aroya, GEF | (b) is **not** a safe harbor (see §6). |
| LLC fee (on top of $800) 🔁 | Tiered, kicks in at **CA gross receipts ≥ $250,000** | R&TC 17942 | Separate from the $800. Scales with gross receipts. |
| PL 86-272 protection | Shields *net-income* tax for pure solicitation of tangible goods | 15 U.S.C. §381 | Does **not** shield the $800 minimum tax, and **inventory in CA breaks the protection** anyway. |

Source: <https://www.ftb.ca.gov/file/business/doing-business-in-california.html> · <https://www.ftb.ca.gov/file/business/help-with-doing-business-in-california.html>

### 2.2 FTB — penalties & fees

From the FTB "Common penalties and fees" page (**page last updated 2025-12-15**; the page states fees vary year to year). Source: <https://www.ftb.ca.gov/pay/penalties-and-interest/index.html>

| Penalty / fee | Amount | Code | When it hits |
|---|---|---|---|
| Delinquent (late) filing | 5% of tax due per month, **max 25%** | RTC 19131 | Didn't file by extended due date. Individuals w/ balance ≤ $540: lesser of $135 or 100% of balance. |
| Demand penalty | **25%** of total tax due | RTC 19133 | Ignored a *Demand for Tax Return* letter — even if a refund was due. **Key escalation flag.** |
| Late payment | 5% of unpaid tax **+ 0.5%/month** (up to 40 months) | RTC 19132 | Didn't pay by due date. For LLCs, computed on annual tax + LLC fee + NCNR tax. |
| Estimated tax penalty | Interest-rate based on underpayment | RTC 19136 / 19142 | Didn't pay / underpaid estimates. |
| Bad check | ≥ $1,250 → 2%; < $1,250 → $25 or amount (lesser) | RTC 19134 | Dishonored payment. |
| Mandatory e-Pay | Individuals 1% / Businesses 10% of amount not paid electronically | RTC 19011.5 | Required to pay electronically and didn't. |
| Underpayment of estimated LLC fee | 10% of underpaid fee | RTC 17942 | LLC under-prepaid its fee. |
| SOS Statement of Information | $250 (most) / $50 (exempt orgs) | — | Late SOS filing; collected for SOS. |
| **Collection cost recovery fee** 🔁 | **$362** (individual / partnership / LLC-as-partnership) · **$292** (corp) | RTC 19254 | Charged once FTB takes **involuntary** collection action (e.g., garnishment). Rate effective 07/01/25. |
| Filing enforcement fee 🔁 | $131 (individuals / most businesses) · $116 (corps) | RTC 19254 | Failed to file after a legal demand. |
| Federal treasury offset fee | $23.64 | GC 16583.1 | Fee to grab your **federal refund** via Treasury Offset Program. |

### 2.3 CDTFA — sales / use tax

| Item | Value | Code / source | Notes |
|---|---|---|---|
| Economic nexus threshold | **$500,000** combined sales of tangible personal property delivered into CA, current or prior calendar year | R&TC 6203(c)(4) (AB 147, eff. 2019-04-01) | **Dollar-only — no transaction-count threshold.** Counts *all* sales incl. marketplace sales, even when the marketplace remits. |
| Physical presence | **Register from dollar one** | R&TC 6203; CDTFA Reg. 1684 | Inventory in a CA warehouse (FBA / 3PL / FBT) = physical presence. **No de minimis time window** — even weeks counts, and "trailing nexus" persists after stock leaves. |
| Marketplace Facilitator Act | Marketplace (Amazon/Walmart/eBay/TikTok) collects & remits on facilitated sales | eff. 2019-10-01 | Does **not** remove physical nexus, and does **not** cover the seller's direct/own-site channel. |
| Voluntary Disclosure Agreement (VDA) | Look-back generally limited to **3 years**; can reduce/eliminate prior-period penalties | CDTFA VDA program | Relevant escalation path when nexus began > 3 years ago. |
| Failure to file a return | 10% of tax due | RTC 6591, 6511 | Mandatory; applies per period a return was required. |
| Failure to pay | 10% of unpaid tax | RTC 6591 (self-assessed) / 6565 (CDTFA-determined) | Hits if you get a bill and don't pay within 30 days. **Waived if you enter a payment plan within 45 days and complete it on time.** |
| Negligence / intentional disregard | 10% | RTC 6484 | Discretionary (audit). Mutually exclusive with the fraud penalty. |
| Fraud / intent to evade | 25% | RTC 6485 / 6514 | Discretionary; CDTFA must prove it. Can stack on top of the 10% failure-to-file. |
| Tax collected but not remitted | 40% | RTC 6597 | You collected sales-tax reimbursement / use tax and didn't remit it (small-liability exceptions apply). |
| 50% penalty — *narrow* | 50% of tax | RTC 6485.1 / 6514.1 | **Only** for registering a vehicle/vessel/aircraft out-of-state to evade tax. **NOT** a general "no seller's permit" penalty (an earlier draft of this spec got that wrong). |
| Interest | modified adjusted rate ÷ 12, per month | RTC 6591.5 | Per month; any fraction of a month = a full month. Underpayment rate ≈ IRC 6621 rate + 3 points. |

Source: <https://cdtfa.ca.gov/industry/wayfair/> · <https://cdtfa.ca.gov/lawguides/vol1/sutr/sales-and-use-tax-regulations-art17-all.html>

---

## 3. Determination logic (decision tree)

The intake (Q1–Q5 in the earlier sketch) feeds this. The deciding variable is **fulfillment method → is your inventory in California?**, not which platform sold it.

```
START
│
├─ Inventory physically in a CA warehouse?
│   (FBA, Walmart WFS, Fulfilled by TikTok, a 3PL with a CA location,
│    or self-ship from inside CA)
│
│      ├─ YES  →  PHYSICAL NEXUS
│      │           • FTB: "doing business" (23101(a)) → $800/yr owed, ANY volume
│      │           • CDTFA: engaged in business → register from dollar one
│      │           • Result = "YOU'RE EXPOSED (both agencies)"  ← do NOT soften for small sellers
│      │
│      └─ NO   →  check ECONOMIC NEXUS
│                  ├─ CA sales > $500k (cur/prior yr)? → CDTFA registration obligation
│                  ├─ CA sales > ~$757k (2025) OR organized/domiciled in CA? → FTB $800 + filing
│                  └─ Below both, no CA presence → likely NOT exposed on these triggers
│                       (light "you look clear, but here's what would change that" result)
│
└─ ALWAYS overlay the escalation check (§5). Any red-line → route to "see a professional."
```

**Guardrail:** if the seller has CA inventory, the answer is "exposed" **even if** every economic threshold is unmet. Coding "under threshold = safe" would reproduce the exact wrong-but-confident advice §5 warns about — and a 2025 ruling (§6) proves it's wrong.

---

## 4. Exposure / scale model

The free Audit promises a *rough sense of scale*, not a filing. Stack grounded components:

```
exposure ≈ (years_exposed × $800 floor)
         + estimated CA income tax (if profitable; else $0 — the $800 still stands)
         + LLC fee (if CA gross receipts ≥ $250k)
         + penalty stack  (late-file up to 25%  +  late-pay 5% + 0.5%/mo
                            +  demand penalty 25% if a demand letter was ignored)
         + interest (compounding)
         + fixed collection fees IF involuntary collection has started
                            ($362 cost-recovery + $131 filing-enforcement + $23.64 offset, etc.)
```

**Real-world calibration anchors:**
- **One bare year at the minimum:** the Diet Standards seller's disputed amount was **$1,127.50** for a single year ($800 + demand penalty + interest). Use ~$1,100/yr as the floor-per-year anchor.
- **Darnell's own case (~$4,500):** multiple years of minimum tax + actual income tax on FBA sales + late-payment penalties + collection (garnishment → cost-recovery fee) + offset of his refund. The stack above reproduces that range cleanly — the §3 number is defensible.

Output as a **band** ("roughly $1,000–$2,000" / "$3,000–$6,000" / "this needs a professional's number"), never a false-precision figure.

---

## 5. Escalation: "see a professional" triggers

These map straight to landing-page §6. Any one trips the pro-referral:

- A **Demand for Tax Return** letter has been received (25% demand penalty now in play; deadline-sensitive).
- **Involuntary collection** has begun — garnishment, levy, or lien (the collection cost-recovery fee confirms it's escalated).
- A **refund was offset** (state or federal) — already in active collections.
- **Multiple back years** exposed at once (compounding past where prevention helps; a **VDA** may cap look-back to ~3 years — name it as the tool a pro would use).
- **High volume + long un-filed history**, or any **audit / Nexus Questionnaire** from CDTFA.

Everything upstream of these is Audit/Guard territory. The moment one fires, the tool says, plainly, "this is a CPA/tax-attorney conversation now" — §6's promise, automated on real signals.

---

## 6. Keystone authority — *Appeal of Diet Standards LLC* (2025)

This is the single best validation of the entire TaxNexus thesis. Worth knowing cold.

- **Cite:** *In the Matter of the Appeal of Diet Standards LLC*, OTA Case No. 230613542 (decided **Oct. 7, 2025**).
- **Facts:** A Delaware LLC based in Florida used Amazon FBA in 2019. It held title to inventory in California fulfillment centers and made sales to CA customers. Its CA sales were **under ~$14,000** — far below every bright-line threshold — and its in-state inventory was minimal.
- **Holding:** Still "doing business" in California under **R&TC 23101(a)**, and liable for the **$800** annual LLC tax plus demand penalty and interest. The OTA ruled that 23101(a) and (b) operate **independently**, so the factor thresholds are **not a safe harbor** — physical presence via inventory, *regardless of value*, satisfies the general standard.
- **How FTB found them:** the FTB assessed the seller after receiving its **sales data from CDTFA**. (See §7.)
- **On the excuse "I didn't know":** the OTA held that ignorance or misunderstanding of the law is **not reasonable cause** to waive the penalty.

**Implication for the Audit:** "small seller, low CA sales" is *not* a clean bill of health if inventory touched California. This case is the reason the §3 guardrail exists.

---

## 7. The cross-agency mechanism (why the blindside works)

This explains, mechanically, how a seller who never filed still gets a bill — and it's strong, true material for landing-page §2/§5.

1. **Amazon/marketplace → CDTFA.** California requires fulfillment centers to disclose which sellers store inventory in the state. CDTFA also gets marketplace sales data.
2. **CDTFA → FTB.** The two agencies share data (this is literally how Diet Standards was caught — FTB acted on CDTFA's sales data).
3. **FTB → you.** FTB issues a Demand for Tax Return, then assessment, then collection — often for several years at once.

So the seller's silence doesn't hide them; the platforms and agencies already have the data. The only party *without* a heads-up is the seller. That asymmetry is the whole product.

---

## 8. Copy implications for the landing page (recommended, not yet applied)

These don't change the warm, Amazon-led voice — they sharpen its accuracy and authority. Flagged for your call:

1. **§5 / FAQ — kill the "I'm too small" reassurance directly.** Add a line: being under the sales thresholds is *not* a safe harbor if your inventory sits in California — a 2025 California tax appeal confirmed even a sub-$14K FBA seller owed the $800. (Reference *Diet Standards* generically as "a 2025 California tax appeal," no need to name it on the page.)
2. **§2 — name the data trail.** One sentence: the agencies share data — the marketplace reports your CA inventory to CDTFA, CDTFA feeds FTB, and FTB sends the bill. Explains *how* the blindside happens and raises stakes without fear-mongering.
3. **§6 / FAQ — name the VDA.** For multi-year back-tax cases, "a professional may use a Voluntary Disclosure Agreement to cap the look-back" — concrete, credible, and reinforces "we'll point you to a pro."
4. **§8 "$800 thing" — tighten.** Confirm it's owed *even at $0 profit, even below every threshold, once inventory is in CA*. Currently close; this makes it bulletproof.

Say the word and I'll fold these into the EN + es-MX pages.

---

## 9. Caveats & maintenance

- **Not tax advice; not a CPA.** This is structure + sourcing. Get professional sign-off before the Audit emits a dollar figure.
- **Binding source = FTB/CDTFA English pages.** Where this spec and the agency disagree, the agency wins.
- **🔁 figures change.** FTB factor thresholds are now confirmed through tax year 2025 (§2.1); **2026 was not yet published as of FTB's 2025-11-07 update** — check for it and add the row when posted. Collection/enforcement fees change by legislation; CDTFA interest rate moves semiannually. Store every figure with `verified_on` and re-check (suggest quarterly + every January).
- **CDTFA penalty rows now confirmed** against CDTFA primary sources (Reg. 1703, S&UT Law Ch. 5, Pub. 75). The earlier "50% for operating without a permit" figure was incorrect and has been removed. Interest rates (🔁) still move semiannually — pull the current rate from CDTFA.
- **Single-state scope.** This is California only. Other states have their own triggers; Guard's multi-state watch is a separate model.
- **PL 86-272 nuance.** Don't let the logic over-apply 86-272 — it never shields the $800, and CA inventory voids it.

---

## 10. Sources

- FTB — Common penalties and fees: <https://www.ftb.ca.gov/pay/penalties-and-interest/index.html> (updated 2025-12-15)
- FTB — Doing business in California: <https://www.ftb.ca.gov/file/business/doing-business-in-california.html>
- FTB — Help with doing business in California: <https://www.ftb.ca.gov/file/business/help-with-doing-business-in-california.html>
- CDTFA — Wayfair / AB 147 use-tax guide: <https://cdtfa.ca.gov/industry/wayfair/>
- CDTFA — Sales & Use Tax Regulations, Art. 17: <https://cdtfa.ca.gov/lawguides/vol1/sutr/sales-and-use-tax-regulations-art17-all.html>
- CDTFA — Regulation 1703 (Interest and penalties): <https://cdtfa.ca.gov/lawguides/vol1/sutr/1703.html>
- CDTFA — Publication 75 (Interest, Penalties, and Collection Cost Recovery Fee): <https://cdtfa.ca.gov/formspubs/pub75.pdf>
- *Appeal of Diet Standards LLC*, OTA Case No. 230613542 (Oct. 7, 2025) — verify against the OTA's published opinion before citing on any public page.
- Secondary commentary used for cross-checks (CBIZ, National Law Review, Current Federal Tax Developments) — useful for context; always trace back to FTB/CDTFA/OTA primary sources.

*Verified-on for all of the above: 2026-06-21. Re-verify 🔁 items before each release.*
