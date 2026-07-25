#!/bin/bash
# ============================================================
# backup-data.sh — ShadowQuake 运行时数据每日备份
# 备份 public/data + api/data + public/posts(文章)到本地 _backups,
# 时间戳命名 + 保留最近 14 份。由 cron 每天调用。
#
# 注意:这是【同盘】备份,防的是误删/坏部署/程序 bug,不防磁盘损坏。
# 异地备份(推到 Cloudflare R2)是后续架构方案里的下一步。
# ============================================================
set -euo pipefail

SITE_ROOT="/www/wwwroot/47.118.28.27"
BACKUP_DIR="/www/wwwroot/_backups/data"
LOG_FILE="/var/log/data-backup.log"
KEEP=14
TS=$(date +%Y%m%d-%H%M%S)
ARCHIVE="${BACKUP_DIR}/data-${TS}.tar.gz"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"
cd "$SITE_ROOT"

# 只打包存在的目标,避免某个目录缺失导致整体失败
TARGETS=()
for d in public/data api/data public/posts; do
    [ -e "$d" ] && TARGETS+=("$d")
done

if [ ${#TARGETS[@]} -eq 0 ]; then
    log "ERROR: 没有可备份的目标目录,退出"
    exit 1
fi

tar czf "$ARCHIVE" "${TARGETS[@]}"
SIZE=$(du -h "$ARCHIVE" | cut -f1)
log "已备份 ${TARGETS[*]} → ${ARCHIVE} (${SIZE})"

# 轮转:仅保留最近 KEEP 份
mapfile -t OLD < <(ls -1t "${BACKUP_DIR}"/data-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)))
if [ ${#OLD[@]} -gt 0 ]; then
    for f in "${OLD[@]}"; do rm -f "$f"; done
    log "已清理 ${#OLD[@]} 份旧备份,保留最近 ${KEEP} 份"
fi
