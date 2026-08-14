#!/usr/bin/env bash
#
# Restore a TaxNexus MySQL backup produced by scripts/backup.sh.
#
# Two modes:
#
#   1) STAGING / single-database (SAFE, default when a target db is given):
#        bash scripts/restore.sh <archive.sql.gz> <target_db>
#      Extracts one source database from the all-databases dump and loads it into
#      <target_db>, creating that schema if needed. Production databases are left
#      untouched. This is the mode used by the restore *test* (target
#      taxnexus_staging). Choose the source with SOURCE_DB (default: mautic).
#
#   2) FULL disaster recovery (DESTRUCTIVE — overwrites production):
#        CONFIRM=RESTORE bash scripts/restore.sh <archive.sql.gz>
#      Streams the entire dump back into the live server, recreating every
#      database exactly as captured. Requires CONFIRM=RESTORE to run.
#
# NO SECRETS IN THIS SCRIPT — same MYSQL_PWD-inside-the-container pattern as
# backup.sh.
#
# Overridable via environment:
#   DB_CONTAINER  (default taxnexus-db-1)
#   SOURCE_DB     (default mautic)  — which db to lift out of the dump in mode 1
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-taxnexus-db-1}"
SOURCE_DB="${SOURCE_DB:-mautic}"

archive="${1:-}"
target_db="${2:-}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

usage() {
  echo "Usage:" >&2
  echo "  bash scripts/restore.sh <archive.sql.gz> <target_db>          # staging/single-db (safe)" >&2
  echo "  CONFIRM=RESTORE bash scripts/restore.sh <archive.sql.gz>      # full DR (overwrites prod)" >&2
  exit 2
}

[ -n "${archive}" ] || usage
if [ ! -f "${archive}" ]; then
  echo "ERROR: archive not found: ${archive}" >&2
  exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -qx "${DB_CONTAINER}"; then
  echo "ERROR: db container '${DB_CONTAINER}' is not running." >&2
  exit 1
fi

# Run a mysql client statement inside the container (password via MYSQL_PWD).
mysql_exec() {
  docker exec -i "${DB_CONTAINER}" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$@"' _ "$@"
}

if [ -n "${target_db}" ]; then
  # ---- Mode 1: staging / single-database restore (production-safe) ----------
  log "STAGING restore: '${SOURCE_DB}' (from ${archive}) -> schema '${target_db}'"

  log "Creating target schema '${target_db}' if absent ..."
  mysql_exec -e "CREATE DATABASE IF NOT EXISTS \`${target_db}\` CHARACTER SET utf8mb4;"

  # Slice the single source database out of the --all-databases dump and strip its
  # CREATE DATABASE / USE lines so the tables land in <target_db> instead of prod.
  # We prepend FOREIGN_KEY_CHECKS=0: mysqldump's FK-disable pragma lives in the
  # file header (before the first database), which the slice deliberately skips —
  # without it, tables with cross-references (e.g. mautic's `leads`) fail to load
  # in dump order. Re-enabled at the end so the restored schema stays consistent.
  log "Loading '${SOURCE_DB}' tables into '${target_db}' ..."
  {
    echo 'SET FOREIGN_KEY_CHECKS=0;'
    echo 'SET UNIQUE_CHECKS=0;'
    gunzip -c "${archive}" \
      | sed -n "/^-- Current Database: \`${SOURCE_DB}\`/,/^-- Current Database: \`/p" \
      | grep -vE '^(CREATE DATABASE|USE )'
    echo 'SET FOREIGN_KEY_CHECKS=1;'
    echo 'SET UNIQUE_CHECKS=1;'
  } | docker exec -i "${DB_CONTAINER}" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$1"' _ "${target_db}"

  # Verify with a SELECT COUNT.
  table_count="$(mysql_exec -N -B -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${target_db}';")"
  log "Verification: schema '${target_db}' now has ${table_count} table(s)."
  if [ "${table_count}" -gt 0 ]; then
    log "RESTORE TEST PASSED — staging schema populated, production untouched."
  else
    echo "ERROR: staging schema '${target_db}' has no tables after restore." >&2
    exit 1
  fi
else
  # ---- Mode 2: full disaster-recovery restore (DESTRUCTIVE) -----------------
  if [ "${CONFIRM:-}" != "RESTORE" ]; then
    echo "REFUSING full restore without CONFIRM=RESTORE (this overwrites production)." >&2
    usage
  fi
  log "FULL restore from ${archive} into live server (all databases) ..."
  gunzip -c "${archive}" \
    | docker exec -i "${DB_CONTAINER}" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot'
  count="$(mysql_exec -N -B -e 'SELECT COUNT(*) FROM information_schema.schemata;')"
  log "Verification: server now has ${count} schema(s). FULL restore complete."
fi
