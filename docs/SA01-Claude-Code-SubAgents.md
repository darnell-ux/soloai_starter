# SA01 — Claude Code Sub-Agents (Specialized AI Roles)

By introducing **sub-agents**, you avoid one monolithic assistant juggling UI, payments, security, and deployment in a single thread. Each mini-agent keeps a **focused role**, **clear rules**, and (optionally) **scoped tools**.

---

## What this file does

1. Explains **where** agents live and **how** they are formatted.
2. Documents **rules** (YAML frontmatter, `model: inherit`, tool defaults).
3. Points to **eight ready-made agents** under `.claude/agents/` for this repo.

This is **workflow tooling**, not a runtime app feature. It supports faster iteration, cleaner context, and less “pattern mixing” in a multilingual SaaS with many integrations.

---

## Folder layout

```
.claude/
  agents/
    database-prisma.md
    auth-security.md
    ui-component.md
    api-services.md
    payment-systems.md
    i18n-translation.md
    testing.md
    deployment-build.md
```

**Commit these files** so the whole team (and students) share the same specialist prompts.

---

## Agent file format

Each agent is a **Markdown file** with **YAML frontmatter** at the top, followed by the **system instructions** (what the specialist must prioritize, avoid, and reference in this codebase).

### Required frontmatter

| Field | Purpose |
|-------|---------|
| `name` | Short slug (matches filename stem). |
| `description` | When to invoke this agent (shown in picker / routing). |
| `model: inherit` | Use the same model as the parent Claude Code session. |

### Tools

- **Full access (default):** omit the `tools` key entirely so the agent can use the normal Claude Code toolset.
- **Read-only specialist:** restrict with:
  ```yaml
  tools: Read, Grep, Glob
  ```
  Use for audits where you want suggestions without auto-edits.

### Example skeleton

```markdown
---
name: example-agent
description: Use for concise one-line when-to-use guidance.
model: inherit
---

You are …
```

---

## The eight agents (summary)

| Agent file | Focus |
|------------|--------|
| `database-prisma.md` | Persistence: Prisma when adopted; today also JSON billing + SQLite auth patterns |
| `auth-security.md` | Better Auth, sessions, OAuth, webhook CSRF, secrets |
| `ui-component.md` | Svelte 5, Tailwind, DaisyUI, accessibility |
| `api-services.md` | `+server.ts`, validation, Strapi/OpenAI integrations |
| `payment-systems.md` | Stripe, Lemon Squeezy, webhooks, locale-based checkout |
| `i18n-translation.md` | Paraglide, `messages/*.json`, locale routing |
| `testing.md` | Vitest, Playwright, `data-testid`, docs TS00–TS05 |
| `deployment-build.md` | CI/CD, build, adapters, env validation |

---

## What you ask the LLM to do

When scaffolding or updating agents:

1. **Create** `.claude/agents/` if missing.
2. **Write** all eight `.md` files with valid frontmatter and strong system prompts.
3. Keep prompts **project-specific** (paths like `src/routes`, `src/lib/server`, `docs/TS02-…`).
4. Teach usage: *“Use the **testing** agent to add Playwright coverage for login.”*

---

## How to verify it worked

### Files

- [ ] `.claude/agents/` exists with **8** markdown files (names above).
- [ ] Each file starts with `---` YAML block containing `name`, `description`, `model: inherit`.
- [ ] Full-access agents **omit** `tools:` unless intentionally read-only.

### Behavior (sanity prompts)

- **Testing:** “Suggest three stable `data-testid` names for the login form per `docs/TS02`.”
- **deployment-build:** “List commands that should pass before merge (`npm run check`, tests, env validate).”
- **i18n-translation:** “Find user-visible English not routed through Paraglide in `src/routes`.”

Responses should **stay in role** (tests vs UI vs security vocabulary).

---

## Related docs

- `docs/TS01-Testing-Guide-Index.md` — testing workflow for the **testing** agent.
- `docs/REFACTORING-Master-Task-List.md` — evidence-based refactors after tests exist.

---

*Repository: nucamp_soloai · Sub-agents are Claude Code–oriented; adapt paths if your IDE uses a different agent format.*
