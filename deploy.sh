#!/bin/bash
# 博客部署脚本 - 用法: ./deploy.sh "改了什么"
cd "$(dirname "$0")"

MSG="${1:-update}"

git add -A && git commit -m "$MSG" && git push

if [ $? -ne 0 ]; then
    echo "Push 失败，尝试 stash 修复..."
    ssh shadowsky 'cd /www/wwwroot/47.118.28.27 && git stash'
    git push
    ssh shadowsky 'cd /www/wwwroot/47.118.28.27 && git stash pop'
fi
