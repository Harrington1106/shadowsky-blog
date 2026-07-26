#!/bin/bash
# ============================================================
# pull-backup.sh —— 把服务器最新的备份包拉到本机，作为异地副本
#
# 为什么需要:服务器上的 _backups/v2 和生产数据在同一块盘,防误删/坏部署,
#            但不防掉盘和实例回收。拉一份到本机 = 真正意义上的异地。
#
# 相比 R2 方案:不需要开通任何服务、不需要新凭据(走现成的 SSH 密钥),
#              代价是只有本机开着时才同步。两者可以并存。
#
# 拉完若存在备份仓库(../shadowquake-backups,private),会顺手提交并推送 ——
# 这样即使本机也没了,GitHub 上还有一份,且带版本历史。
#
# 用法:bash scripts/pull-backup.sh [保留份数,默认 30]
# 落地位置:仓库同级的 _backups/(已在 .gitignore,不会进 git)
# ============================================================
set -euo pipefail

SSH_HOST=shadowsky
REMOTE_DIR=/www/wwwroot/_backups/v2
KEEP=${1:-30}
cd "$(dirname "$0")/.."
LOCAL_DIR="_backups/v2"
mkdir -p "$LOCAL_DIR"

echo "==> 查询服务器最新备份…"
LATEST=$(ssh "$SSH_HOST" "ls -1t $REMOTE_DIR/v2-*.tar.gz 2>/dev/null | head -1" | tr -d '\r')
[ -n "$LATEST" ] || { echo "✗ 服务器上没有备份包"; exit 1; }
NAME=$(basename "$LATEST")
REMOTE_MD5=$(ssh "$SSH_HOST" "md5sum $LATEST | cut -d' ' -f1" | tr -d '\r')

if [ -f "$LOCAL_DIR/$NAME" ] && [ "$(md5sum "$LOCAL_DIR/$NAME" | cut -d' ' -f1)" = "$REMOTE_MD5" ]; then
    echo "    $NAME 本地已有且校验一致,跳过下载"
else
    echo "==> 下载 $NAME …"
    scp -q "$SSH_HOST:$LATEST" "$LOCAL_DIR/"
    LOCAL_MD5=$(md5sum "$LOCAL_DIR/$NAME" | cut -d' ' -f1)
    if [ "$LOCAL_MD5" != "$REMOTE_MD5" ]; then
        rm -f "$LOCAL_DIR/$NAME"
        echo "✗ 校验不一致(远端 $REMOTE_MD5 / 本地 $LOCAL_MD5),已删除损坏文件"
        exit 1
    fi
    echo "    校验一致 ✓ ($REMOTE_MD5)"
fi

# 内容自检:确认包里确实有数据库和文章,而不是一个空壳
echo "==> 内容自检"
LIST=$(tar tzf "$LOCAL_DIR/$NAME")
for want in "db/shadowquake.db" "content/posts"; do
    if echo "$LIST" | grep -q "$want"; then printf "    %-22s ✓\n" "$want"
    else printf "    %-22s ✗ 缺失\n" "$want"; exit 1; fi
done
printf "    文章 %s 篇 / AI 日报 %s 篇\n" \
    "$(echo "$LIST" | grep -c '^content/posts/.*\.md$' || true)" \
    "$(echo "$LIST" | grep -c '^content/ai-daily/.*\.md$' || true)"

# 本地保留策略
mapfile -t OLD < <(ls -1t "$LOCAL_DIR"/v2-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)))
if [ ${#OLD[@]} -gt 0 ]; then
    rm -f "${OLD[@]}"
    echo "==> 清理 ${#OLD[@]} 份本地旧副本(保留最近 $KEEP 份)"
fi

echo "==> 本地共 $(ls -1 "$LOCAL_DIR"/v2-*.tar.gz | wc -l) 份,占用 $(du -sh "$LOCAL_DIR" | cut -f1)"

# ── 推到私有备份仓库(可选)────────────────────────────────
# 目录不在就跳过,不报错 —— 换台机器跑时不至于失败。
BACKUP_REPO="../shadowquake-backups"
if [ -d "$BACKUP_REPO/.git" ]; then
    echo "==> 同步到备份仓库…"
    mkdir -p "$BACKUP_REPO/archives"
    cp -f "$LOCAL_DIR"/v2-*.tar.gz "$BACKUP_REPO/archives/"
    # 工作区只留最近 KEEP 份,更早的仍在 git 历史里,checkout 不会越来越大
    (cd "$BACKUP_REPO/archives" && ls -1t v2-*.tar.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f)
    (
        cd "$BACKUP_REPO"
        if [ -n "$(git status --porcelain)" ]; then
            git add -A
            git commit -q -m "backup: $NAME ($(date +%F))"
            if git push -q origin main 2>/dev/null; then
                echo "    已提交并推送到 GitHub ✓"
            else
                echo "    ⚠ 提交成功但推送失败(网络?),下次运行会补推"
            fi
        else
            echo "    备份仓库无变化"
        fi
    )
else
    echo "==> 未找到 $BACKUP_REPO,跳过 GitHub 同步"
fi

echo "==> 完成。恢复方法见备份仓库的 README.md"
