#!/bin/bash
# Dumps the para database to backups/ with a timestamp
set -e

BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

FILENAME="para_$(date +%Y%m%d_%H%M%S).sql"
DEST="$BACKUP_DIR/$FILENAME"

docker compose exec -T postgres pg_dump -U para para > "$DEST"

echo "Backup saved: $DEST ($(du -h "$DEST" | cut -f1))"
