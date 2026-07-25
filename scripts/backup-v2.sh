#!/bin/bash
# v2 数据备份:打包 SQLite 库 + content(文章/AI日报)到 _backups/v2,保留最近 14 份。
set -euo pipefail
V2=/www/wwwroot/shadowquake-v2
DEST=/www/wwwroot/_backups/v2
KEEP=14
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"
tar czf "$DEST/v2-$TS.tar.gz" -C "$V2" db content 2>/dev/null
echo "[$(date '+%F %T')] v2 备份 -> $DEST/v2-$TS.tar.gz ($(du -h "$DEST/v2-$TS.tar.gz" | cut -f1))"
mapfile -t OLD < <(ls -1t "$DEST"/v2-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)))
[ ${#OLD[@]} -gt 0 ] && rm -f "${OLD[@]}" && echo "清理 ${#OLD[@]} 份旧备份"
exit 0
