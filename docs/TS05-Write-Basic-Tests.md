# TS05 — Write Basic Tests (Auth, UI, Payments preparation)

**Goal:** Turn setup (TS02–TS04) into **real coverage** on the flows that protect **revenue and trust**: authentication shell, navigation, pricing/checkout entry points, and account visibility—**without** flaky coupling to layout CSS or translations.

---

## Preconditions

- [ ] TS00 understood; TS02 `data-testid` attributes exist for elements you assert (auth form, pricing buttons, account sections).
- [ ] `npm run test:unit -- --run` passes.
- [ ] `npm run test:e2e` passes with current specs.

---

## Priority matrix (build in this order)

| Priority | Flow | Unit (Vitest) | E2E (Playwright) |
|----------|------|---------------|------------------|
| P0 | Signed-out user cannot access `/account` | — | Already partially covered in `e2e/routes.spec.ts` |
| P0 | Login form validates presence / error states | Optional helpers | Submit invalid credentials → error UI via **test IDs** |
| P1 | Signup happy path (test DB / ephemeral user) | — | Requires TS02 ids + test env |
| P1 | Pricing page shows plans when env configured | Pricing helpers | Visible cards / subscribe buttons by **test ID** |
| P2 | Checkout **redirect** starts (Stripe test mode or mocked route) | Mock POST handlers | `page.route` or skip if no keys in CI |
| P2 | Account page shows subscription section when billing JSON seeded | billing-store helpers | Optional with fixture user |

---

## Auth tests (patterns)

### E2E — login failure (no secrets committed)

```ts
import { expect, test } from '@playwright/test';

test('login shows error for invalid credentials', async ({ page }) => {
	await page.goto('/login');
	await page.getByTestId('auth-login-email').fill('nobody@example.com');
	await page.getByTestId('auth-login-password').fill('wrong-password');
	await page.getByTestId('auth-login-submit').click();
	await expect(page.getByRole('alert')).toBeVisible();
});
```

### E2E — redirect preservation

Already aligned with `redirectTo` query; extend with:

```ts
await page.goto('/pricing');
// click login from pricing-specific CTA when test ID exists
// expect URL to contain redirectTo after login attempt
```

---

## UI / layout tests

- Header: logo/home link, auth state (sign in vs dashboard)—use **test IDs** on header controls.
- Footer: legal links navigate—can keep role-based locators **if** link text is stable **or** add `data-testid` per TS02.
- Language switcher: extend `e2e/pg03-language-switcher.spec.ts`; after locale change, **re-query** by test ID, not previous locale string.

---

## Payments (realistic scope)

**Full Stripe Checkout completion in E2E** is optional and environment-heavy. Recommended incremental approach:

1. **Unit:** webhook dedupe, tier mapping, provider resolution (`paymentProcessorForLocale`).
2. **E2E level A:** Pricing page loads; subscribe buttons **disabled** or **enabled** based on fixture env—assert **navigation intent** (button visible + test ID).
3. **E2E level B:** Intercept `POST **/api/stripe/checkout` with `page.route` and return `{ url: 'https://example.com fake' }` to assert client handles redirect **without** leaving CI network—document as contract test.
4. **Manual / staging:** complete once with Stripe test keys.

Never assert production card charges in automated CI without isolated test accounts.

---

## Fragile patterns to avoid

| Pattern | Instead |
|---------|---------|
| `expect(page.getByText('Subscribe')).toBeVisible()` | `getByTestId('pricing-subscribe-pro')` |
| Fixed `waitForTimeout(3000)` | `expect(...).toBeVisible()` / expect navigation |
| One giant test | Arrange ** Arrange login ** / **pricing** / **account** in separate `test()` blocks |
| Shared browser state without isolation | Independent contexts or serial tests only when documented |

---

## TDD workflow reminder

1. **Red:** write failing Playwright or Vitest test describing desired behavior.
2. **Green:** minimal implementation (or add `data-testid` only).
3. **Refactor:** clean up with tests still green.

For bugs: **regression test first**, then fix.

---

## Definition of done (TS05)

- [ ] Auth routes use **test IDs** in E2E assertions.
- [ ] Pricing critical CTAs use **test IDs**.
- [ ] No E2E depends solely on English visible strings for P0/P1 flows.
- [ ] New Vitest tests exist for any **pure logic** extracted during payment/auth work.
- [ ] CI job plan documented (even if not merged yet) in TS03/TS04.

---

## LLM instructions

1. **Read** existing `e2e/*.spec.ts` before adding duplicates.
2. **Extend** incrementally; prefer **new file** `e2e/auth.spec.ts` over bloating `routes.spec.ts` when scenarios multiply.
3. **Never** embed API secrets in tests; use env vars from CI secrets.
4. When TS02 ids are missing, **add TS02 first** in the same PR as tests.

---

*Previous: `TS04-Playwright-Setup.md` — Index: `TS01-Testing-Guide-Index.md`*
