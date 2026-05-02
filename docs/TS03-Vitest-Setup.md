# TS03 — Vitest Unit Testing Setup

**Goal:** Run **fast**, **deterministic** tests for logic under `src/lib` (especially server-side helpers) without booting a browser or calling live paid APIs.

This repo already uses **Vitest** with a `$lib` alias. The AI must extend—not replace—that setup.

---

## Current configuration (nucamp_soloai)

- **Config:** `vitest.config.ts`
  - `$lib` → `src/lib`
  - **Include:** `src/**/*.{test,spec}.{js,ts}`
  - **Exclude:** `e2e`, `node_modules`, `dist`, `.svelte-kit`
- **Scripts:** `package.json`
  - `npm run test:unit` — Vitest watch mode
  - `npm run test` — unit (`--run`) then Playwright

---

## What to unit test

| Test | Examples in repo |
|------|------------------|
| Pure functions | Tier mapping, normalization, comparison helpers |
| Parsing / validation | Webhook signatures, env-dependent guards **via injected deps** |
| Idempotent logic | Dedupe keys, status mapping |
| Small modules with mocks | Stripe/Lemon dispatch when Stripe SDK is mocked |

### Prefer **not** to unit test (without extra tooling)

- Full Svelte components (use Playwright or add `@testing-library/svelte` only if the course requires it).
- Full SvelteKit `load` functions in isolation—prefer testing extracted pure helpers or E2E.

---

## Mocking rules

1. **No live network** in unit tests for Stripe, Lemon, Strapi, Mautic, OpenAI.
2. Mock `fetch`, or pass **injectable** clients into functions under test.
3. **Secrets:** never import real `.env`; use `vi.stubEnv` sparingly and reset in `afterEach`.
4. **Filesystem:** billing JSON under `data/`—tests should use temp dirs or mock `fs` if testing persistence (today most tests target pure logic).

---

## File placement

- Colocate: `src/lib/server/foo/bar.ts` → `src/lib/server/foo/bar.test.ts`
- Or sibling `*.spec.ts`—both match `vitest.config.ts` include pattern.

Existing examples: `src/lib/server/**/*.test.ts` (Stripe, Lemon, Mautic, billing).

---

## Coverage (optional enhancement)

Coverage is **not** configured by default. To add:

```bash
npm i -D @vitest/coverage-v8
```

Then extend `vitest.config.ts` with `coverage: { provider: 'v8', reporter: ['text', 'html'] }` and a `test:coverage` script. Treat coverage as a **signal**, not a target to game.

---

## CI recommendation

Add to `.github/workflows/ci.yml` (alongside existing jobs):

```yaml
- run: npm ci
- run: npm run check
- run: npm run test:unit -- --run
```

Use `NODE_ENV: test` and minimal env vars so `validate-env` and app bootstrap succeed.

---

## LLM instructions

1. **Read** `vitest.config.ts` before proposing changes.
2. **Mirror** existing test style (Vitest `describe` / `it`, TypeScript).
3. **Add tests** when fixing bugs (regression first) or when TS05 identifies untested pure logic.
4. **Do not** duplicate E2E scenarios in Vitest—keep unit tests small.

---

## Commands reference

```bash
npm run test:unit              # watch
npx vitest run                 # single run (same as npm run test:unit -- --run)
```

---

*Previous: `TS02-Data-TestID-Setup.md` — Next: `TS04-Playwright-Setup.md`*
