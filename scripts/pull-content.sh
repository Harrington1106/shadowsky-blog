#!/bin/bash
# ============================================================
# pull-content.sh —— 把线上文章 / AI 日报拉回仓库，让内容有版本历史
#
# 背景:文章正文只存在服务器 content/ 下(后台写文件、cron 生成日报),
#       git 里没有 → 改错只能翻每日备份,没有 diff、没有回滚。
#       本脚本把线上内容单向同步到仓库 content/,提交后即拥有完整历史。
#
# ⚠️ 方向是单向的:服务器 → 仓库。
#    服务器才是权威副本,deploy-v2.sh 不会把 content/ 推上去。
#    仓库这份只用于「看 diff / 找回旧版本」,不要指望改了仓库线上就变。
#    真要回滚某篇:从仓库取出旧版内容,再 scp 回服务器对应路径。
#
# 用法:bash scripts/pull-content.sh [--commit]
#      --commit  同步后自动 git add + commit(默认只同步并显示 diff)
# ============================================================
set -euo pipefail

SSH_HOST=shadowsky
REMOTE_CONTENT=/www/wwwroot/shadowquake-v2/content
cd "$(dirname "$0")/.."

echo "==> 从服务器拉取 content/ …"
mkdir -p content
# 用 tar over ssh:不依赖 rsync(Windows Git Bash 一般没有)
# ⚠ 必须排除 .git 与 .revisions.json:服务器上的 content/ 现在是个 git 仓库
#   (见 scripts/content-snapshot.sh —— 单篇修订记录)。整目录拉回来会在本仓库里
#   套一个嵌套 .git,git 会把 content/ 当成另一个仓库,镜像直接失效。
ssh "$SSH_HOST" "tar czf - --exclude=./.git --exclude=./.gitignore --exclude=./.revisions.json -C $REMOTE_CONTENT ." | tar xzf - -C content

# 统一成 LF,避免 Windows 端换行差异把整个文件标记为改动
find content -type f \( -name '*.md' -o -name '*.json' \) -print0 \
    | xargs -0 -I{} sh -c 'tmp=$(mktemp); tr -d "\r" < "{}" > "$tmp" && mv "$tmp" "{}"'

# ⚠ 本地有、服务器没有的文章 = 还没发布的本地副本
#   (多半是 publish-post.mjs --preview 留下的)。tar 解包只覆盖同名文件、不会删,
#   所以它们会一直躺在镜像目录里,看着像已上线的文章。这里点名提醒。
remote_list=$(ssh "$SSH_HOST" "ls $REMOTE_CONTENT/posts 2>/dev/null" | tr -d '\r' | sort)
local_list=$(ls content/posts 2>/dev/null | sort)
only_local=$(comm -23 <(echo "$local_list") <(echo "$remote_list") || true)
if [ -n "$only_local" ]; then
    echo "⚠ 以下文章只在本地、线上没有(未发布的预览副本?):"
    echo "$only_local" | sed 's/^/    /'
    echo "    发布: cd web && node scripts/publish-post.mjs <文件名>"
    echo "    丢弃: rm content/posts/<文件名>"
    echo
fi

echo "==> 文件统计"
printf "    文章    %s 篇\n" "$(find content/posts -name '*.md' 2>/dev/null | wc -l)"
printf "    AI 日报 %s 篇\n" "$(find content/ai-daily -name '*.md' 2>/dev/null | wc -l)"

echo "==> 与仓库当前版本的差异"
if git diff --stat --quiet -- content 2>/dev/null && [ -z "$(git status --porcelain content)" ]; then
    echo "    无变化,内容与仓库一致 ✓"
    exit 0
fi
git status --short content | head -20
echo
git diff --stat -- content | tail -5

if [ "${1:-}" = "--commit" ]; then
    # 只提交从服务器同步下来的部分。content/drafts/ 是本地写作区,
    # 跟「同步线上内容」不是一回事,混进来会让这条提交名不副实。
    git add content/posts content/ai-daily
    git commit -m "content: 同步线上文章与 AI 日报($(date +%Y-%m-%d))

由 scripts/pull-content.sh 从服务器单向同步。服务器是权威副本,
本次提交只为留下版本历史与 diff。"
    echo "==> 已提交。推送:git push github master"
else
    echo
    echo "==> 只同步未提交。确认无误后:"
    echo "    git add content && git commit -m 'content: 同步线上内容'"
fi
