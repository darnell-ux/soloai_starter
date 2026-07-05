#!/usr/bin/env bash
# App-only deploy of origin/main + post-deploy verification (VPS-side).
#
# Surgical: fast-forwards to origin/<branch> and rebuilds ONLY the `app`
# container — Strapi and MySQL are left running untouched. Use this for
# app-code changes (e.g. chat grounding). For infra or Strapi changes, use
# scripts/deploy.sh instead (which rebuilds app + strapi).
#
# Run from the repo root on the VPS:
#   bash scripts/verify-deploy.sh
# Optional overrides:
#   DEPLOY_BRANCH=main                        branch to deploy (default: main)
#   VERIFY_BASE_URL=https://taxnexusapp.com   URL the checks hit (default: prod)
#
# Prereqs: docker + compose v2, a populated production .env, TLS bootstrapped.
# On a VM without public DNS, set VERIFY_BASE_URL or add /etc/hosts entries;
# the checks use `curl -k` so a self-signed / staging cert won't fail them.
set -euo pipefail

branch="${DEPLOY_BRANCH:-main}"
base_url="${VERIFY_BASE_URL:-https://taxnexusapp.com}"
# -k tolerates a self-signed / Let's Encrypt staging cert on a VM; no-op in prod.
curlq=(curl -sk --max-time 20)

if [ ! -f .env ]; then
  echo "ERROR: production .env missing. Copy .env.production.example -> .env and fill it." >&2
  exit 1
fi

# --- Guard: refuse to pull over a dirty tree (tracked changes block a fast-forward;
#     untracked files like *.bak do not, so they are ignored here). -----------------
echo "### Checking working tree ..."
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "ERROR: tracked local changes present — 'git pull' won't fast-forward." >&2
  echo "       Commit/stash them, or run scripts/deploy.sh (hard reset) instead." >&2
  git status --short
  exit 1
fi

echo "### Fast-forwarding ${branch} ..."
git fetch origin "$branch"
git merge --ff-only "origin/${branch}"
echo "    HEAD is now $(git rev-parse --short HEAD)"

echo "### Rebuilding the app image ..."
docker compose build app

echo "### Restarting app only (db + strapi untouched) ..."
docker compose up -d --no-deps app

echo "### Waiting for the app to respond ..."
# Poll for a real 200 (nginx returns 502 while the app boots); up to ~60s.
code=""
for _ in $(seq 1 60); do
  code="$("${curlq[@]}" -o /dev/null -w '%{http_code}' "${base_url}/" || echo 000)"
  [ "$code" = "200" ] && break
  sleep 1
done
if [ "$code" = "200" ]; then
  echo "    app is up (200)"
else
  echo "    (app not 200 after 60s, last=${code:-none} — see logs below)"
fi

echo
echo "=== Verification ==========================================================="

echo "### nginx config test"
docker compose exec -T nginx nginx -t 2>&1 | sed 's/^/    /' || true

echo "### Containers"
docker compose ps

echo "### API checks (against ${base_url})"
check() { # label  method  path  [json-body]
  local label="$1" method="$2" path="$3" data="${4:-}" code
  if [ -n "$data" ]; then
    code="$("${curlq[@]}" -o /dev/null -w '%{http_code}' -X "$method" "${base_url}${path}" \
      -H 'content-type: application/json' -d "$data" || echo ERR)"
  else
    code="$("${curlq[@]}" -o /dev/null -w '%{http_code}' "${base_url}${path}" || echo ERR)"
  fi
  printf '    %-30s %s\n' "$label" "$code"
}
check "app home (want 200):"          GET  "/"
check "chat empty body (want 400):"   POST "/api/chat"            '{"messages":[]}'
check "assess (want 200):"            POST "/api/taxnexus/assess" '{"sales":0,"inventory":1,"entityType":"LLC"}'

if [ "${SKIP_CHAT_PROBE:-0}" = "1" ]; then
  echo "### Grounding probe skipped (SKIP_CHAT_PROBE=1)"
else
  echo "### Grounding probe (sends ONE real chat message — a small Anthropic call)"
  # Fire a real question so a 'completed' turn is logged with a groundedDocs count.
  "${curlq[@]}" -N -o /dev/null -X POST "${base_url}/api/chat" \
    -H 'content-type: application/json' \
    -d '{"messages":[{"role":"user","content":"Do I owe California sales tax if Amazon stores my inventory in a CA warehouse?"}]}' || true
  sleep 1
  # The [chat] log is a multi-line object; -A8 grabs the fields after the marker.
  echo "    latest [chat] fields:"
  if ! docker compose logs --tail=80 app 2>/dev/null \
      | grep -A8 '\[chat\]' | grep -E 'groundedDocs|tokens|kind' | tail -3 | sed 's/^/      /'; then
    echo "      (no [chat] log captured — try a manual curl)"
  fi
fi

echo
echo "### Done."
echo "    groundedDocs >= 1 -> grounding is live."
echo "    groundedDocs = 0  -> chat works but is ungrounded: confirm ANTHROPIC_API_KEY"
echo "                         is set AND Strapi has PUBLISHED FAQ entries."
