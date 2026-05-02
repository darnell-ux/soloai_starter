# MA06 — Create the First Branded Welcome Email (Mautic 5.0+)

## IMPORTANT: OFFICIAL INTERFACES ONLY

Use **only** supported Mautic **5.0+** mechanisms:

- **Web UI** — Channels → Emails, drag-and-drop / WYSIWYG builder, media library, send test, preview  
- **REST API** / **CLI** — only for documented operations (e.g. export, duplicate) if needed  

Do **not** edit Mautic PHP, raw config on disk, or the **database directly** to create emails or assets. All templates, blocks, From/sender settings, and media references must be created through the Admin UI (or official API/CLI as documented).

**No new application environment variables** are required for this task — only existing Mautic access (Admin UI, optional existing `MAUTIC_*` usage from MA02 as already configured).

---

## Audience & owners

| Role | Need |
|------|------|
| **New users (recipients)** | Clear greeting, value, one primary action, trust & support |
| **Marketing & product managers (builders)** | Repeatable template, brand-safe layout, measurable CTAs, compliance |

**Draft copy:** use your standard **AI Vibe Coding** / writing assistant (outside Mautic) to produce first drafts for each section, then **edit for brand, accuracy, and length** before pasting into the builder.

---

## Dependencies

| Dependency | Check |
|------------|--------|
| **Mautic container** running | See `MA01-Mautic-Container-Setup.md` |
| **Admin access** | Login to Mautic (e.g. `http://localhost:8080` in dev) |
| **Campaign infra** | Segment/campaign plan exists or will use this template — see `MA03-Mautic-Create-Campaign.md` (**New Signups**) |

---

## Path: create a Template email

1. **Channels → Emails → New**  
2. Choose **Template** (reusable; campaigns attach this email to actions).  
3. Open the **builder** — **drag blocks** (text, image, button, divider, social, etc.) in the **WYSIWYG** / layout editor (official Mautic 5+ email builder).

### Global email settings

| Setting | Guidance |
|---------|-----------|
| **From name / From address** | Use a **verified** sender on a domain with **SPF** and **DKIM** (and **DMARC** policy). Match what you configure under **Configuration → Email Settings** / mail transport. |
| **Subject** | Personalized, e.g. `Welcome, {contactfield=firstname} — you’re in` |
| **Preheader** | Complement the subject; visible in inbox previews; avoid repeating the subject verbatim |

Save frequently as **Draft** until tests pass.

---

## Content blocks (in order)

Build top-to-bottom with **mobile-first** reading: single column where possible; tap-friendly CTA.

1. **Header** — Logo (upload via **Media** / image block); brand color band optional; keep **HTTPS** links only.  
2. **Greeting** — One short line using tokens (below).  
3. **Value** — Why they signed up / core benefit in **plain language** (see word budget).  
4. **Next steps** — Bulleted or 2 short lines (get started, complete profile, explore X).  
5. **Primary CTA** — Single prominent button → **HTTPS** destination (app, docs, or tracked Mautic link).  
6. **Support** — One line (help email, help center link — HTTPS).  
7. **Compliant footer** — Physical address / entity identification if required by law; **unsubscribe** / preference language; link to **privacy** policy.

---

## Contact tokens (from contact fields)

Use the **exact** aliases your Mautic install uses (adjust field aliases if yours differ).

- **First name:** `{contactfield=firstname}`
- **Last name:** `{contactfield=lastname}`
- **Email:** `{contactfield=email}`
- **Registration / added date (formatted):** `{contactfield=date_added|date('M j, Y')}` — if your field alias differs (e.g. custom registration date), use that field instead; verify with a real contact.

**Tip:** Send **test** messages to contacts that have all fields populated so tokens don’t render empty.

---

## Media & links

- **Logo / images:** upload through Mautic **Media**; serve over **HTTPS**; **optimize** files (see budget below).  
- **All links:** `https://` only; avoid redirects that strip tracking if you rely on Mautic click tracking.

---

## Guidelines & performance targets

| Guideline | Target |
|-----------|--------|
| **Copy length** | **Under ~200 words** total body (excluding footer legal boilerplate if required). |
| **Layout** | **Mobile-first**; readable font size; sufficient contrast (WCAG-minded). |
| **Images** | **≤ ~200 KB total** image payload where possible for this template. |
| **HTML size** | Aim **≤ ~100 KB** template HTML for simpler clients and faster loads. |
| **Perceived load** | Aim **&lt; ~3 s** feel on fast desktop preview; **&lt; ~5 s** on typical mobile — avoid huge images and deep nesting. |
| **Accessibility** | Meaningful **alt text** on images; button text that states action (not “click here” only). |
| **Deliverability** | **SPF / DKIM** aligned to From domain; **unsubscribe** present and working; **privacy** link as per your policy. |

---

## Test → publish → integrate

### Testing (before publish)

1. **Save** draft.  
2. **Send test** to internal inboxes (Gmail, Outlook, mobile client).  
3. **Preview** desktop and **mobile** (builder preview + real devices).  
4. Run content through your **spam-score** check (third-party or Mautic-adjacent tools); target **spam score &lt; 5** (tool-dependent scale).  
5. Confirm **tokens** populate for a real contact record.

### Publish

1. Mark email **Published** when satisfied.  
2. Attach this template to the **New Signups** campaign flow in `MA03` (campaign action → send this email).  
3. Verify one end-to-end path: qualifying contact enters segment → email sends → links and unsubscribe work.

---

## Success criteria

- [ ] Template created via **Channels → Emails → New → Template** using **drag blocks** / WYSIWYG only.  
- [ ] **Verified From** + **personalized subject** + **preheader** set.  
- [ ] Sections present: **header, greeting, value, next steps, primary CTA, support, compliant footer**.  
- [ ] **Tokens** resolve correctly in test sends.  
- [ ] Renders acceptably **cross-device**; **HTTPS** links; image/HTML budgets respected.  
- [ ] **Unsubscribe / privacy** and **SPF/DKIM** practices aligned.  
- [ ] Published and wired to **New Signups** campaign path; ready for production sends.

---

## Related

- `MA01-Mautic-Container-Setup.md` — runtime  
- `MA02` — API credentials (no new env vars for this doc)  
- `MA03-Mautic-Create-Campaign.md` — **New Signups** campaign wiring  
