#!/usr/bin/env bash
set -euo pipefail

# Restores the Memberr Postgres database from a gzipped dump produced by
# backup.sh. This OVERWRITES all data in the running database.
#
# Usage: ./scripts/restore.sh path/to/memberr-20260706-120000.sql.gz

cd "$(dirname "$0")/.."

DUMP_FILE="${1:?Usage: ./scripts/restore.sh <dump-file.sql.gz>}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "File not found: $DUMP_FILE" >&2
  exit 1
fi

read -r -p "This will overwrite the current database. Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

gunzip -c "$DUMP_FILE" | docker compose exec -T postgres bash -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "Restore complete."
