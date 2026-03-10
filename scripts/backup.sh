#!/bin/bash
# Hermes Ouroboros daily backup script
# Backs up sessions, users, models, trajectories
# Keeps last 7 days, rotates older

BACKUP_DIR=/opt/hermes/backups
DATA_DIR=/opt/hermes/data
DATE=2026-03-10_1412
KEEP_DAYS=7

mkdir -p $BACKUP_DIR

ARCHIVE="$BACKUP_DIR/hermes-backup-$DATE.tar.gz"

tar czf "$ARCHIVE"     -C /opt/hermes     data/sessions     data/users     data/models     data/trajectories     data/skills     .env     config.yaml     2>/dev/null

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$ARCHIVE" | cut -f1)
    echo "[$(date)] Backup created: $ARCHIVE ($SIZE)"
else
    echo "[$(date)] ERROR: Backup failed"
    exit 1
fi

# Rotate: delete backups older than KEEP_DAYS
find $BACKUP_DIR -name 'hermes-backup-*.tar.gz' -mtime +$KEEP_DAYS -delete 2>/dev/null
REMAINING=$(ls $BACKUP_DIR/hermes-backup-*.tar.gz 2>/dev/null | wc -l)
echo "[$(date)] Rotation complete. $REMAINING backup(s) retained."
