#!/bin/bash
# ============================================================
# cf-purge.sh —— 清 Cloudflare 边缘缓存（在服务器上跑）
#
#   部署后要清全站：边缘可能还存着旧 HTML，而它引用的 /_next/static chunk
#   已经随这次部署删掉了 —— 用户会白屏。这是边缘 TTL 能拉长的前提。
#   cron 生成 AI 日报后清几个列表页即可。
#
# 凭据放 /www/wwwroot/shadowquake-v2/tools/cf.env（600），格式：
#   CF_ZONE_ID=790c88783510b35fb6060230dd04bf37
#   CF_PURGE_TOKEN=xxxxx
# 没有这个文件就安静跳过（与 backup-offsite.py 一样的约定），
# 这样没配凭据的机器上部署脚本照样能跑完。
#
# 用法：
#   bash cf-purge.sh                     清全站
#   bash cf-purge.sh /blog /ai-daily/x   只清这几个路径
# ============================================================
set -euo pipefail

ENV_FILE=${CF_ENV_FILE:-/www/wwwroot/shadowquake-v2/tools/cf.env}
SITE=${CF_SITE_URL:-https://shadowquake.top}

if [ ! -f "$ENV_FILE" ]; then
    echo "[cf-purge] 未配置 $ENV_FILE，跳过清缓存"
    exit 0
fi
set -a; . "$ENV_FILE"; set +a

if [ -z "${CF_ZONE_ID:-}" ] || [ -z "${CF_PURGE_TOKEN:-}" ]; then
    echo "[cf-purge] $ENV_FILE 里缺 CF_ZONE_ID 或 CF_PURGE_TOKEN，跳过"
    exit 0
fi

API="https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache"

if [ $# -eq 0 ]; then
    body='{"purge_everything":true}'
    what="全站"
else
    files=""
    for p in "$@"; do
        case "$p" in
            http*) url="$p" ;;
            *)     url="$SITE$p" ;;
        esac
        files="$files${files:+,}\"$url\""
    done
    body="{\"files\":[$files]}"
    what="$# 个 URL"
fi

resp=$(curl -sS --max-time 15 -X POST "$API" \
    -H "Authorization: Bearer $CF_PURGE_TOKEN" \
    -H "Content-Type: application/json" \
    --data "$body" || true)

if printf '%s' "$resp" | grep -q '"success":true'; then
    echo "[cf-purge] 已清 $what ✓"
else
    # 清缓存失败不该让部署整体失败(内容仍然是新的,只是边缘要等 TTL)
    echo "[cf-purge] ⚠ 清 $what 失败：$(printf '%s' "$resp" | head -c 300)"
fi
