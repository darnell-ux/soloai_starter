# TaxNexus — Production Deploy Runbook

First-time production bootstrap + ongoing deploys for the SvelteKit app + Strapi
CMS + nginx/TLS + MySQL + Mautic stack on the Hostinger KVM2, via Docker Compose.

> This runbook orchestrates tooling that already lives in the repo:
> `scripts/init-letsencrypt.sh` (TLS bootstrap), `scripts/deploy.sh` (roll the
> stack), `npm run validate-env` / `check:secrets`, and `.github/workflows/deploy.yml`
> (SSH deploy on push to `main`). For the "why" behind the env slots, see
> `docs/FOUNDER-PRODUCTION-READINESS.md`.

The stack (from `docker-compose.yml`): `db` (MySQL), `nginx` (80/443/8082),
`strapi`, `app` (SvelteKit adapter-node, :3000), `certbot`, and `mautic_*`.
`nginx` serves `taxnexusapp.com` → app and `cms.taxnexusapp.com` → Strapi, both
under one Let's Encrypt cert. The app reaches Strapi over HTTPS via
`https://cms.taxnexusapp.com` (hairpins through nginx) — so **cms must be in the
cert**.

---

## Phase 0 — VPS prerequisites (one-time)

- Docker Engine + Compose v2 installed (`docker compose version`).
- The repo cloned on the VPS (e.g. `/opt/taxnexus`), on `main`.
- Ports 80/443 open to the internet; port 22 for your SSH.

```bash
git clone https://github.com/darnell-ux/soloai_starter.git /opt/taxnexus
cd /opt/taxnexus
```

## Phase 1 — DNS (do this first; TLS depends on it)

Point these A records at the VPS public IP. Propagation can take minutes to hours —
**verify before Phase 4.**

| Record | Type | Value |
|---|---|---|
| `taxnexusapp.com` | A | `<VPS_IP>` |
| `www.taxnexusapp.com` | A | `<VPS_IP>` |
| `cms.taxnexusapp.com` | A | `<VPS_IP>` |

Verify from the VPS:

```bash
for h in taxnexusapp.com www.taxnexusapp.com cms.taxnexusapp.com; do
  echo -n "$h -> "; getent hosts "$h" | awk '{print $1}' | head -1 || echo "NO DNS"
done
```

> If `cms` isn't resolving yet, the TLS step will issue apex+www only and the app's
> CMS calls will fail (content missing) until you add DNS and re-run TLS. The site
> still boots.

## Phase 2 — Secrets + `.env`

```bash
cp .env.production.example .env
```

Generate strong values and paste them into `.env`. **Two flavors** — use URL-safe
hex for anything embedded in a URL (the DB password), base64 for opaque secrets:

```bash
# Opaque secrets (>=32 chars) — BETTER_AUTH_SECRET, JWT_SECRET, ADMIN_JWT_SECRET,
# APP_KEYS, API_TOKEN_SALT, TRANSFER_TOKEN_SALT, STRAPI_WEBHOOK_SECRET, TRANSLATION_API_TOKEN
openssl rand -base64 32

# DB passwords — hex is URL-safe (no / + = @) so it won't break DATABASE_URL
openssl rand -hex 24      # MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD
```

**Consistency rules (these bite people):**

- `DATABASE_URL=mysql://<MYSQL_USER>:<MYSQL_PASSWORD>@db:3306/<db-name>` — the
  password in the URL must be **exactly** `MYSQL_PASSWORD`, and the user/host/db
  must match the `MYSQL_*` values. Keep the DB password URL-safe (hex above).
- `ORIGIN`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` = your real
  `https://taxnexusapp.com` origins.
- `STRAPI_API_URL` / `PUBLIC_STRAPI_URL` = `https://cms.taxnexusapp.com`.
- `NODE_ENV=production`.

**Deferred to Phase 6 (created inside Strapi, not pre-generated):**
`STRAPI_API_TOKEN`. Leave it as-is for now; the app boots without it (public
content types still load). You'll mint it in the Strapi admin after first boot.

**Chatbot (optional but recommended):** set `ANTHROPIC_API_KEY=sk-ant-…` so
`/api/chat` works; without it the widget returns 503 and the rest of the site is
fine.

**Billing (optional):** if you enable Stripe or Lemon Squeezy, **all** vars for
that provider must be set (partial config fails validation). Otherwise leave them
commented out.

## Phase 3 — Validate before building

```bash
docker compose config -q            # compose syntax
npm run validate-env                # if node is on the VPS; else the build/boot enforces it
npm run check:secrets               # no placeholder/low-entropy secrets left
```

The env validator is a **hard gate**: the app image build and container boot both
call it and exit non-zero on any missing/invalid required var.

## Phase 4 — TLS bootstrap (one-time)

Dry-run against Let's Encrypt **staging** first to avoid rate limits, then issue
the real cert. `cms` is auto-included when it resolves (our fix); force with
`INCLUDE_CMS=1` once DNS is confirmed.

```bash
# 1) staging dry run
EMAIL=you@yourdomain.com STAGING=1 bash scripts/init-letsencrypt.sh

# 2) real cert (cms auto-included if its DNS resolves)
EMAIL=you@yourdomain.com bash scripts/init-letsencrypt.sh
# ...or force cms in once you've confirmed its A record:
EMAIL=you@yourdomain.com INCLUDE_CMS=1 bash scripts/init-letsencrypt.sh
```

Renewals are automatic (the long-running `certbot` service runs `certbot renew`
every 12h).

## Phase 5 — Build + start the stack

```bash
docker compose build app strapi
docker compose up -d --remove-orphans
docker compose ps
```

(Equivalent one-shot: `DEPLOY_BRANCH=main bash scripts/deploy.sh`.)

## Phase 6 — Strapi admin + API token

1. Create the Strapi admin at `https://cms.taxnexusapp.com/admin` (first visit).
2. Settings → **API Tokens** → create a token (read-only is enough for the app's
   content fetches).
3. Put it in `.env` as `STRAPI_API_TOKEN=…`, then restart the app so it picks it up:

```bash
docker compose up -d --no-deps app
```

4. Seed/publish content types (see `docs/strapi-content-types.md` and the `md/SP*`
   guides) so the homepage has hero/FAQ/feature content.

## Phase 7 — Verify

```bash
# app + security headers
curl -sSI https://taxnexusapp.com/ | head -20

# chatbot endpoint (expects 400 on empty body, 200 stream on a real message)
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://taxnexusapp.com/api/chat \
  -H 'content-type: application/json' -d '{"messages":[]}'

# nexus assess API (extension backend) — expect 200 + JSON, X-Request-Id header
curl -sS -D - -X POST https://taxnexusapp.com/api/taxnexus/assess \
  -H 'content-type: application/json' \
  -d '{"sales":0,"inventory":1,"entityType":"LLC"}' | head -20

# CMS admin reachable over TLS (no cert error)
curl -sSI https://cms.taxnexusapp.com/admin | head -5

docker compose logs --tail=50 app strapi nginx
```

Green = app returns 200, chat streams, assess returns JSON with `X-Request-Id`,
`cms` has a valid cert, and no container is restarting.

---

## Ongoing deploys

- **Automated:** pushing to `main` triggers `.github/workflows/deploy.yml`, which
  SSHes to the VPS and runs `scripts/deploy.sh` (git reset to `origin/main`,
  rebuild `app`+`strapi`, `up -d`). Confirm the workflow's required repo secrets
  (SSH host/user/key) are set in GitHub → Settings → Secrets.
- **Manual:** on the VPS, `DEPLOY_BRANCH=main bash scripts/deploy.sh`.

`deploy.sh` is idempotent and refuses to run if `.env` is missing.

## Rollback

```bash
git reset --hard <previous-good-sha>
docker compose build app strapi && docker compose up -d
# app-data (Better Auth SQLite) and mysql-data volumes persist across deploys.
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| App container exits immediately at boot | Missing/invalid required env (hard gate) | `docker compose logs app` shows the offending key; fix `.env`, `up -d` |
| `STRAPI_API_URL: expected HTTPS URL in production` | `STRAPI_API_URL` not `https://` | must be `https://cms.taxnexusapp.com` |
| TLS/cert error on `cms.taxnexusapp.com` | cms not in the cert (DNS wasn't set when TLS ran) | add DNS, re-run `EMAIL=… INCLUDE_CMS=1 bash scripts/init-letsencrypt.sh` |
| Homepage loads but no CMS content | app can't reach Strapi over HTTPS (cms cert/DNS) or no `STRAPI_API_TOKEN` | fix cms cert/DNS; add the API token (Phase 6) |
| ACME issuance fails for the whole cert | a domain in the set has no DNS | remove it / set DNS; `INCLUDE_CMS=0` to exclude cms temporarily |
| `/api/chat` returns 503 | `ANTHROPIC_API_KEY` unset | set it in `.env`, `up -d app` |
| DB auth failures | `DATABASE_URL` password ≠ `MYSQL_PASSWORD`, or special chars in URL | regenerate DB password as hex; keep URL and `MYSQL_PASSWORD` identical |

## Secret rotation

The repo ships rotation tooling: `npm run rotate-secret`, plus
`scripts/secret-rotation-scheduled.ts` / `secret-rotation-on-demand.ts`. Rotate
on any suspected exposure; `.env` is git-ignored and must never be committed.
