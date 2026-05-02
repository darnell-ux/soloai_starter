# A08 — Page Transitions (Route UX)

**Goal:** Subtle **fade / slide** between SvelteKit routes so the SaaS feels polished without hurting performance, accessibility, or integrations (auth, Strapi, Paraglide).

This doc is the **spec** for humans and LLMs. Implementation lives in `src/lib/components/PageTransition.svelte` and `src/routes/+layout.svelte`.

---

## What “good” feels like

- **Duration:** ~**200–300ms** total perceived transition (implemented ~260ms in / ~200ms out).
- **Motion:** Lightweight **opacity + small vertical translate** (`transform` + `opacity` → GPU-friendly).
- **Navigation:** Never **block** routing; avoid long `await` chains before rendering the outlet.
- **Mobile:** Keep work minimal—no layout thrash; `contain: layout style` on the transition shell.
- **Core Web Vitals:** Target **≤ ~300ms** interaction feel; route transition overhead **&lt; ~100ms** CPU beyond baseline (measure in Lighthouse when enabled).

---

## Accessibility (required)

1. **`prefers-reduced-motion: reduce`** — animations become **instant** (duration `0`); no forced movement.
2. **Focus** — On **client-side** navigations only, move focus to **`#main-content`** (`focus({ preventScroll: true })`) so keyboard and SR users land in the main landmark. Skip auto-focus on **first paint** (`afterNavigate` when `from` is missing).
3. **Skip link** — Unchanged; must still jump to `#main-content` and show focus styles (`app.css` `.skip-link`).
4. **Keyboard-only** — Header/footer links and main content remain tab-order correct; transition wrapper must not use `pointer-events: none` during nav.
5. **Screen readers** — Prefer **focus management** + semantic `<main>` over noisy `aria-live` on every route (avoids duplicate announcements with browser history).

---

## Integration constraints

| Area | Requirement |
|------|-------------|
| **Auth / protected routes** | Redirects (`/account` → `/login`) must not flash protected content; transitions apply only to the rendered outlet after navigation resolves. |
| **Strapi / loading** | Page-level loading belongs in **route** `+page.svelte`; transition does not replace skeletons or suspense—avoid “empty flash” by keeping transitions short. |
| **Paraglide / i18n** | Route keys use **pathname + search**, not visible text; no selectors tied to copy. |
| **Analytics** | Optional future hook (e.g. transition end → `dataLayer`); not required for v1. |

---

## Feature flag & preferences

- **Server flag:** `PUBLIC_PAGE_TRANSITIONS_ENABLED=true` enables transitions for the session payload. Default when unset: **off** (safe for existing deploys).
- **Local override (client):** `localStorage.setItem('pageTransitionsOff', '1')` disables motion **even if** the flag is on (power users / debugging). Remove key or set to `0` to re-enable.
- **Reduced motion** always wins over the flag and localStorage.

No new APIs or databases.

---

## Where code plugs in

1. **`src/routes/+layout.server.ts`** — Exposes `pageTransitionsEnabled` from env.
2. **`src/routes/+layout.svelte`** — Wraps `{@render children()}` in `PageTransition` when enabled; merges **`afterNavigate`** for analytics + focus.
3. **`src/lib/components/PageTransition.svelte`** — `{#key routeKey}` + `fly` transition, duration tied to reduced motion / flag / localStorage.
4. **`src/app.css`** — Optional `.page-transition-root` containment (performance).

---

## Verification checklist

- [ ] Navigate `/` → `/pricing` → `/features` — consistent subtle fade/slide.
- [ ] Feels fast — no noticeable “stall” before navigation.
- [ ] OS **Reduce motion** on — transitions effectively **disabled** (instant).
- [ ] Logged out → `/account` — redirect to login **clean**, no broken transition shell.
- [ ] Slow Strapi page — loading UI still sensible; transition doesn’t look “stuck”.
- [ ] Change locale + navigate — transitions still work; no English-only assumptions.
- [ ] Skip link → focus enters main; tab order unchanged.

---

## Future (not v1)

- User setting UI for “Reduce interface motion” synced to `localStorage`.
- View Transitions API where supported, with CSS fallback.
- Analytics event `page_transition_complete` (debounced).

---

*Related: `docs/TS02-Data-TestID-Setup.md` (tests must not depend on transition wrappers).*
