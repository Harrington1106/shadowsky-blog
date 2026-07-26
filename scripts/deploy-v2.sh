#!/bin/bash
# ============================================================
# deploy-v2.sh —— ShadowQuake v2 一键部署
#
#   本地构建 → 组装产物 → scp → 服务器 docker build → 换容器 → 验证
#
# 内置两道防呆(2026-07-26 手工部署踩过的坑):
#   1. 构建前拒绝 web/.env 存在 —— Next standalone 会把它打进镜像
#   2. 部署后同时比对「直连容器」与「经 nginx」的 md5 —— 不一致=命中 nginx
#      proxy_cache,会让人误以为构建没生效
#
# 用法:bash scripts/deploy-v2.sh [--skip-build]
# 数据(db/ content/ data/uploads)是容器挂载卷,不受重建影响。
# ============================================================
set -euo pipefail

SSH_HOST=shadowsky
REMOTE_DIR=/www/wwwroot/shadowquake-v2
IMAGE=shadowquake-v2
CONTAINER=shadowsky-v2
TS=$(date +%Y%m%d-%H%M%S)
SKIP_BUILD=0
[ "${1:-}" = "--skip-build" ] && SKIP_BUILD=1

cd "$(dirname "$0")/../web"

# ── 0. 防呆:.env 不能进产物 ──────────────────────────────
if [ -f .env ]; then
    echo "✗ web/.env 存在。Next standalone 会把它打进镜像(含本地口令)。"
    echo "  删掉它;本地要跑 admin 用行内变量:"
    echo "  AUTH_SECRET=dev ADMIN_PASSWORD=devpass npm run dev"
    exit 1
fi

# ── 1. 构建 ──────────────────────────────────────────────
if [ "$SKIP_BUILD" = 0 ]; then
    echo "==> 1/6 构建(next build)…"
    npm run build
else
    echo "==> 1/6 跳过构建(--skip-build),沿用现有 .next"
    [ -d .next/standalone ] || { echo "✗ .next/standalone 不存在,不能跳过构建"; exit 1; }
fi

# ── 2. 组装产物 ──────────────────────────────────────────
echo "==> 2/6 组装 _deploy/ 并打包…"
rm -rf _deploy deploy.tgz
mkdir -p _deploy/db
cp -r .next/standalone _deploy/standalone
cp -r .next/static     _deploy/static
cp -r public           _deploy/public
cp -r db/migrations db/bootstrap.js db/seed _deploy/db/
cp Dockerfile.deploy _deploy/

# 宿主侧跑的东西(不进镜像,但必须随部署更新,否则改了代码线上还是旧的):
#   jobs/                   cron 2:30 的 bangumi 同步(docker run 挂载进容器)
#   tools/ai-daily-digest/  cron 9:03 的 AI 日报(宿主 tsx 直接跑)
cp -r jobs _deploy/jobs
mkdir -p _deploy/tools
cp -r ../.claude/skills/ai-daily-digest _deploy/tools/ai-daily-digest

tar czf deploy.tgz -C _deploy .

if tar tzf deploy.tgz | grep -qi "\.env"; then
    echo "✗ 产物里混入了 .env,已中止:"
    tar tzf deploy.tgz | grep -i "\.env"
    exit 1
fi
echo "    产物 $(du -h deploy.tgz | cut -f1),无 .env ✓"

# ── 3. 上传 + 备份数据 ───────────────────────────────────
echo "==> 3/6 上传并备份线上数据…"
scp -q deploy.tgz "$SSH_HOST:/tmp/deploy.tgz"
ssh "$SSH_HOST" "bash $REMOTE_DIR/backup-v2.sh"

# ── 4. 构建镜像 + 换容器 ─────────────────────────────────
echo "==> 4/6 服务器构建镜像并换容器…"
ssh "$SSH_HOST" "set -e
    cd $REMOTE_DIR
    docker tag $IMAGE:latest $IMAGE:rollback-$TS 2>/dev/null || true
    rm -f standalone/.env
    tar xzf /tmp/deploy.tgz
    docker build -q -f Dockerfile.deploy -t $IMAGE:latest . >/dev/null
    docker rm -f $CONTAINER >/dev/null 2>&1 || true
    docker run -d --name $CONTAINER --restart unless-stopped \
        -p 127.0.0.1:3001:3000 --env-file $REMOTE_DIR/.env \
        -v $REMOTE_DIR/db:/app/db \
        -v $REMOTE_DIR/content:/app/content \
        -v $REMOTE_DIR/data/uploads:/app/public/uploads \
        $IMAGE:latest >/dev/null
    sleep 4"

# ── 5. 验证 ──────────────────────────────────────────────
echo "==> 5/6 验证…"
ssh "$SSH_HOST" 'set -e
    fail=0
    for p in / /blog /moments /bookmarks /rss /acg /anime /manga /edits /about /gnz48.html /ai-daily/; do
        code=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: shadowquake.top" "http://127.0.0.1$p")
        printf "    %-14s %s\n" "$p" "$code"
        [ "$code" = 200 ] || fail=1
    done
    # 直连容器 vs 经 nginx:不一致 = nginx proxy_cache 在发旧页面
    direct=$(curl -s http://127.0.0.1:3001/blog | md5sum | cut -d" " -f1)
    viaNginx=$(curl -s -H "Host: shadowquake.top" http://127.0.0.1/blog | md5sum | cut -d" " -f1)
    if [ "$direct" != "$viaNginx" ]; then
        echo "    ✗ 直连容器与经 nginx 内容不一致 —— nginx 缓存了旧页面"
        echo "      修:location / 里加 proxy_cache off; 然后"
        echo "      rm -rf /www/server/nginx/proxy_cache_dir/* && nginx -s reload"
        fail=1
    else
        echo "    直连容器 == 经 nginx ✓ (md5 ${direct:0:8})"
    fi
    # 宿主侧 cron 依赖是否到位(它们不在镜像里,靠 tar 解包更新)
    for f in jobs/bangumi-sync.cjs tools/ai-daily-digest/scripts/digest.ts tools/digest.env; do
        if [ -f "'"$REMOTE_DIR"'/$f" ]; then printf "    %-42s ✓\n" "$f"
        else printf "    %-42s ✗ 缺失\n" "$f"; fail=1; fi
    done
    docker stats --no-stream --format "    容器 {{.MemUsage}} CPU {{.CPUPerc}}" '"$CONTAINER"'
    exit $fail'

echo "==> 6/6 完成。回滚:ssh $SSH_HOST 'docker rm -f $CONTAINER && docker tag $IMAGE:rollback-$TS $IMAGE:latest' 后重跑 run 命令"
echo "    线上验证:https://shadowquake.top/ (Ctrl+Shift+R 绕过浏览器缓存)"
