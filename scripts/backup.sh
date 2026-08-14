#!/usr/bin/env bash
#
# Nightly MySQL backup for TaxNexus (Hostinger KVM2).
#
# Dumps the Dockerized MySQL server (all databases: mautic + strapi_db + grants)
# to a timestamped, gzip-compressed archive, then prunes archives older than the
# retention window.
#
# NO SECRETS IN THIS SCRIPT. The MySQL root password is read *inside* the db
# container from its own MYSQL_ROOT_PASSWORD environment variable (exported to
# MYSQL_PWD for the client), so it never appears in this file, in the host
# process list, or in shell history.
#
# Cron (installed on the VPS):
#   0 2 * * * /root/soloai_starter/scripts/backup.sh >> /var/log/taxnexus-backup.log 2>&1
#
# Manual run:
#   bash scripts/backup.sh
#
# Overridable via environment:
#   BACKUP_DIR      (default /root/backups)
#   DB_CONTAINER    (default taxnexus-db-1)
#   RETENTION_DAYS  (default 7)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/root/backups}"
DB_CONTAINER="${DB_CONTAINER:-taxnexus-db-1}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

timestamp="$(date +%Y%m%d-%H%M)"
archive="${BACKUP_DIR}/taxnexus-${timestamp}.sql.gz"
tmp="${archive}.partial"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Preflight: the db container must be running.
if ! docker ps --format '{{.Names}}' | grep -qx "${DB_CONTAINER}"; then
  echo "ERROR: db container '${DB_CONTAINER}' is not running." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

log "Starting backup -> ${archive}"

# Consistent (InnoDB) snapshot of everything. The password is expanded inside the
# container via MYSQL_PWD; nothing sensitive crosses the host boundary.
set -o pipefail
docker exec "${DB_CONTAINER}" sh -c '
  MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump \
    -uroot \
    --all-databases \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --events \
    --default-character-set=utf8mb4
' | gzip -c > "${tmp}"

# Guard against a truncated/empty dump before we publish the final name.
if [ ! -s "${tmp}" ]; then
  rm -f "${tmp}"
  echo "ERROR: dump produced an empty archive; aborting." >&2
  exit 1
fi

mv "${tmp}" "${archive}"
size="$(du -h "${archive}" | cut -f1)"
log "Backup complete: ${archive} (${size})"

# Retention: delete archives older than RETENTION_DAYS days.
log "Pruning backups older than ${RETENTION_DAYS} day(s) in ${BACKUP_DIR}"
deleted="$(find "${BACKUP_DIR}" -maxdepth 1 -name 'taxnexus-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')"
log "Pruned ${deleted} old archive(s)"

log "Current backups:"
ls -la "${BACKUP_DIR}"
