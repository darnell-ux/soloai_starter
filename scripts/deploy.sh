#!/usr/bin/env bash
# VPS-side deploy: pull the deploy branch, rebuild the app image, roll the stack.
# Idempotent — safe to re-run. Invoked by .github/workflows/deploy.yml over SSH,
# or run by hand on the VPS from the repo root.
#
#   DEPLOY_BRANCH=main ./scripts/deploy.sh
#
# Prereqs on the VPS (one-time): docker + compose v2, a populated production .env,
# and TLS bootstrapped via scripts/init-letsencrypt.sh.
set -euo pipefail

ref="${DEPLOY_BRANCH:-main}"

echo "### Fetching ${ref} ..."
git fetch --all --tags --force --prune
# Resolve the deploy target: branches live under origin/<name>; tags and raw
# commits are used as-is (there is no origin/<tag>). This lets the release
# workflow deploy an exact tag (e.g. v1.0.0) while manual branch deploys still work.
if git show-ref -q --verify "refs/remotes/origin/${ref}"; then
  target="origin/${ref}"
else
  target="${ref}"
fi
git checkout -f "$ref"
git reset --hard "$target"

if [ ! -f .env ]; then
  echo "ERROR: production .env missing on the VPS. Copy .env.production.example -> .env and fill it." >&2
  exit 1
fi

echo "### Building images ..."
docker compose build app strapi

echo "### Rolling the stack ..."
docker compose up -d --remove-orphans

# Recreating app/strapi gives those containers NEW Docker network IPs, but
# nginx.conf proxies to the `app` / `strapi` hostnames with no `resolver`
# directive — so nginx resolves them once at config load and caches the result
# for the life of the process. A long-running nginx (it is not recreated by a
# deploy) therefore keeps proxying to the old, now-dead IPs and every request
# 502s. Reloading makes it re-resolve.
#
# This bit us on 2026-09-22: nginx had been up 7 weeks, the first successful
# rebuild in that window swapped the app container, and the whole site went 502
# while the app itself was healthy and listening on :3000.
echo "### Reloading nginx so it re-resolves upstreams ..."
if docker compose exec -T nginx nginx -t; then
  docker compose exec -T nginx nginx -s reload
else
  echo "ERROR: nginx config test failed; refusing to reload." >&2
  exit 1
fi

echo "### Pruning dangling images ..."
docker image prune -f

echo "### Deployed ${ref}. Live containers:"
docker compose ps
