#!/bin/bash
# React (Next.js 静态导出) 预览部署脚本
# 构建 web/ 并把产物同步到 shadowquake.top/preview/，不影响现有静态站点/Node后端路由。
# nginx 侧的 /preview location 已经加到 /www/server/panel/vhost/nginx/shadowquake.top.conf
# （对应仓库 nginx/shadowquake.top.conf），首次之后无需再改 nginx。
set -e

cd "$(dirname "$0")/web"

echo "==> 构建预览版 (NEXT_PUBLIC_BASE_PATH=/preview)..."
npm run build:preview

echo "==> 同步 out/ 到服务器 /www/wwwroot/47.118.28.27/preview/ ..."
ssh shadowsky 'mkdir -p /www/wwwroot/47.118.28.27/preview'
scp -r out/. shadowsky:/www/wwwroot/47.118.28.27/preview/

echo "==> 完成。访问 https://shadowquake.top/preview/ 验证（Ctrl+Shift+R 强制刷新）"
