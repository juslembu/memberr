#!/usr/bin/env bash
set -euo pipefail

# Dumps the Memberr Postgres database to a timestamped, gzipped file and
# prunes dumps older than RETENTION_DAYS. Safe to run manually or via cron.
#
# Usage: ./scripts/backup.sh [backup-dir] [retention-days]
#   backup-dir       default: ./backups
#   retention-days   default: 14

cd "$(dirname "$0")/.."

BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${2:-14}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUP_DIR/memberr-$TIMESTAMP.sql.gz"

docker compose exec -T postgres bash -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$OUT_FILE"

echo "Backup written to $OUT_FILE"

find "$BACKUP_DIR" -name 'memberr-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
