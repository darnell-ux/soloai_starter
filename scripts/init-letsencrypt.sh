#!/usr/bin/env bash
# One-time TLS bootstrap for taxnexusapp.com (apex + www + cms).
#
# Solves the chicken-and-egg: nginx won't start without a cert, certbot can't
# issue a cert without nginx serving the ACME challenge. We seed a throwaway
# self-signed cert, start nginx, then replace it with a real Let's Encrypt cert.
#
# Run ONCE on the VPS, from the repo root, after `docker compose build`:
#   EMAIL=you@example.com ./scripts/init-letsencrypt.sh
# Re-running is safe; renewals are handled by the long-running certbot service.
set -euo pipefail

domains=(taxnexusapp.com www.taxnexusapp.com)
# cms.taxnexusapp.com must be in the cert whenever it's live: nginx serves a cms
# vhost and the app hairpins server-to-Strapi via https://cms.taxnexusapp.com
# (STRAPI_API_URL). But including a domain with no DNS fails the whole ACME request,
# so decide automatically:
#   INCLUDE_CMS unset/auto -> include cms only if it currently resolves (safe default)
#   INCLUDE_CMS=1          -> force include (use once DNS is confirmed)
#   INCLUDE_CMS=0          -> force exclude
cms_host="cms.taxnexusapp.com"
case "${INCLUDE_CMS:-auto}" in
  1) domains+=("$cms_host"); echo "### Including ${cms_host} (INCLUDE_CMS=1)." ;;
  0) echo "### Excluding ${cms_host} (INCLUDE_CMS=0)." ;;
  *) if getent hosts "$cms_host" >/dev/null 2>&1; then
       domains+=("$cms_host")
       echo "### ${cms_host} resolves — including it in the certificate."
     else
       echo "### ${cms_host} has no DNS record — issuing apex+www only (set INCLUDE_CMS=1 to force)."
     fi ;;
esac
primary="taxnexusapp.com"
email="${EMAIL:-}"          # required for expiry notices
staging="${STAGING:-0}"     # set STAGING=1 to test against LE staging (avoids rate limits)
rsa_key_size=4096

compose() { docker compose "$@"; }
cert_path="/etc/letsencrypt/live/${primary}"

if [ -z "$email" ]; then
  echo "ERROR: set EMAIL=you@example.com before running." >&2
  exit 1
fi

echo "### Seeding a dummy certificate for ${primary} ..."
compose run --rm --entrypoint "\
  sh -c 'mkdir -p ${cert_path} && \
  openssl req -x509 -nodes -newkey rsa:${rsa_key_size} -days 1 \
    -keyout ${cert_path}/privkey.pem \
    -out ${cert_path}/fullchain.pem \
    -subj /CN=localhost'" certbot

echo "### Starting nginx ..."
compose up --force-recreate -d nginx

echo "### Deleting dummy certificate ..."
compose run --rm --entrypoint "\
  sh -c 'rm -rf /etc/letsencrypt/live/${primary} \
    /etc/letsencrypt/archive/${primary} \
    /etc/letsencrypt/renewal/${primary}.conf'" certbot

echo "### Requesting the real Let's Encrypt certificate ..."
domain_args=""
for d in "${domains[@]}"; do domain_args="${domain_args} -d ${d}"; done
staging_arg=""; [ "$staging" != "0" ] && staging_arg="--staging"

compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    ${staging_arg} ${domain_args} \
    --email ${email} --rsa-key-size ${rsa_key_size} \
    --agree-tos --no-eff-email --force-renewal" certbot

echo "### Reloading nginx ..."
compose exec nginx nginx -s reload

echo "### Done. https://${primary} is now serving a real certificate."
