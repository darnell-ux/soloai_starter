# LA03 — TaxNexus Deploy Runbook (feat/field-dossier → https://taxnexusapp.com)

Concrete steps to take the field-dossier site live. Built pieces:
adapter-node + `Dockerfile.app`, an `app` compose service, nginx TLS routing,
Let's Encrypt via certbot, and an SSH deploy (`scripts/deploy.sh` + `.github/workflows/deploy.yml`).

## Topology
- `https://taxnexusapp.com` (+ `www`) → nginx :443 → `app:3000` (SvelteKit/adapter-node)
- `https://cms.taxnexusapp.com` → nginx :443 → `strapi:1337`
- `:80` → ACME challenge + 301 to https
- Mautic → nginx `:8082` (internal admin; no public TLS this iteration)
- One LE cert covers apex + www + cms.

## Why a `cms.` subdomain
The env validator (`src/lib/server/env.ts`) requires `STRAPI_API_URL` to be **HTTPS in
production**, so the app cannot talk to `http://strapi:1337`. It uses
`https://cms.taxnexusapp.com` (hairpins back through nginx).

## DNS (do first — propagation takes time)
A records → VPS IP for: `taxnexusapp.com`, `www.taxnexusapp.com`, `cms.taxnexusapp.com`.

## One-time VPS setup
1. Install Docker + compose v2. Open ports 80, 443 (and 8082 only if you want Mautic admin reachable).
2. Clone the repo to `/opt/taxnexus` (matches `BASE_PATH` / `VPS_APP_DIR`).
3. `cp .env.production.example .env` and fill **real** values. Hard gates: `NODE_ENV=production`,
   `STRAPI_API_URL` (https), `DATABASE_URL` (mysql), `BETTER_AUTH_SECRET` ≥32, and any set secret ≥32.
4. Create the app's MySQL DB if you use Prisma at runtime (DATABASE_URL points at `soloai_db`).

## Merge + deploy sequence
```bash
# 1. Merge the feature branch to the deploy branch (main).
git checkout main && git pull
git merge --no-ff feat/field-dossier
git push origin main            # CI runs; on success the deploy workflow fires (if VPS secrets set)

# 2. FIRST deploy only — bootstrap TLS on the VPS (nginx can't start without a cert).
ssh user@vps
cd /opt/taxnexus
git fetch && git checkout main && git reset --hard origin/main
docker compose build app strapi
EMAIL=you@example.com ./scripts/init-letsencrypt.sh   # add STAGING=1 first to dry-run
docker compose up -d                                   # full stack up

# 3. Subsequent deploys — automatic via GitHub Actions, or manual:
DEPLOY_BRANCH=main ./scripts/deploy.sh
```

## GitHub Actions secrets (for auto-deploy)
`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (private key), `VPS_APP_DIR` (e.g. `/opt/taxnexus`).
Without these, deploy by running `scripts/deploy.sh` on the VPS by hand.

## Verify
```bash
curl -I https://taxnexusapp.com         # 200, valid cert
curl -I https://cms.taxnexusapp.com      # Strapi
docker compose ps                        # app/nginx/strapi/db healthy
```

## Notes / follow-ups
- `docker-compose.yml` top-level anchor key was renamed `Trx-soloai-volumes` → `x-soloai-volumes`
  (the old name failed `docker compose config` on compose v2.20+; pre-existing bug).
- `BETTER_AUTH_TRUSTED_ORIGINS` includes apex + www so auth works on both hosts.
- Cert auto-renews via the `certbot` service; nginx reloads every 6h to pick up new certs.
- Build args inline `PUBLIC_STRAPI_URL` into the client bundle — change the domain there if it ever moves.
