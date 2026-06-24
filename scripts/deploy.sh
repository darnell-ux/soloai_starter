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

branch="${DEPLOY_BRANCH:-main}"

echo "### Fetching ${branch} ..."
git fetch --all --prune
git checkout "$branch"
git reset --hard "origin/${branch}"

if [ ! -f .env ]; then
  echo "ERROR: production .env missing on the VPS. Copy .env.production.example -> .env and fill it." >&2
  exit 1
fi

echo "### Building images ..."
docker compose build app strapi

echo "### Rolling the stack ..."
docker compose up -d --remove-orphans

echo "### Pruning dangling images ..."
docker image prune -f

echo "### Deployed ${branch}. Live containers:"
docker compose ps
