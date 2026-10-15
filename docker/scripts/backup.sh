#!/bin/bash
# ==============================================================================
# pdfkitfree — Automated Database & Persistent Storage Backup Script
# ==============================================================================
# Usage:
#   chmod +x backup.sh
#   ./backup.sh
# Cron (Daily at 02:00 UTC):
#   0 2 * * * /path/to/freepdfkit/docker/scripts/backup.sh >> /var/log/pdfkitfree_backup.log 2>&1
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/pdfkitfree"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=14

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] Starting pdfkitfree backup..."

# 1. Backup PostgreSQL Database
if docker ps --format '{{.Names}}' | grep -q "pdfkitfree_db"; then
    echo "Dumping PostgreSQL database..."
    docker exec -t pdfkitfree_db pg_dump -U "${POSTGRES_USER:-pdfkituser}" "${POSTGRES_DB:-pdfkitdb}" | gzip > "${BACKUP_DIR}/postgres_${TIMESTAMP}.sql.gz"
    echo "PostgreSQL dump completed: postgres_${TIMESTAMP}.sql.gz"
else
    echo "Warning: Container pdfkitfree_db is not running. Skipping DB dump."
fi

# 2. Backup Persistent Storage (.data directory containing user DB JSON & NDA records)
if docker volume inspect pdfkitfree_app_data >/dev/null 2>&1; then
    echo "Backing up persistent application volume (pdfkitfree_app_data)..."
    docker run --rm \
        -v pdfkitfree_app_data:/source:ro \
        -v "${BACKUP_DIR}:/backup" \
        alpine tar czf "/backup/app_data_${TIMESTAMP}.tar.gz" -C /source .
    echo "Application data backup completed: app_data_${TIMESTAMP}.tar.gz"
fi

# 3. Clean up backups older than retention period
echo "Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] Backup successfully completed!"
