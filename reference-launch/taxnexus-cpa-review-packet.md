# TaxNexus — Professional Review Packet

**For a California-licensed CPA, Enrolled Agent, or tax attorney.**
Purpose: validate the tax assertions and outputs of the TaxNexus *free Audit* **before** it gives any seller a determination or dollar figure.

- **Prepared:** 2026-06-21
- **Companion document:** `taxnexus-audit-logic-spec.md` (the full sourced logic + constants). Please review this packet alongside it.
- **Estimated review time:** ~20–30 minutes. Most of this is confirm / correct / flag.

---

## 1. What TaxNexus is (so the review is scoped right)

TaxNexus is a self-serve tool for Amazon/Walmart/TikTok/Shopify sellers. The **free Audit** asks a few questions about where they sell and how inventory is fulfilled, then returns a **plain-language read** on their California exposure: whether they're likely triggering nexus, which taxes are in play (FTB $800 franchise + CDTFA sales/use), a **rough sense of scale**, and whether it's a self-serve fix or time to call a professional.

**It is explicitly not a filing, not tax advice, and not a substitute for a CPA.** It is meant to surface exposure early and route serious cases to a professional. The founder is a former Amazon seller who was personally blindsided by this; the product's ethos is "the heads-up nobody gave me."

We are asking you to confirm the tool won't tell a seller something that is **wrong** or that **crosses from information into advice**.

---

## 2. The one question that matters most

**Should the free Audit ever display a specific dollar figure, or only a range plus "consult a professional for an exact number"?**

Our current lean (please confirm or overrule): the free tier shows a **determination** (exposed / not exposed / economic-only) and a **rough range**, never a precise liability number, and always with an "informational, not tax advice" notice. We'd rather under-promise on the number and route to a pro.

Related: does anything in the planned outputs (see §3) read as **tax advice** or risk a **UPL / reliance** problem in California? Where's the line we should phrase around? If a tax attorney's eye is needed on the disclaimer language specifically, please flag that.

---

## 3. Assertions the Audit will make — please ✅ confirm / ✏️ correct / 🚩 flag

| # | Assertion the tool will rely on | Confirm? |
|---|---|---|
| 1 | Inventory held in a California warehouse (Amazon FBA, a 3PL, Walmart WFS, Fulfilled by TikTok) makes a seller "doing business" under R&TC 23101(a), triggering the **$800 minimum franchise/LLC tax — regardless of sales volume.** | ☐ |
| 2 | R&TC 23101(a) and (b) operate **independently**; the bright-line factor thresholds are **not a safe harbor** (per *Appeal of Diet Standards LLC*, OTA No. 230613542, Oct 7 2025). | ☐ |
| 3 | The $800 is owed **annually, even at $0 profit, and even below every factor threshold,** once "doing business." | ☐ |
| 4 | Amazon/marketplaces remit **sales tax** as marketplace facilitators, but **income/franchise tax is never the marketplace's responsibility** — it stays with the seller. | ☐ |
| 5 | For **CDTFA** (sales/use): inventory in CA = physical presence → register from dollar one; **separately**, economic nexus = **$500,000** of TPP delivered into CA (current or prior year), counting marketplace sales toward the threshold. | ☐ |
| 6 | The **penalty constants** in the spec (FTB §2.2 and CDTFA §2.3) are current and correctly stated. | ☐ |
| 7 | The **escalation triggers** — a Demand for Tax Return received, involuntary collection/garnishment/lien, refund offset, multiple back-years, or any audit/Nexus Questionnaire — correctly indicate "this is now a professional's case." | ☐ |
| 8 | The **scale-model** approach (spec §4: stack $800/yr + estimated income tax + penalties + interest + collection fees, output as a band) does not materially over- or under-state exposure in a misleading way. | ☐ |
| 9 | **PL 86-272** never shields the $800 minimum tax, and a seller with CA inventory cannot claim 86-272 protection anyway. | ☐ |

---

## 4. Constants to verify for currency

These are confirmed against FTB/CDTFA as of **2026-06-21**. Please confirm they're current at your review date (or note the correct figure):

- **$800** minimum franchise/LLC tax (R&TC 17941 / 23153) — ☐ current
- **FTB factor thresholds, 2025:** sales $757,070 / property $75,707 / payroll $75,707 (indexed; **2026 not yet published by FTB**) — ☐ current
- **CDTFA economic nexus:** $500,000 (R&TC 6203(c)(4)) — ☐ current
- **FTB penalties:** late file 5%/mo (max 25%, RTC 19131); demand 25% (RTC 19133); late pay 5% + 0.5%/mo to 40 mo (RTC 19132); collection cost recovery $362/$292 (RTC 19254) — ☐ current
- **CDTFA penalties:** 10% file (RTC 6591/6511); 10% pay (6591/6565); 10% negligence (6484); 25% fraud (6485); 40% collected-not-remitted (6597) — ☐ current
- **LLC fee:** tiered, begins at CA gross receipts ≥ $250,000 (R&TC 17942) — ☐ current / ☐ confirm the tier amounts

---

## 5. Open judgment calls — your expertise specifically wanted

1. **Dollar figures vs. ranges** (see §2). Your call.
2. **Naming specific strategies.** Is it acceptable for the tool to *name* a Voluntary Disclosure Agreement as something a professional might use, or does naming a strategy edge into advice?
3. **First-year nuances.** Corporations get a first-year minimum-tax exemption; LLCs generally don't. Should the Audit account for first-year status, or stay year-agnostic?
4. **Income-tax estimate.** For a seller who's actually profitable, is a rough CA income-tax estimate worth attempting, or should the tool stay on the $800 + penalties floor and leave income tax to the pro?
5. **Suspension/forfeiture.** Should the Audit warn that unpaid FTB obligations can lead to entity suspension?
6. **Anything we're missing.** CA-specific traps, an OTA development, or a framing risk you'd want changed before this is public.

---

## 6. Reviewer sign-off

> The Audit will not display determinations or figures to the public until this is signed.

- **Reviewer name:** ________________________________
- **Credential & CA license #:** ____________________ (CPA / EA / Attorney)
- **Date reviewed:** ________________
- **Outcome:** ☐ Approved as written ☐ Approved with the changes noted above ☐ Not approved — see notes
- **Notes / required changes:**

  ______________________________________________________________

  ______________________________________________________________

---

## 7. Choosing the right reviewer

Pick someone whose practice actually touches this fact pattern — not a generalist:

- **California-licensed** CPA, EA, or tax attorney.
- Real experience with **multistate / e-commerce sales-and-use tax and franchise tax** — ideally someone who already knows the FBA-inventory nexus issue and the OTA line of cases (*Diet Standards*, *Aroya*, *GEF*).
- Comfortable opining on the **informational-tool vs. tax-advice** line (or able to loop in a tax attorney for that single question).
- A SALT (state-and-local-tax) specialist is the sweet spot.

*This packet is a tool to obtain professional review; it is not itself legal or tax advice, and the author is not a CPA or attorney.*
