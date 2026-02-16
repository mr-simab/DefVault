#!/usr/bin/env bash

# Minimal audit logs backup script for local development.
# Usage: BACKUP_DIR=./backups PGHOST=localhost PGUSER=postgres PGPASSWORD=yourpass ./scripts/backupAuditLogs.sh

BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/audit_logs_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "Exporting audit_logs to $BACKUP_FILE"
# Use DATABASE_URL if provided, otherwise rely on pg_dump env vars
if [ -n "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" -t audit_logs -f "$BACKUP_FILE"
else
    pg_dump -t audit_logs -f "$BACKUP_FILE"
fi

if [ $? -ne 0 ]; then
    echo "Backup failed" >&2
    exit 1
fi

gzip -f "$BACKUP_FILE"
echo "Backup completed: ${BACKUP_FILE}.gz"

# Cleanup backups older than 30 days
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -print -delete
echo "Old backups cleaned"
