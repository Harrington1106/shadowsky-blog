#!/bin/bash
# ============================================================
# content-snapshot.sh —— 给 content/ 建立单篇修订记录
#
# 为什么需要：
#   文章正文是在 Obsidian 里写完、由自动化脚本推上服务器的，**不经过站点**，
#   后台编辑器只能改 frontmatter。所以「保存时记一笔」只能覆盖一半改动。
#   而现有的两个时间字段都是批量操作的产物、没有参考价值：
#     文件 mtime  → 18 篇都是 2026-07-25 19:08（v1→v2 迁移拷贝的时间）
#     lastModified → 18 篇都是 2026-06-26（更早的一次批量写入）
#
# 做法：把 content/ 变成一个 git 仓库，定时提交。
#   无论文章从哪条路进来（Obsidian 推送 / 后台改 frontmatter / 手工 scp），
#   git 都能抓到，而且天然有 diff、有回滚、有完整时间线。
#
# ⚠ 容器里没有 git（node:22-slim），所以这个脚本跑在**宿主**上，
#   顺带生成 .revisions.json 给站点读——容器只读 JSON，不碰 git。
#
# 用法：bash content-snapshot.sh
#       cron 每 10 分钟跑一次；没有变化时几毫秒就退出。
# ============================================================
set -euo pipefail

CONTENT=${CONTENT_DIR:-/www/wwwroot/shadowquake-v2/content}
KEEP_PER_FILE=20   # 每篇最多保留多少条修订进 JSON（git 里仍是完整历史）

[ -d "$CONTENT" ] || { echo "[content-snapshot] 目录不存在: $CONTENT"; exit 1; }
cd "$CONTENT"

# ── 首次：初始化仓库 ────────────────────────────────
if [ ! -d .git ]; then
    git init -q
    git config user.email "bot@shadowquake.top"
    git config user.name "content-snapshot"
    # 派生文件不进版本库，否则每次生成都算一次"变化"，会无限自我提交
    printf '.revisions.json\n' > .gitignore
    git add -A
    git commit -q -m "content: 初始快照（$(date '+%F %H:%M')）"
    echo "[content-snapshot] 已初始化仓库并记录初始快照"
fi

# ── 有变化才提交 ────────────────────────────────────
changed=$(git status --porcelain | wc -l)
if [ "$changed" -gt 0 ]; then
    git add -A
    git commit -q -m "content: $changed 个文件变化（$(date '+%F %H:%M')）"
    echo "[content-snapshot] 已提交 $changed 个变化"
fi

# ── 生成给站点读的索引 ──────────────────────────────
python3 - "$CONTENT" "$KEEP_PER_FILE" <<'PY'
import json, os, subprocess, sys
from datetime import datetime, timezone

content, keep = sys.argv[1], int(sys.argv[2])

def git(*args):
    # 服务器是 Python 3.6:capture_output/text 都是 3.7+ 才有的,用老写法
    return subprocess.run(['git', '-C', content] + list(args),
                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                          universal_newlines=True).stdout

files = {}
for sub in ('posts', 'ai-daily'):
    d = os.path.join(content, sub)
    if not os.path.isdir(d):
        continue
    for name in sorted(os.listdir(d)):
        if not name.endswith('.md'):
            continue
        rel = f'{sub}/{name}'
        # --follow 让改名后仍能追到之前的历史；numstat 给出增删行数
        raw = git('log', '--follow', f'-{keep}', '--format=%x00%h|%cI', '--numstat', '--', rel)
        revs, cur = [], None
        for line in raw.splitlines():
            if line.startswith('\x00'):
                if cur:
                    revs.append(cur)
                h, at = line[1:].split('|', 1)
                cur = {'commit': h, 'at': at, 'added': 0, 'removed': 0}
            elif line.strip() and cur is not None:
                parts = line.split('\t')
                if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
                    cur['added'] += int(parts[0])
                    cur['removed'] += int(parts[1])
        if cur:
            revs.append(cur)
        if revs:
            files[rel] = revs

out = {
    'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    'files': files,
}
path = os.path.join(content, '.revisions.json')
with open(path, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
total = sum(len(v) for v in files.values())
print(f'[content-snapshot] 索引已更新：{len(files)} 篇 / {total} 条修订 → {os.path.basename(path)}')
PY
