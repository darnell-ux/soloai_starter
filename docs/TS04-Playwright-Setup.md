# TS04 — Playwright E2E Testing Setup

**Goal:** Verify the app **as a user** in a real browser—routing, auth redirects, i18n, and critical flows—while keeping suites **parallel-safe** and **CI-ready**.

---

## Current configuration (nucamp_soloai)

- **Config:** `playwright.config.ts`
  - **`testDir`:** `e2e`
  - **`baseURL`:** `http://127.0.0.1:5173`
  - **`webServer`:** starts `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`
  - **`reuseExistingServer`:** `!process.env.CI` (local reuse OK)
  - **Retries:** `2` on CI, `0` locally
  - **Workers:** `1` on CI for stability
  - **Trace:** `on-first-retry`
  - **Project:** Desktop Chrome (`channel: 'chrome'`)

- **Scripts:** `npm run test:e2e` → `playwright test`

- **Existing specs:**  
  - `e2e/routes.spec.ts` — public routes, titles, `/account` redirect when signed out  
  - `e2e/pg03-language-switcher.spec.ts` — locale behavior

---

## Installation / system deps

CI must install browsers:

```yaml
- run: npx playwright install --with-deps chromium
```

(Adjust if you drop `channel: 'chrome'` and use bundled Chromium only.)

---

## Patterns to adopt

### Page objects (recommended as specs grow)

Place under `e2e/pages/` or `e2e/fixtures/`:

```ts
// e2e/pages/login.page.ts
import type { Page } from '@playwright/test';

export function loginPage(page: Page) {
	return {
		goto: () => page.goto('/login'),
		email: () => page.getByTestId('auth-login-email'),
		password: () => page.getByTestId('auth-login-password'),
		submit: () => page.getByTestId('auth-login-submit')
	};
}
```

Use **after** TS02 adds those test IDs.

### Fixtures for authenticated sessions

For logged-in flows, prefer:

- **Storage state:** login once in `globalSetup`, save `storageState`, reuse in projects; or  
- **Short-lived test user** created via API route / seed script (document secrets handling).

Do **not** commit real passwords or production URLs.

### Stability

- Avoid `page.waitForTimeout()` except when debugging.
- Use **`expect(locator).toBeVisible()`** and Playwright **auto-wait**.
- For multilingual routes, assert **`data-testid`** or **`toHaveURL`** patterns, not brittle copy.

---

## Environment variables

E2E runs against local dev server by default. If tests need **test doubles**:

- Stripe Checkout: use **Stripe test mode** keys only in isolated staging; or mock at network layer (`page.route`) for UI-only checks.
- Never point CI at production payment endpoints.

---

## CI recommendation

Extend `.github/workflows/ci.yml`:

```yaml
playwright:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: npm
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e
      env:
        CI: true
```

Ensure `validate-env` / dev dependencies allow the dev server to boot (provide minimal `PUBLIC_*` and auth paths if required).

---

## LLM instructions

1. **Do not** change `baseURL` or `webServer` without updating docs and CI.
2. **Prefer** `getByTestId` from TS02 for flow tests.
3. **Keep specs focused**—one scenario per `test()` when possible.
4. **Tag** slow tests (`test.slow()` or project tags) if checkout flows are added later.

---

## Commands reference

```bash
npm run test:e2e
npx playwright test e2e/routes.spec.ts
npx playwright show-report   # if HTML reporter added later
```

---

*Previous: `TS03-Vitest-Setup.md` — Next: `TS05-Write-Basic-Tests.md`*
