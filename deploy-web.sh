#!/bin/bash
# ============================================================
# deploy-web.sh — 正式部署(React / Next.js 静态导出 → 线上根目录)
#
# 单一真相源 = GitHub。部署 = 本地构建产物 scp 到服务器根目录。
# 服务器 git 仓库不再作为部署机制(不再 git push origin)。
#
# 流程:构建 → 备份线上现有页面 → scp 覆盖 → 提示验证
# 覆盖前会在服务器 _backups/ 留一份时间戳快照,可回滚。
# ============================================================
set -euo pipefail

REMOTE="shadowsky:/www/wwwroot/47.118.28.27"
SSH_HOST="shadowsky"
SITE_ROOT="/www/wwwroot/47.118.28.27"
TS=$(date +%Y%m%d-%H%M%S)
cd "$(dirname "$0")/web"

echo "==> 1/4 构建(默认根路径,无 basePath)..."
npm run build

echo "==> 2/4 备份线上现有页面到 _backups/web-${TS}/ ..."
ssh "$SSH_HOST" "
  mkdir -p /www/wwwroot/_backups/web-${TS}
  cd ${SITE_ROOT}
  cp -f *.html *.txt /www/wwwroot/_backups/web-${TS}/ 2>/dev/null || true
  cp -rf _next /www/wwwroot/_backups/web-${TS}/ 2>/dev/null || true
"

echo "==> 3/4 上传 out/ 到线上根目录..."
scp -q out/*.html out/*.txt "${REMOTE}/"
scp -qr out/_next "${REMOTE}/"
scp -qr out/img "${REMOTE}/"

echo "==> 4/4 完成。备份在 ${SITE_ROOT%/*}/_backups/web-${TS}/"
echo "    验证: https://shadowquake.top/ (Ctrl+Shift+R 强制刷新绕过 Cloudflare)"
echo "    回滚: 从 _backups/web-${TS}/ 复制回根目录即可"
