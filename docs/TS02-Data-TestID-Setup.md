# TS02 — Data TestID Attribute Setup (conventions & coverage)

Read **`TS00-Data-TestID-Primer.md`** first for the mental model (why test IDs, one-line rule). **This doc** is the full playbook: naming scheme, where to add attributes first, anti-patterns, and LLM instructions.

**Goal:** Make the UI stable for automation **without** coupling tests to translated strings, cosmetic CSS classes, or DOM depth.

This is the **foundation** for TS05 Playwright tests and any component tests that query the DOM.

---

## Principles

1. **`data-testid` is for tests only** — never use it for styling (`[data-testid]` in CSS is forbidden).
2. **Prefer meaningful, hierarchical names** — reflect feature + role, not implementation.
3. **One primary test id per logical control** — button, link, input, card, section root.
4. **Paraglide / i18n safe** — labels change per locale; **do not** use `getByText('Sign in')` as the only locator for critical flows once `data-testid` exists.
5. **Accessibility still required** — test IDs complement, not replace, `aria-*`, labels, and roles.

---

## Naming convention (required)

Use **kebab-case**, prefixed by area:

```
{area}-{component}-{role}
```

Examples:

| Element | Suggested `data-testid` |
|---------|-------------------------|
| Site header root | `shell-header` |
| Primary nav | `nav-primary` |
| Footer cookie settings button | `footer-cookie-settings` |
| Login submit button | `auth-login-submit` |
| Login email field | `auth-login-email` |
| Login password field | `auth-login-password` |
| Signup submit | `auth-signup-submit` |
| Pricing tier card (dynamic) | `pricing-tier-{tier}` e.g. `pricing-tier-pro` |
| Pricing subscribe button | `pricing-subscribe-{tier}` |
| Account subscription section | `account-subscription` |

For **lists**, include a stable key from data (`id`, `slug`, `tier`), not array index, when possible.

---

## Svelte 5 usage

Add attributes on the actual interactive node:

```svelte
<button type="submit" data-testid="auth-login-submit" class="btn btn-primary">
  {m.login_action_submit()}
</button>
```

```svelte
<input
  id="login-email"
  data-testid="auth-login-email"
  type="email"
  ...
/>
```

Avoid putting `data-testid` only on a wrapping `<div>` if the user clicks the `<button>` inside—put the id on the control that receives the action.

---

## Where to apply first (priority order)

1. **`src/routes/+layout.svelte`** — skip link, main landmark ties (optional ids on `Header` / `Footer` children).
2. **`src/lib/components/Header.svelte`** — nav links, auth CTAs.
3. **`src/lib/components/Footer.svelte`** — legal links, cookie settings control.
4. **Auth routes** — `login`, `signup`, `forgot-password` forms.
5. **`pricing/+page.svelte`** — plan cards and subscribe buttons.
6. **`account/+page.svelte`** — subscription block, portal buttons, profile forms.

CMS-driven pages should still expose ids on **layout chrome** and **interactive shells** (e.g. FAQ accordion triggers if tested).

---

## Anti-patterns

| Do not | Why |
|--------|-----|
| `page.locator('.btn-primary')` | Breaks when design tokens change |
| `getByText('Pricing')` alone | Breaks under locale switch |
| Duplicate ids on one route | Ambiguous locators |
| Test IDs on every `<span>` | Noise and maintenance |

---

## LLM instructions

When editing components:

1. Add **only** the attributes needed for planned tests (TS05).
2. Keep names **consistent** with the table patterns above.
3. Document new ids in the PR description (`Added data-testid ... for E2E`).
4. After adding ids, **update or add** Playwright tests to use `page.getByTestId('...')`.

---

## Verification

- Run TS05 tests (or a temporary Playwright spec) using **only** test IDs for those elements.
- Switch Paraglide locale in the app manually; the same test IDs should remain in the DOM.

---

*Previous: `TS00-Data-TestID-Primer.md` — Next: `TS03-Vitest-Setup.md`*
