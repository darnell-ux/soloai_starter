# TS00 — Data TestID Primer (start here)

**Why:** Automated tests need stable hooks into the DOM. Visible labels change with **translations** and **design**; CSS classes change with **Tailwind refactors**. **`data-testid`** is an explicit contract for “what to click or assert,” independent of look and language.

**Rule:** Add `data-testid="…"` to the **same element the user interacts with** (button, input, link)—not a distant wrapper—using **kebab-case** names (`auth-login-submit`, `pricing-tier-pro`).

**Scope:** Testing only—never style or select in app CSS via `[data-testid]`.

**Tests:** Prefer `page.getByTestId('auth-login-submit')` in Playwright instead of `getByText('…')` for critical flows.

**Order:** Read this primer → apply **`TS02-Data-TestID-Setup.md`** (full naming map + file priorities) → then Vitest / Playwright docs.

**Next:** [`TS02-Data-TestID-Setup.md`](TS02-Data-TestID-Setup.md) · Index: [`TS01-Testing-Guide-Index.md`](TS01-Testing-Guide-Index.md)
