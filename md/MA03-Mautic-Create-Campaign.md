# MA03 — Mautic: Create “New Signups” Campaign (Official UI / API / CLI Only)

## IMPORTANT IMPLEMENTATION NOTE

All configuration and setup for Mautic must be performed exclusively through the **official Mautic interfaces**:

- Mautic **Web UI** (Admin / campaign builder)
- Mautic **REST API** (documented endpoints)
- Mautic **CLI** (documented console commands)

**Do not** inject code, edit Mautic core source, patch arbitrary config files, or modify the Mautic database **directly** (SQL, file edits) to create or change campaigns, segments, emails, or sends. Use only supported flows so upgrades, permissions, and audits remain valid.

This document describes **what to configure** and **how to validate it**. It does **not** require application database or custom API changes in this repository; integration points are MA01 (runtime), MA02 (API auth), MA05 (contact provisioning), plus SMTP for delivery.

---

## Feature summary

| Goal | Detail |
|------|--------|
| **Audience** | **“New Signups”** — dynamic segment using **segment filters** (contact fields + rules), not manual list grooming |
| **Primary trigger** | Contact becomes eligible (e.g. added/updated by provisioning) and **matches the segment** → enter campaign |
| **First send** | **Immediate** (no intentional delay on the first email action) |
| **Optional follow-up** | **~7 days** after first send or after signup, with content for low engagement |
| **Branching** | **By engagement** (opens/clicks/tags/stage) using Mautic campaign **conditions / decisions** |
| **Compliance** | Unsubscribe, lawful basis / consent as required; GDPR-aligned list and preference handling |
| **Deliverability** | SPF / DKIM / DMARC on sender domain; monitor bounces and complaints |

---

## Prerequisites

| Prerequisite | Purpose |
|--------------|---------|
| **Admin login** | Create segments, emails, campaigns |
| **Mautic Admin UI** (e.g. `http://localhost:8080` in local dev) | All builder steps |
| **API credentials** | REST verification / optional automation (`MA02`, `MAUTIC_API_URL` + auth method) |
| **Contact provisioning** | `MA01` stack, `MA02` auth, `MA05` app → Mautic contact sync so new signups exist as contacts |
| **SMTP** | Production-grade sending (host, port, TLS, auth); dedicated sending domain recommended |
| **Sender identity** | From-name, from-address aligned with SPF/DKIM domain |

**Environment (reference — app integration, no Mautic DB edits):**

- `MAUTIC_API_URL` (or internal `MAUTIC_URL` doc convention = Mautic base URL used by operators and tools)
- API auth: token and/or OAuth client / Basic per `MA02`
- SMTP: provider host, credentials, envelope sender (often in Mautic **Configuration → Email Settings**)

No **application** database migrations or new REST endpoints are required for this feature; campaigns live in Mautic. Optional **webhooks** (Mautic → your app) can notify downstream systems; keep payloads minimal and authenticated.

---

## Security, privacy, and performance targets

| Area | Target / practice |
|------|-------------------|
| **DNS auth** | **SPF**, **DKIM**, **DMARC** published for the **mail-from** / signing domain |
| **Unsubscribe** | One-click / list-unsubscribe as supported; honored immediately |
| **GDPR** | Lawful basis documented; marketing only with **consent** or other valid grounds; data subject requests process |
| **Send latency** | First marketing action after trigger **&lt; 5 minutes** under normal cron/queue load |
| **Throughput** | Design lists/campaigns to respect **~100 contacts/hour** operational ceiling (cooling + segment design + cron) |
| **Deliverability** | **&gt; 95%** delivered (excluding invalid addresses); bounce handling active |
| **Spam score** | Content & infrastructure tuned so **spam score &lt; 5%** in common pre-send checks (e.g. Glock/Mail-Tester-style tools) |

---

## 1. Segment: “New Signups”

**Objective:** A **dynamic segment** (filter-based) that represents new signups your app can feed via MA05.

**Typical filters (adjust to your field names in Mautic):**

1. **Email** — not empty (and valid format if you use a regex/custom field rule Mautic supports).
2. **First name** — not empty *(optional if you allow single-name signups; relax if needed)*.
3. **Last name** — not empty *(optional)*.
4. **Date added** or **last active** — “within last **N** days” if you want to cap “newness” (e.g. 30 days).
5. **Tag or custom field** — e.g. `source=web_signup` if provisioning sets it — for **dynamic content / branching** later.

Use **AND** logic unless you intentionally widen the pool. **Rebuild** the segment after large imports (Mautic UI: rebuild / refresh per version).

**Name:** e.g. `New Signups` (alias: `new-signups`).

---

## 2. Emails (templates)

Create **Template** (or **Segment**) emails in **Channels → Emails** using the **official builder** (drag-and-drop or code). For each message:

| Area | Guidance |
|------|-----------|
| **Subject** | Personalized, e.g. `Welcome {contactfield=firstname} — get started`, test length and preheader |
| **Header** | Branded masthead (logo, brand colors); responsive width |
| **Body** | Short value story + proof; skimmable sections |
| **CTAs** | Primary + optional secondary; tracked links (Mautic) |
| **Footer** | Physical/sender address where required, **preferences** / **unsubscribe**, reason for mail |

**Tokens (examples — align aliases with your Mautic contact fields):**

- `{contactfield=firstname}`  
- `{contactfield=lastname}`  
- `{contactfield=email}`  
- **Registration / created date:** `{contactfield=...}` for your date field, or **Date Added** / custom field mapped at provisioning  

**Dynamic content:** use Mautic **dynamic content** blocks or segment-specific emails where **source** or **preference** fields differ (set those fields in MA05 provisioning).

**Localization-ready:** maintain **one email per locale** *or* dynamic blocks per language preference (custom field `locale=de`, etc.). Keep copy in sync with your [Paraglide] / content workflow outside Mautic.

---

## 3. Campaign: trigger → send → branch

**Campaigns → New** — attach to segment **`New Signups`**.

**Flow (conceptual):**

1. **Source:** Contacts **enter** segment `New Signups` (provisioning fills criteria).
2. **Action:** Send **Email A** (welcome) **immediately** (delay `0` or minimum supported step).
3. **Decision — engagement:**  
   - If **opened** OR **clicked** any tracked link → path **“engaged”** (e.g. send nurture tips, tag `engaged_welcome`).  
   - Else → path **“not engaged”**.
4. **Optional 7-day follow-up:** **Wait** `7 days` from Email A (or from segment entry — choose one consistently).  
   - **Engaged:** shorter re-engagement or product deep-dive.  
   - **Not engaged:** win-back / value reminder with new subject line.
5. **Further branching:** tags, **page visits** (if tracking enabled), **email** clicks, or **custom field** updates from your app via API (still **official** API only).

Publish the campaign only after **preview** and **test sends** succeed.

---

## 4. Optional webhooks

If you need app-side logs or CRM sync on **send / open / click / unsubscribe**, configure **Mautic webhooks** (supported UI feature) to HTTPS endpoints with secrets. Not required for the campaign to run.

---

## 5. Testing and success criteria

### Before go-live

| Check | Done when |
|-------|-----------|
| **Preview** | Renders in builder preview; mobile + desktop sanity check |
| **Test send** | Arrives in inbox (not spam) on ≥2 providers (e.g. Gmail, Outlook) |
| **Spam / content score** | Third-party check passes internal threshold; links tracked |
| **Variables** | All tokens resolve for a real test contact; fallback copy if empty |
| **Trigger** | Test contact placed in segment → campaign **Decision/History** shows entry and send |

### After publish

| Metric | Notes |
|--------|--------|
| **Opens / CTR / conversions** | Dashboard + UTM on CTAs |
| **A/B tests** | Subject or content variants; winner criteria defined |
| **Deliverability & complaints** | Bounce rate, spam complaints monitored |
| **Integration** | MA05 provisioning still creates/updates contacts; MA02/API health checks green |

**Success (definition of done):**

- Campaign **published**, segment filters correct.  
- **Personalized** test messages delivered; **triggers fire** when contacts qualify.  
- Templates render across common clients; **SPF/DKIM/DMARC** aligned.  
- **Unsubscribe / GDPR** paths work; optional 7-day branch and engagement splits behave as designed.  
- **App integration unchanged** (no rogue DB/API hacks).

---

## 6. Operational checklist (quick reference)

1. SMTP + From domain verified (SPF/DKIM/DMARC).  
2. Segment **New Signups** saved and populated by test contacts.  
3. Emails A (and B if used) saved, tokens verified.  
4. Campaign: enter segment → send → decisions → wait → follow-up; **published**.  
5. Cron/worker running (MA01) so events process within SLA.  
6. Monitor first 24–48h: delivery, opens, errors.

---

## Troubleshooting (short)

| Symptom | Where to look |
|---------|----------------|
| Contacts not in segment | Field aliases, filter AND/OR, segment rebuild, provisioning (MA05) |
| No send | Campaign published? Email published? Contact in segment? Cron? SMTP error log? |
| Wrong personalization | Token aliases vs field names; test contact data |
| Poor deliverability | DNS auth, sender reputation, content, list hygiene |

---

## Related documents

- `MA01-Mautic-Container-Setup.md` — runtime & health  
- `MA02` — API auth / credentials  
- `MA05-Mautic-Frontend-Connect.md` — contact provisioning  
- Email translation / localization process (e.g. AI02 / localization routes) — align copy with Paraglide locales  

---

## Additional context for implementers

- **Single source of truth for sends:** Mautic campaign + segment — avoid duplicating the same welcome in multiple systems.  
- **Branch by engagement** is the scalable pattern for 7-day and re-engagement tracks without spamming highly engaged users.  
- **100/hour** is an operational ceiling: split large imports, use staggered campaigns if needed.  
- All steps remain **repeatable in Admin UI**; use **REST/CLI** only as documented for exports, clones, or CI smoke tests — never raw DB.
