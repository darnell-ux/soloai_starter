# Founder guide: fix production settings, pass the build check, and decide what to do about translation safety (`check`)

This guide is written for someone who owns the product but does not live in code. Use it yourself with your hosting dashboards, or hand it to a contractor and ask them to “tick every box.”

---

## Important ideas (said simply)

### 1. “Environment variables” = labeled slots on the server

Imagine your live app as a vending machine. Each **labeled slot** holds one secret code or web address your app reads when it starts. Your hosting company shows this under names like **Environment variables**, **Config vars**, or **Secrets**.

Nothing here should be pasted into regular email or chat—only into those secure slots.

### 2. You have **two kinds** of guards

| Guard | What it is | When it bites |
|--------|------------|----------------|
| **Production build checker** | The app refuses to compile the “real customer” version until production rules are satisfied. Your project loads this whenever the build tool starts (production mode). | **Deploy / `npm run build`** when the host marks the build as production. Typical error: Strapi URL must use a **secure** address (`https://`), not plain `http://`. |
| **Optional “translation + types” checker** (`npm run check`) | A separate tool that catches mismatches between **screen text keys** (Paraglide / `messages/*.json`) and **what pages ask for**. | When you or CI run `npm run check`. |

They are **not** the same. Fixing one does not always fix the other.

### 3. Your GitHub “CI” workflow (today)

In this repository, automation on pushes to `main` currently runs:

- Secret scanning basics (`check:secrets`)
- **`validate-env`** with **test-mode** looseness (`NODE_ENV: test`)

It does **not** currently run `npm run check`. So translation/type issues might still exist even when CI is green—that is a **policy choice** you can change later.

---

## Part A — Fix production settings so the **build validator** is happy

Treat this as ordered. If someone gets stuck on a row, pause and fix it before skipping ahead.

### Step A1 — Decide your real web addresses

- [ ] Write down your **live site**: `https://your-domain.com`
- [ ] Write down your **live Strapi (CMS)** address copy-pasted from Strapi hosting: **must** match `https://...` when you are building for production (padlock-safe URL).
- [ ] Save your **hosted database** connection string from the database provider.

### Step A2 — Fill the hosting dashboard (production)

In your deployment platform, set **Production** (not preview) slots. Names below match your app’s checklist file **`.env.example`** and validator logic.

**Never use `localhost` for production.**

**Core production requirements (these stop “expected HTTPS …” style failures):**

| Slot name (technical label) | In plain English | What you enter |
|-----------------------------|------------------|----------------|
| `NODE_ENV` | “Which world is this?” | Use what your platform sets for production (often automatic). Only if asked: `production`. |
| `STRAPI_API_URL` | “Where does the server talk to the CMS?” | Full Strapi URL, **https**, no trailing guessing—copy from your Strapi host. |
| `PUBLIC_STRAPI_URL` | “Where can **visitors’ browsers** load CMS assets?” | Normally the **same** secure Strapi base URL unless your setup splits internal vs public. |
| `DATABASE_URL` | “How does the server log into MySQL?” | One paste-in line from your database host (looks like `mysql://user:...@host.../dbname`). |

**Strongly needed for login to behave on the real domain:**

| Slot name | In plain English | What you enter |
|-----------|------------------|----------------|
| `BETTER_AUTH_SECRET` | Long random secret for sessions | Treat like a passphrase: random, **at least ~32 characters** (password manager “generate”). |
| `BETTER_AUTH_URL` | The app’s **public front door** | Your live site URL, **https**. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | “Which URLs may use login securely?” | Comma-separated list of exact live URLs (e.g. `https://your-domain.com,https://www.your-domain.com`). |

**If you use them, complete the **whole** set or leave **all** empty:**

- **Stripe** — if any Stripe slot is filled, **all** Stripe-related required slots must be filled (keys, webhook secret, success/cancel URLs). Those URLs must be **https** and point to real pages on your site.
- **Lemon Squeezy** — same idea: all required Lemon slots or none.
- **Mautic** — if you connect it, you must finish **one** login method (token **or** OAuth pair **or** username+password) without mixing.

**Short secrets:** if you set any “secret key” style value in production, very short passwords can be rejected. Prefer long random values.

### Step A3 — Prove the settings file is accepted

Ask your technical helper to run on a machine that has **the same** production-style values loaded:

```bash
NODE_ENV=production npm run validate-env
```

- [ ] Command finishes with **no red error lines** (exit code 0).

Then run a real compile:

```bash
NODE_ENV=production npm run build
```

- [ ] Build finishes successfully.

If it fails, read the **first clear sentence** of the error (often names the slot, e.g. “STRAPI_API_URL: expected HTTPS URL in production”) and fix that **one** slot in the dashboard, redeploy, repeat.

---

## Part B — `npm run check`, Paraglide, and your **CI policy**

### What `check` means in one breath

`svelte-kit sync` plus `svelte-check` walks the codebase and blows the whistle when, for example, a screen asks for translated text **`login_heading`** but the English phrase book (`messages/en.json`) never defined that label—or when generated translation glue is stale.

Those problems **do not** always block `vite build`; they block **confidence** and **automated QA** when you enable `check` in pipelines.

### Path 1 — **Fix Paraglide / translations** (recommended long term)

Goal: after `npm install`, **`npm run check`** exits clean.

Rough division of labor:

**You / founder:**

- [ ] Keep a priority list of languages you truly ship (`project.inlang` lists many locales—you can still focus shipping quality on fewer).
- [ ] Approve wording for any new screens.

**Contractor:**

- [ ] Add every missing phrase key used in `.svelte` files to **`messages/*.json`** (starting with **`messages/en.json`**).
- [ ] Run **`npm run check`** locally until errors drop to zero.
- [ ] Commit the updated JSON **and** the regenerated output under **`src/lib/paraglide/`** produced by tooling (normally refreshed by **`svelte-kit sync`**, **`npm run build`**, or dev server with the Paraglide plugin—your repo already wires this in `vite.config.ts`).

**Success definition:**

```bash
npm run check
```

- [ ] Reports **0 errors**.

### Path 2 — **Policy: CI does not run `check` yet** (this repo today)

Because `.github/workflows/ci.yml` currently **does not** call `npm run check`, merging can stay green **while translation debt exists**.

Decision checklist:

| If you… | Then… |
|---------|--------|
| Need speed now and accept some translation drift | Keep CI as-is; track “fix Paraglide” as a dated ticket; still run **`npm run build`** before each release. |
| Want automation to mirror quality | After `npm run check` is clean locally, **add `npm run check`** as a CI step alongside existing jobs. |

To add CI strictness later, a developer edits **`.github/workflows/ci.yml`** to include `npm run check` **after** the Paraglide errors are solved—otherwise every push will fail and feel demoralizing.

### Path 3 — Middle ground (“only warn me”)

Some teams keep `check` manual (before releases) rather than blocking every pull request. That is legitimate if you document: “release checklist includes `npm run check` passing.”

---

## One-page readiness checklist for you personally

### Production slots (blocking real builds)

- [ ] `STRAPI_API_URL` uses **https** (production)
- [ ] `PUBLIC_STRAPI_URL` uses **https** when set (production)
- [ ] `DATABASE_URL` filled with hosted MySQL string
- [ ] Login slots: **`BETTER_AUTH_SECRET`** long enough, **`BETTER_AUTH_URL`** = live **https** site
- [ ] Trusted origins lists real customer URLs only
- [ ] Stripe: **all-or-nothing** and **https** checkout return URLs  
- [ ] Lemon: **all-or-nothing** and **https** checkout return URLs  
- [ ] **`NODE_ENV=production npm run validate-env`** succeeds  
- [ ] **`NODE_ENV=production npm run build`** succeeds  

### Translation / `check` (quality gate—choose policy)

- [ ] `npm run check` passes **before** turning on CI enforcement  
- [ ] Decide: CI runs `check` or only humans run it before release  
- [ ] If CI should enforce: add **`npm run check`** to **`ci.yml`** only after zero errors  

### Policy alignment reminder

- [ ] Understand: **GitHub CI today** validates env in **test** mode (looser)—**production builds** remain stricter. Do not confuse “green CI” with “production deploy slots are finished.”  

---

## When to call paid help

Call a developer if:

- Builds still fail after you pasted values (often a tiny typo or wrong database format).
- `npm run check` shows hundreds of Paraglide lines—fine to delegate regen + JSON parity.
- You need **CI** tightened without breaking teammate workflows.

Give them:

- Access to hosting secrets (role-based, minimal)
- This document
- A copy of `.env.example` from the repo root
