#!/bin/bash
# v2 数据备份:打包 SQLite 库 + content(文章/AI日报)+ 上传图片到 _backups/v2,保留最近 14 份。
# 打包完若已配置 R2 异地备份(tools/r2.env),再推一份到 Cloudflare R2 ——
# 本地这份和数据在同一块盘上,防误删但不防掉盘。
set -euo pipefail
V2=/www/wwwroot/shadowquake-v2
DEST=/www/wwwroot/_backups/v2
KEEP=14
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"
ARCHIVE="$DEST/v2-$TS.tar.gz"

# data/uploads 是后台上传的图片,同属生产数据,一并打包
tar czf "$ARCHIVE" -C "$V2" db content data/uploads 2>/dev/null
echo "[$(date '+%F %T')] v2 备份 -> $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

mapfile -t OLD < <(ls -1t "$DEST"/v2-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)))
[ ${#OLD[@]} -gt 0 ] && rm -f "${OLD[@]}" && echo "清理 ${#OLD[@]} 份旧备份"

# ── 异地备份(可选)────────────────────────────────────────
# 未配置 r2.env 时安静跳过,不让 cron 每天报错;配置后自动开始上传。
if [ -f "$V2/tools/r2.env" ]; then
    if python3 "$V2/tools/backup-offsite.py" "$ARCHIVE"; then
        :
    else
        echo "[$(date '+%F %T')] ⚠ 异地备份失败(本地备份已完成,不影响)" >&2
    fi
else
    echo "[$(date '+%F %T')] 异地备份未配置(缺 tools/r2.env),仅本地备份"
fi

exit 0
