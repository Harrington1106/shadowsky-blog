#!/bin/bash
# AI Daily Digest - 服务器端自动生成脚本
# 由 crontab 定时触发 (每天 9:03 北京时间)
# 日志: /var/log/ai-daily-digest.log

set -e

LOG_FILE="/var/log/ai-daily-digest.log"
DIGEST_SCRIPT="/www/wwwroot/47.118.28.27/.claude/skills/ai-daily-digest/scripts/digest.ts"
INDEX_SCRIPT="/www/wwwroot/47.118.28.27/.claude/skills/ai-daily-digest/gen-index.py"
OUTPUT_DIR="/www/wwwroot/47.118.28.27/public/data/ai-daily"
DATE_STR=$(date +%Y-%m-%d)
OUTPUT_FILE="${OUTPUT_DIR}/${DATE_STR}.md"

echo "========================================" | tee -a "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] AI Daily Digest Start" | tee -a "$LOG_FILE"

# 确保输出目录存在
mkdir -p "$OUTPUT_DIR"

# 如果今天已经生成，跳过
if [ -f "$OUTPUT_FILE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Today's digest already exists: $OUTPUT_FILE, skipping." | tee -a "$LOG_FILE"
    exit 0
fi

# 运行 digest 脚本
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running digest.ts..." | tee -a "$LOG_FILE"
cd /www/wwwroot/47.118.28.27

# 加载服务器 .env（SILICONFLOW_API_KEY / SILICONFLOW_MODEL 等，不进 git）
if [ -f /www/wwwroot/47.118.28.27/.env ]; then
    set -a
    # shellcheck disable=SC1091
    . /www/wwwroot/47.118.28.27/.env
    set +a
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Loaded .env (SILICONFLOW_API_KEY=${SILICONFLOW_API_KEY:+set})" | tee -a "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: .env not found; relying on ambient env / Gemini proxy" | tee -a "$LOG_FILE"
fi

tsx "$DIGEST_SCRIPT" \
    --hours 48 \
    --top-n 10 \
    --lang zh \
    --output "$OUTPUT_FILE" 2>&1 | tee -a "$LOG_FILE"

# 检查是否生成成功
if [ -f "$OUTPUT_FILE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Digest generated: $OUTPUT_FILE" | tee -a "$LOG_FILE"

    # 重新生成索引
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Regenerating index..." | tee -a "$LOG_FILE"
    python3 "$INDEX_SCRIPT" "$OUTPUT_DIR" 2>&1 | tee -a "$LOG_FILE"

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] AI Daily Digest Complete ✅" | tee -a "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Failed to generate digest" | tee -a "$LOG_FILE"
    exit 1
fi