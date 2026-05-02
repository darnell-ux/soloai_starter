# TS01 — Testing Implementation Guide (Index / Roadmap)

This pack teaches **Test-Driven Development (TDD)** discipline for this SaaS app: stable selectors first, fast unit tests, realistic end-to-end coverage, and CI-friendly automation—without inventing a parallel testing philosophy.

The AI (or human) implementing tests **must follow the order below**. Skipping steps produces flaky suites (e.g. E2E coupled to translated strings or CSS classes).

---

## Document map

| Doc | Purpose |
|-----|---------|
| **TS01** (this file) | Roadmap, success criteria, LLM rules |
| **TS00** — `TS00-Data-TestID-Primer.md` | Short “why + rule” for `data-testid` (read first) |
| **TS02** — `TS02-Data-TestID-Setup.md` | Full naming conventions, priorities, anti-patterns |
| **TS03** — `TS03-Vitest-Setup.md` | Unit / integration-style tests for `src/lib` with Vitest |
| **TS04** — `TS04-Playwright-Setup.md` | Browser E2E with Playwright |
| **TS05** — `TS05-Write-Basic-Tests.md` | First priority flows (auth, UI shell, payments prep) |

---

## Correct order of operations

1. **TS00 — Primer**  
   Understand why test IDs exist and the one-line rule (kebab-case, on interactive nodes).

2. **TS02 — Test IDs (detailed)**  
   Apply naming patterns and priority file list across the app. Complete before TS05 E2E selectors.

3. **TS03 — Vitest**  
   Cover pure logic, server helpers, serializers, and transforms under `src/lib` (and API helpers) with fast tests. Mock HTTP and secrets; never hit live Stripe/Lemon/Strapi in unit tests unless using recorded fixtures.

4. **TS04 — Playwright**  
   Confirm config (`playwright.config.ts`), base URL, webServer command, and CI assumptions. Add fixtures/page objects as complexity grows.

5. **TS05 — Basic E2E + smoke**  
   Exercise critical paths using **only** `data-testid` or accessibility roles that remain stable across locales.

---

## What “success” looks like

- **`npm run test:unit -- --run`** passes locally and in CI (when wired).
- **`npm run test:e2e`** passes against `npm run dev` (or CI webServer).
- Selectors in tests use **`getByTestId(...)`** or stable **roles + accessible names** where test IDs are inappropriate (e.g. page `<title>` checks).
- Changing **theme classes**, **Paraglide strings**, or **component structure** does not break tests **as long as** behavior and test IDs are preserved.
- New features add tests **with** or **before** implementation when practicing strict TDD.

---

## LLM role: testing engineer, not blind codegen

Across TS02–TS05, the model must:

1. **Understand strategy and order** — never generate Playwright suites that depend on visible English copy before TS02 is done.
2. **Modify the app for testability** — add `data-testid` per TS02 rules.
3. **Align with repo tooling** — Vitest (`vitest.config.ts`), Playwright (`playwright.config.ts`, `e2e/`), npm scripts in `package.json`.
4. **Reflect real user behavior** — navigates like a user; avoids implementation-detail selectors.
5. **Avoid fragile patterns** — no sleeps for timing; use Playwright auto-wait; no real payment APIs in unit tests.

The model **must not** invent a different stack (Jest-only, Cypress-only, etc.) unless the human explicitly requests migration.

---

## Integration with CI and revenue protection

Automated tests guard **auth**, **billing flows**, and **localized UX**. Extend `.github/workflows/ci.yml` with jobs such as:

- `npm run check`
- `npm run test:unit -- --run`
- `npm run test:e2e` (with Playwright browser install step)

Until CI runs tests on every PR, treat **`npm test`** as the merge gate locally.

---

## Validation checklist (“did the prompt pack work?”)

- [ ] Team read TS00; key surfaces follow TS02 naming (TS00 + TS02).
- [ ] Unit tests target **`src/**/*.{test,spec}.ts`** and exclude `e2e/` (TS03).
- [ ] E2E tests live under **`e2e/`** and use **`baseURL`** from Playwright config (TS04).
- [ ] Critical flows in TS05 use test IDs, not Tailwind class strings.
- [ ] Tests still pass after **style-only** or **translation-only** changes when IDs and behavior are unchanged.

---

## Related internal docs

- `docs/REFACTORING-Master-Task-List.md` — safe refactors after tests exist.

---

*Repository: nucamp_soloai (SvelteKit + Paraglide + Vitest + Playwright).*
