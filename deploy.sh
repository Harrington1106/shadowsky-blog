#!/bin/bash
# ============================================================
# deploy.sh — ShadowQuake 一键部署
# 自动：版本号 → 提交 → push → 处理服务器冲突
# 用法：bash deploy.sh "commit message"
# ============================================================
set -e
MSG="${1:-deploy}"
TS=$(date +%y%m%d%H%M)
cd "$(dirname "$0")"

echo "=== 1. 自动更新版本号 ==="
CHANGED=$(git diff --name-only HEAD 2>/dev/null; git diff --name-only --cached 2>/dev/null)
for f in $CHANGED; do
    base=$(basename "$f")
    ext="${base##*.}"
    [ "$ext" = "css" ] || [ "$ext" = "js" ] || continue
    grep -rl "${base}?v=" *.html admin/index.html ai-daily/index.html 2>/dev/null | while read h; do
        sed -i "s|${base}?v=[^\"]*|${base}?v=${TS}|g" "$h"
    done
    echo "  ✓ ${base} → v=${TS}"
done

echo ""
echo "=== 2. 提交 ==="
git add -A
git commit -m "$MSG" || { echo "Nothing to commit"; exit 0; }

echo ""
echo "=== 3. 推送 ==="
if git push 2>&1; then
    echo "✓ 部署完成"
else
    echo "⚠ 服务器冲突，自动清理…"
    ssh shadowsky 'cd /www/wwwroot/47.118.28.27 && git stash --include-untracked 2>/dev/null; true'
    git push
    ssh shadowsky 'cd /www/wwwroot/47.118.28.27 && git stash pop 2>/dev/null; true'
    echo "✓ 部署完成（已清理服务器冲突）"
fi

echo ""
echo "=== 4. 验证 ==="
ssh shadowsky 'cd /www/wwwroot/47.118.28.27 && git log --oneline -1'
echo "部署成功！Ctrl+Shift+R 刷新"
