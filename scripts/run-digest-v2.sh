#!/bin/bash
# AI 日报(v2)—— 复用宿主 tsx 工具链,输出到 v2 的 content/ai-daily,重建索引。
# 由 cron 每天触发。日志 /var/log/ai-daily-v2.log
set -e
LOG=/var/log/ai-daily-v2.log
SKILL=/www/wwwroot/shadowquake-v2/tools/ai-daily-digest
DIGEST="$SKILL/scripts/digest.ts"
INDEX="$SKILL/gen-index.py"
OUT=/www/wwwroot/shadowquake-v2/content/ai-daily
DATE=$(date +%Y-%m-%d)
mkdir -p "$OUT"

echo "[$(date '+%F %T')] AI日报(v2)开始" >>"$LOG"
if [ -f "$OUT/$DATE.md" ]; then
    echo "[$(date '+%F %T')] 今日已存在,跳过" >>"$LOG"; exit 0
fi
# 载入 .env(SILICONFLOW_API_KEY 等)
if [ -f /www/wwwroot/shadowquake-v2/tools/digest.env ]; then set -a; . /www/wwwroot/shadowquake-v2/tools/digest.env; set +a; fi

tsx "$DIGEST" --hours 48 --top-n 10 --lang zh --output "$OUT/$DATE.md" >>"$LOG" 2>&1
if [ -f "$OUT/$DATE.md" ]; then
    python3 "$INDEX" "$OUT" >>"$LOG" 2>&1
    echo "[$(date '+%F %T')] 完成:$OUT/$DATE.md + 索引已重建" >>"$LOG"
else
    echo "[$(date '+%F %T')] 失败:未生成 md" >>"$LOG"; exit 1
fi
