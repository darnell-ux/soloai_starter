# REFACTORING — Master Task List & Repo Audit Prompt

Refactoring keeps the codebase scalable, reduces maintenance cost, and increases velocity by removing hidden complexity before bugs compound.

This document does two things:

1. **Master task list** — How to catalogue tech debt, prioritize by risk and ROI, and ship refactors safely.
2. **LLM audit specification** — A strict prompt you can paste into an AI coding tool so it analyzes **this** SvelteKit repository and returns an **evidence-based refactor backlog** (not generic advice).

---

## Non-negotiable: commit before you refactor

**Make a git commit (on a branch) before starting any refactor work.**  
If the refactor goes wrong, you can reset or revert. Tiny PRs + a clean baseline make bisection and rollback possible.

Suggested flow:

1. `git checkout -b refactor/<short-topic>`
2. `git add -A && git commit -m "chore: baseline before refactor <topic>"` (or commit current WIP intentionally)
3. Implement the smallest vertical slice; commit again.
4. Run automated tests + quick manual smoke before merge.

---

## Master task list (catalogue tech debt)

Use this table (copy rows as needed) to track debt. Prioritize by **risk × impact** and **ROI** (time saved, incidents prevented).

| ID   | Area            | Summary | Risk | ROI | Owner | Status | PRs | Tests attached | Rollback / monitor |
|------|-----------------|--------|------|-----|-------|--------|-----|----------------|--------------------|
| DEBT-001 | … | … | H/M/L | H/M/L | … | backlog | … | unit / e2e / manual | … |

**Per item, enforce:**

- Break work into **small PRs** (one concern per PR).
- **Automated tests** (extend existing Vitest/Playwright); **manual smoke** checklist for routes you touched.
- **Lint + format** (`npm run check`, `npm run lint` when the toolchain is healthy).
- **Performance / regression** — note any `load` that got heavier, bundle imports, or new `fetch` waterfalls.
- **Docs** — one line in PR description: what changed, why, how to verify.
- **Recurring** — e.g. monthly “refactor window” to burn down backlog.

**Tips**

- Attach tests and **ROI notes** to each task.
- Keep PRs **tiny and measurable** (reviewable in &lt; 15–20 minutes when possible).
- Automate **alerts** for regressions (CI failures, error rate, core user flows) where you have hosting.

---

## LLM prompt: full-repository SvelteKit refactor audit

Paste the block below into your AI tool. **Constraint:** the model must **not** propose changing Svelte **runes**, **stores**, or broad **reactivity** architecture. Focus on **routing**, **server/client boundaries**, **providers** (auth, env, data loaders), **validation**, **security**, **caching**, **performance**, and **structural duplication**.

````markdown
You are a senior engineer auditing a SvelteKit (Svelte 5) codebase. Read the repository comprehensively: `src/routes`, `src/hooks.server.ts`, `src/lib/server`, `src/lib` (shared client-safe code), `src/app.html`, env handling, API routes, and tests.

### Goals
1. Produce a **real** summary tied to **this** repo’s routes, loaders, and patterns—not generic SvelteKit advice.
2. Enumerate issues with **evidence**: file paths, optional line ranges or short snippets, and **why** it matters (security, correctness, perf, maintainability).
3. For each issue: **concrete fix** (minimal diff or canonical SvelteKit pattern), **priority** (P0 security/correctness → P1 perf/architecture → P2 DX/cleanup), and **estimated PR size** (S/M/L).
4. Output an **exhaustive Refactor Backlog Table** suitable for engineering work.

### Out of scope (do not suggest)
- Rewriting state management: **no** changes to runes usage patterns, global stores, or reactivity model “for cleanliness.”
- Opinion-only style (pure formatting preferences without risk).

### Architectural areas to inspect
- **Routing**: duplicated or overlapping routes, `+page`/`+layout`/`+server` consistency, `prerender`/`ssr` flags, error boundaries.
- **Loaders**: `+page.server.ts` / `+layout.server.ts` — validation, early returns, leakage of secrets into `PageData`, unnecessary serializable payload.
- **Server/client boundary**: `import` of Node-only or server-only modules into client components; `export const ssr` / `csr` misuse; accidental browser-only APIs in server files.
- **Providers / auth**: session handling, cookie usage, redirects, CSRF-related config on webhooks, trusted origins.
- **Env & secrets**: `process.env` vs `PUBLIC_*`, validation at startup (`getEnv`), logging that could leak secrets.
- **API routes**: input validation, rate limits, idempotency, error shapes.
- **Caching & data fetching**: duplicate fetches, missing cache headers, Strapi or external API patterns.
- **Security**: CSP hooks, webhook signature verification, HTML injection (`{@html}`), authz on server actions.
- **Performance**: large client bundles, sync work in `load`, N+1 patterns, heavy dependencies in shared modules.
- **Tests & CI**: missing coverage on critical paths; flaky e2e.

### Output format (mandatory)

#### A) Executive summary (max 15 bullet points)
Must reference **actual** route ids or file paths from this repo.

#### B) Refactor Backlog Table
Every row **must** include:

| ID | Priority | Area | Problem (1–2 sentences) | Evidence (path[:line-range]) | Recommendation | PR size | Tests to add/update |
|----|----------|------|-------------------------|------------------------------|----------------|---------|---------------------|

Rules:
- **Unique ID** per row: `REFACT-001`, …
- **No vague rows** (forbidden: “improve performance” without a hotspot path and metric).
- If consolidation is proposed, name **exact routes or functions** to merge and the **canonical** implementation path.

#### C) Security & correctness appendix
Bullet list: only items with **file path + concrete risk** (e.g. missing validation on POST body).

#### D) Performance appendix
Bullet list: only items with **path + mechanism** (blocking `load`, duplicate fetch, bundle concern).

#### E) Migration / rollout
For the top 5 P0/P1 items: ordered steps, rollback (revert PR / feature flag), and what to **monitor** after deploy.

### Quality bar (“prompt worked” if…)
- Summary is **repo-specific** (names real routes/modules).
- Backlog table is **complete** relative to repo size (no hand-waving).
- Every issue maps **problem → recommendation** with evidence.
- **Zero** suggestions violate the out-of-scope constraint above.
````

---

## How you know the prompt “worked”

The AI output should:

- Mention **your** routes, loaders, and libs—not only SvelteKit docs links.
- Include a **Refactor Backlog Table** with IDs, paths, line hints, and test notes.
- Avoid vague performance rows; tie hotspots to **files** and **behaviors**.
- Call out **secrets, env, unsafe imports, or auth gaps** with paths when present.
- Respect **no runes / stores / reactivity rewrites** as a hard constraint.

If the model drifts into style-only nits, re-send the **Out of scope** and **Quality bar** sections.

---

## Where this fits (stabilization & scaling)

- **Solo founder / small team** — structured backlog when you lack always-on senior review.
- **AI-assisted development** — recenters boundaries and prevents architectural drift after fast iteration.
- **Learning** — teaches evidence-based backlog, prioritization, and safe incremental delivery.

---

## Optional: attach ROI to each backlog row

Example note field: *“Prevents mis-billed users; saves ~2h/incident debugging webhook drift.”*  
Tie ROI to **incident risk**, **support time**, or **onboarding time** for new contributors.

---

*Last updated: template for nucamp_soloai. Update the “Paste” block if your stack constraints change.*
