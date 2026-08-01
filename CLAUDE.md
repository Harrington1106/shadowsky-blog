# ShadowQuake Blog (v2)

个人 ACG 博客 **shadowquake.top**，部署在阿里云 ECS (47.118.28.27, Hangzhou)，前端走 Cloudflare CDN。

**2026-07-25 起**：站点由 **v2**（`web/` 目录的 Next.js 15 全栈应用 + SQLite）接管。
旧 v1（14 个静态 HTML + Express `admin/server.js`:3000 + PHP `api/`）**仍在原地保留**，但 nginx 只把少数遗留路径指向它，观察期结束后清理。改任何东西前先确认改的是 v2 还是遗留件。

## 生产架构

```
用户 → Cloudflare DNS/CDN
        │   橙云 A 记录 shadowquake.top / www → 173.254.247.116（不是源站！）
        ↓
      中转机 173.254.247.116（美国 ColoCrossing VPS，自建 nginx 反代）
        │   ← 这一跳容易被漏掉，排查延迟/缓存问题时必须算进来
        ↓
      nginx (47.118.28.27:80/443/4443，杭州阿里云 ECS)
        │
        ├── 遗留静态（root = /www/wwwroot/legacy-static/，2026-08-01 起只剩 48KB）
        │     /gnz48.html            GNZ48 日程页（唯一还在发静态 HTML 的页面）
        │     /team-g.ics /schedule.json
        │     /app.js /data.js       gnz48 页的脚本与数据
        │     /favicon.ico
        │
        │   /ai-daily/* 已于 2026-08-01 退役 → 301 到 v2：
        │     /ai-daily/YYYY-MM-DD.html → /post?ai=YYYY-MM-DD
        │     /ai-daily/ 及其余         → /blog#aidaily
        │
        └── 其余全部 /  → proxy_pass 127.0.0.1:3001
                          → Docker 容器 shadowsky-v2（Next standalone，容器内 :3000）

旧 *.html 路径 301 → v2 干净 URL（/blog.html → /blog，以此类推）

外部依赖：bangumi.shadowquake.top（Cloudflare Worker）
  ├─ BANGUMI_API_BASE  → 代理 api.bgm.tv（国内 ECS 直连不通）
  └─ FETCH_PROXY_BASE  → 书签抓简介等出站请求的回退代理
```

nginx 配置：`/www/server/panel/vhost/nginx/shadowquake.top.conf`（宝塔面板路径，改完 `nginx -t && nginx -s reload`）

### 链路延迟现状（2026-07-26 实测，从大陆本机）

| 目标 | TTFB |
|------|------|
| 直连杭州源站 47.118.28.27 | **60ms** |
| 美国中转 173.254.247.116 | **830ms** |
| 完整链路（经 Cloudflare） | 820ms – 3.3s |

瓶颈是**中转机在美国**：大陆用户的请求要 `CF境外节点 → 美国 → 杭州` 再原路返回，
太平洋来回两趟，中转这一跳单独吃掉约 770ms。源站本身很快，不是应用性能问题。

**别再试「换 CDN」来解决这个**——2026-07-26 试过腾讯云 EdgeOne，已放弃：

- 域名**没有 ICP 备案** → EdgeOne 中国站用不了，国际站没有大陆节点（大陆节点同样卡备案）
- 实测 EdgeOne 国际节点 TTFB 1.8–3.7s，**比 Cloudflare 还慢**，且回源成功率仅 1/8
  （境外节点跨境回大陆源站，TLS 握手 87% 被打断，返回 525；证书是 `*.shadowquake.top`
  通配、SNI 也正确，不是配置问题，是链路本身）
- 根本原因：CDN 加的是**边缘节点**，而瓶颈在**回源中转**，边缘再快也省不掉中间那趟美国往返

真正能改善的三条路，按性价比：
1. **让 Cloudflare 边缘缓存 HTML**（Cache Rule）→ 命中时大陆用户根本不走美国，预计 300–500ms。
   前提条件已就绪：`next.config.js` 里页面 HTML 已收成 `s-maxage=60`，边缘最多缓 1 分钟，
   不会重演「旧 HTML 引用已删 chunk → 白屏」。
2. **中转机换到香港/日本** → 大陆到港 RTT 30–50ms，预计 TTFB 降到 300ms 量级，不需要备案。
3. **备案** → 唯一的根本解，之后才能用带大陆节点的 CDN（EdgeOne 中国站 / 阿里云 CDN）。

## 项目结构

```
D:\Projects\shadowsky-blog\
├── web/                        ★ v2 全栈应用（几乎所有开发都在这里）
│   ├── app/                    Next App Router
│   │   ├── (页面) blog post moments bookmarks rss acg anime manga edits about
│   │   │        每页两个文件：page.js（服务端，只出 metadata）
│   │   │        + XxxContent.js（'use client'，实际 UI）
│   │   ├── sitemap.js robots.js  /sitemap.xml（静态页+文章+日报，实时生成）与 /robots.txt
│   │   ├── admin/              后台 UI（login posts moments bookmarks media feeds
│   │   │                       videos social greetings notice settings stats）
│   │   └── api/                Route Handlers（读写 API + 代理类 API）
│   ├── components/             共用组件 + components/ui（shadcn）
│   ├── lib/                    db.js schema.js auth.js posts.js content.js
│   │                           proxyFetch.js ssrf.js rss.js aiClient.js …
│   ├── db/                     Drizzle：migrations/ seed/ bootstrap.js
│   │                           （*.db 本地开发库，已 gitignore）
│   ├── jobs/                   bangumi-sync.cjs / ai-digest.ts / cron.example
│   ├── middleware.js           /admin 鉴权拦截
│   ├── Dockerfile.deploy       ★ 生产镜像（封装已构建的 standalone）
│   └── Dockerfile / Dockerfile.jobs
├── content/                    线上内容的**只读镜像**（文章 + AI 日报）
│                               由 scripts/pull-content.sh 从服务器单向同步，
│                               只为留版本历史；服务器才是权威副本，部署不推这里
├── scripts/
│   ├── deploy-v2.sh            ★ 一键部署（含防呆与部署后验证）
│   ├── pull-content.sh         拉回线上内容并留档（服务器 → 仓库，单向）
│   ├── backup-v2.sh            v2 备份（cron 4:45）
│   └── run-digest-v2.sh        AI 日报（cron 9:03）
├── .claude/skills/ai-daily-digest/   AI 日报工具链源（线上副本在服务器
│                               shadowquake-v2/tools/ai-daily-digest，改完要同步过去）
├── workers/                    Cloudflare Worker 源码（bangumi-proxy.js 等）
├── nginx/                      nginx 配置副本
│
（v1 的 `*.html` / `js/` / `css/` / `admin/` / `api/` / `public/` 等已于 2026-07-26
    随旧系统一起删除，需要考古时看 tag `v1-static-baseline` 或 git 历史）
```

## 技术栈（v2）

- **框架**：Next.js 15（App Router，`output: 'standalone'`）+ React 19
- **样式**：Tailwind CSS v4 + shadcn/ui（`components/ui`）
- **图标**：`lucide-react`
- **数据库**：SQLite（better-sqlite3 13 + Drizzle ORM），WAL 模式
- **文章 / AI 日报**：Markdown 文件。正文在**服务端**渲染（`lib/renderMarkdown.js`：`marked` +
  `highlight.js`，结果按文件 mtime 缓存），`katex` 仍在客户端按需加载。
  注意：这条链路**没有过 `dompurify`**——文章里有 B 站 iframe、日报里有 `<details>`，
  需要放行原生 HTML，直接上默认配置的 DOMPurify 会把它们剥掉。内容源是自己的 `content/`
  与 AI 日报脚本，暂按可信处理；要收紧得先定 iframe 白名单。`/rss` 页的外部内容仍走 `dompurify`。
- **鉴权**：`jose` 签发 JWT，httpOnly cookie，`middleware.js` 保护 `/admin`
- **运行**：Docker 容器 `shadowsky-v2`（`node:22-slim`），`restart=unless-stopped`，约 100MB 内存
- **CDN/代理**：Cloudflare（DNS + Worker）

## 数据存储

| 数据 | 位置（服务器） | 容器内路径 |
|------|----------------|-----------|
| 结构化数据（书签/随手拍/媒体/订阅/视频/统计/设置…） | `/www/wwwroot/shadowquake-v2/db/shadowquake.db` | `/app/db/shadowquake.db` |
| 文章 Markdown | `/www/wwwroot/shadowquake-v2/content/posts` | `/app/content/posts` |
| AI 日报 Markdown + index.json | `/www/wwwroot/shadowquake-v2/content/ai-daily` | `/app/content/ai-daily` |
| 上传图片 | `/www/wwwroot/shadowquake-v2/data/uploads` | `/app/public/uploads` |

这三个目录是**容器的 volume 挂载**，即全部生产数据。备份脚本打包 `db` + `content` 两项。

文章正文只在服务器上被写入（后台编辑器写文件、cron 生成日报），git 里原本没有 → 改错只能翻备份。
现在用 `bash scripts/pull-content.sh --commit` 把内容同步回仓库 `content/` 留档，
**方向是单向的（服务器 → 仓库）**，`deploy-v2.sh` 不会把 `content/` 推上线。
要回滚某篇：从仓库取旧版内容，再 `scp` 回服务器对应路径。
MySQL 早已停用；旧的 `public/data/*.json`、`api/data/` 只属于 v1。

## 环境变量（v2）

服务器：`/www/wwwroot/shadowquake-v2/.env`（`docker run --env-file` 注入，权限 600）。

| 变量 | 说明 |
|------|------|
| `NODE_ENV` | production |
| `PORT` / `HOSTNAME` | 3000 / 0.0.0.0（容器内；对外由 -p 映射到宿主 3001） |
| `DB_PATH` | `/app/db/shadowquake.db` |
| `POSTS_DIR` | `/app/content/posts` |
| `AI_DAILY_DIR` | `/app/content/ai-daily` |
| `UPLOADS_DIR` | `/app/public/uploads` |
| `AUTH_SECRET` | JWT 签名密钥（v2 切换时新生成） |
| `ADMIN_PASSWORD` | 后台口令（沿用旧 `ADMIN_TOKEN` 的值） |
| `BANGUMI_USERNAME` / `BANGUMI_TOKEN` | Bangumi 凭据 |
| `BANGUMI_API_BASE` | `https://bangumi.shadowquake.top`（CF Worker） |
| `FETCH_PROXY_BASE` | `https://bangumi.shadowquake.top`（出站抓取回退代理） |

> v1 时代「Bangumi 凭据双数据源（`api/settings.json` + `.env`）」的坑在 v2 已不存在，只有这一份 `.env`。
> AI 日报的密钥（`SILICONFLOW_API_KEY` 等）单独放在 `/www/wwwroot/shadowquake-v2/tools/digest.env`（600），
> 不在上面这张表里，也不进容器 —— 日报脚本跑在宿主上。

## 部署（v2）

**GitHub 是唯一真相源**（默认分支 `main`，但 v2 全部推在 `master`）。服务器不再靠 `git push` 自动更新——v2 是「本地构建 → 产物 scp → 服务器 docker build → 换容器」。

**日常直接用脚本**（已内置下面两道防呆和部署后验证）：
```bash
bash scripts/deploy-v2.sh              # 完整部署
bash scripts/deploy-v2.sh --skip-build # 复用现有 .next
```
下面是脚本内部做的事，手工排查时参考：

```bash
# 1. 本地构建
cd web && npm run build

# 2. 组装部署产物（standalone 自包含；另带 jobs/ 与 tools/ai-daily-digest，
#    这两个跑在宿主上、不进镜像，但必须随部署更新）
rm -rf _deploy && mkdir -p _deploy
cp -r .next/standalone _deploy/standalone
cp -r .next/static     _deploy/static
cp -r public           _deploy/public
mkdir -p _deploy/db && cp -r db/migrations db/bootstrap.js db/seed _deploy/db/
cp Dockerfile.deploy _deploy/
cp -r jobs _deploy/jobs
mkdir -p _deploy/tools && cp -r ../.claude/skills/ai-daily-digest _deploy/tools/ai-daily-digest
tar czf deploy.tgz -C _deploy .

# 3. 上传并解包
scp web/deploy.tgz shadowsky:/tmp/
ssh shadowsky 'cd /www/wwwroot/shadowquake-v2 && tar xzf /tmp/deploy.tgz'

# 4. 重建镜像 + 换容器（数据都在挂载卷里，容器可随意重建）
ssh shadowsky 'cd /www/wwwroot/shadowquake-v2 && \
  docker build -f Dockerfile.deploy -t shadowquake-v2:latest . && \
  docker rm -f shadowsky-v2 ; \
  docker run -d --name shadowsky-v2 --restart unless-stopped \
    -p 127.0.0.1:3001:3000 --env-file .env \
    -v /www/wwwroot/shadowquake-v2/db:/app/db \
    -v /www/wwwroot/shadowquake-v2/content:/app/content \
    -v /www/wwwroot/shadowquake-v2/data/uploads:/app/public/uploads \
    shadowquake-v2:latest'

# 5. 验证（必须两条都测：直连容器 + 经 nginx，两者不一致说明命中缓存）
ssh shadowsky 'curl -s http://127.0.0.1:3001/blog | md5sum
               curl -s -H "Host: shadowquake.top" http://127.0.0.1/blog | md5sum'
```

### ⚠️ 构建前先确认 `web/.env` 不存在

Next standalone 会把项目根的 `.env` 一并打进产物 → 本地开发用的 `.env`（含 dev 口令）会跟着进镜像。
本地要跑 admin 就用行内变量，别落盘：
```powershell
$env:AUTH_SECRET='dev'; $env:ADMIN_PASSWORD='devpass'; npm run dev
```
打包后自查：`tar tzf deploy.tgz | grep -i "\.env"` 应为空。

### 缓存策略（三层，各管各的）

| 内容 | 头 | 谁在缓存 |
|------|-----|---------|
| 页面 HTML | `max-age=0, s-maxage=60, stale-while-revalidate=86400` | CDN 最多 60 秒；浏览器每次校验 |
| `/_next/static/*` | `max-age=31536000, immutable` | 文件名带 hash，可以放心长缓存 |
| `/api/*` | 不设 | 实时数据，不缓存 |

页面这条是在 `web/next.config.js` 的 `headers()` 里显式收紧的 —— Next 对预渲染页的默认头是
`s-maxage=31536000`（共享缓存可存**一年**），正是它让 nginx 在部署后继续发旧 HTML。
不收紧的话，哪天在 Cloudflare 开个 "Cache Everything" 规则就会重演，
而且更糟：旧 HTML 引用的 chunk 早已随部署删除，用户直接白屏。

### ⚠️ nginx 全局 proxy_cache（2026-07-26 踩过）

宝塔的 `nginx.conf` http 块里有全局 `proxy_cache cache_one;`。Next 的预渲染页会发
`Cache-Control: s-maxage=31536000`，nginx 照单全收缓存**一年** → 部署完容器是新的、
用户看到的还是旧 HTML，而且 `/api`、`/admin` 的响应也会被缓存。

已在 `location /` 里加 `proxy_cache off;` 关掉。若哪天缓存又被面板改回来：
```bash
ssh shadowsky 'grep -n "proxy_cache" /www/server/panel/vhost/nginx/shadowquake.top.conf
               rm -rf /www/server/nginx/proxy_cache_dir/* && nginx -s reload'
```

部署后提醒用户 **Ctrl+Shift+R** 强制刷新绕过 Cloudflare 缓存。

**只改遗留静态页时**：`scp <文件> shadowsky:/www/wwwroot/legacy-static/`，不需要动 v2。
但 `gnz48.html` / `app.js` / `data.js` 的源头在另一个项目 `D:\Projects\GNZ48-Calendar`，
改那边再上传，别直接改线上文件（cron 3:00 会覆盖 data.js/schedule.json/team-g.ics）。

## 定时任务（服务器 crontab）

| 时间 | 任务 |
|------|------|
| 2:30 | Bangumi 同步 → 写 SQLite（`docker run --rm … node jobs/bangumi-sync.cjs`，日志 `/var/log/bangumi-sync-v2.log`） |
| 3:00 | GNZ48 日程更新 `/usr/local/bin/gnz48-update.sh`（跑 `/opt/gnz48-calendar`，产物 cp 到 `legacy-static/`） |
| 4:45 | v2 备份 `backup-v2.sh` → `/www/wwwroot/_backups/v2/`，保留 14 份 |
| 9:03 | AI 日报 `run-digest-v2.sh`（宿主 tsx 跑 `shadowquake-v2/tools/ai-daily-digest`，密钥读 `tools/digest.env`，输出到 `content/ai-daily` 并重建 index.json，日志 `/var/log/ai-daily-v2.log`） |

改 crontab 前先 `crontab -l > /root/crontab.bak.$(date +%Y%m%d-%H%M%S)`。

## 备份与回滚

- **数据**：`/www/wwwroot/_backups/v2/v2-<时间戳>.tar.gz`（含 `db` + `content` + `data/uploads`），每日 4:45，保留 14 份。
- **异地备份（已启用）**：本机每日 12:00 由 Windows 计划任务「ShadowQuake 备份异地同步」
  跑 `scripts/pull-backup.sh`——校验 md5、自检包内容后落到 `_backups/`（保留 30 份），
  再提交推送到**私有仓库** `Harrington1106/shadowquake-backups`（恢复步骤见该仓库 README）。
  于是共三份：服务器 14 份、本机 30 份、GitHub 全量历史。
  备份包**不含密钥**（`AUTH_SECRET`/`ADMIN_PASSWORD`/Bangumi token 都在服务器 `.env` 里，
  数据库 `app_settings` 只有 `bangumi_username`），但含访客 IP 数据，仓库须保持 private。
- **R2 异地备份（可选，未启用）**：本地备份和数据在**同一块盘**上，防误删不防掉盘。
  `scripts/backup-offsite.py` 已就位（零依赖，标准库手写 SigV4；这台 ECS 装不了 rclone/boto3），
  `backup-v2.sh` 打包后会自动调用它——但只在 `tools/r2.env` 存在时生效，否则安静跳过。
  启用步骤：Cloudflare 开通 R2 → 建桶 → 生成**仅对该桶可读写**的 API Token →
  在服务器写 `/www/wwwroot/shadowquake-v2/tools/r2.env`（600）：
  ```
  R2_ACCOUNT_ID=…
  R2_ACCESS_KEY_ID=…
  R2_SECRET_ACCESS_KEY=…
  R2_BUCKET=…
  R2_KEEP_DAYS=90
  ```
  然后 `python3 tools/backup-offsite.py --check` 验证可写可删，`--list` 看远端列表。
- **⚠ 磁盘**：镜像每个约 1.5GB，2026-08-01 攒到 18 个 rollback 把 40G 盘塞满（100%），
  `docker build` 直接 `ENOSPC` 失败。现在 `deploy-v2.sh` 每次构建前只保留最近 3 个 rollback，
  并在验证阶段打印磁盘占用、超过 85% 报警。手工清理：
  `docker images shadowquake-v2` 挑旧 tag `docker rmi`，再 `docker builder prune -f`。
- **回滚上一个版本**：每次 `deploy-v2.sh` 都会把旧镜像打成 `shadowquake-v2:rollback-<时间戳>`，
  `docker rm -f shadowsky-v2 && docker tag shadowquake-v2:rollback-<时间戳> shadowquake-v2:latest` 后重跑 run 命令。
- **回到 v1**（2026-07-26 后已不是秒切）：先从 `_backups/v1-final-20260726-084131.tar.gz`
  恢复旧站目录、重建 PM2 进程，再换 nginx 配置。代码基线 tag `v1-static-baseline`。

## 遗留系统（2026-07-26 已清理）

v1 整套已下线并删除：PM2 进程 `shadowsky-admin` 已 `pm2 delete`、旧站根目录
`/www/wwwroot/47.118.28.27/` 已删除、4:30 的旧数据备份 cron 已移除。
删除前整目录打包在 **`/www/wwwroot/_backups/v1-final-20260726-084131.tar.gz`（48MB）**，
含旧 `.env`、`api/data/`、`public/data/`、Express 后端源码。

还活着的遗留件都已搬出旧目录：

| 东西 | 现在在哪 |
|------|---------|
| gnz48 页 + 日历订阅 | `/www/wwwroot/legacy-static/`（nginx root，48KB；旧 css/js/public/img 已于 2026-08-01 删除，全量包在 `_backups/legacy-static-full-20260801-105155.tar.gz`） |
| AI 日报工具链 | `/www/wwwroot/shadowquake-v2/tools/ai-daily-digest` |
| 日报所需密钥（SILICONFLOW_*） | `/www/wwwroot/shadowquake-v2/tools/digest.env`（600） |
| gnz48 数据生成 | `/opt/gnz48-calendar`（cron 3:00，产物 cp 到 legacy-static） |

注意：`gnz48.html` 的真实来源仍是另一个项目 `D:\Projects\GNZ48-Calendar\public\`。
本仓库不再保留任何 v1 文件；要考古看 tag `v1-static-baseline`。
回滚到 v1 已不再是"改 nginx 就行"——需要先从上面那个 tar 包恢复目录。

## 编码规范

- 中文注释，英文变量名（camelCase），4 空格缩进
- v2 组件写在 `web/components/`，UI 基础件优先用 `components/ui`（shadcn）
- 服务端读写数据一律走 `lib/db.js` + `lib/schema.js`（Drizzle），不要自己开 sqlite 连接
- 外部 URL 抓取必须走 `lib/proxyFetch.js`（内含 `lib/ssrf.js` 防护），不要裸 `fetch` 用户传入的地址
- 用户输入不插 `innerHTML`；Markdown 渲染后过 `dompurify`
- `new Date` 注意时区（服务器 CST）
- 密钥只进 `.env`，不进仓库

## 故障排查

### 站点 5xx / 白屏
```bash
ssh shadowsky 'docker ps -a | grep shadowsky-v2; docker logs --tail 50 shadowsky-v2'
ssh shadowsky 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/'
```
容器挂了直接 `docker restart shadowsky-v2`；镜像坏了按「部署」第 4 步重建。

### better-sqlite3 段错误 / GLIBC 报错
宿主是 glibc 2.32 + Node 20，装不动 better-sqlite3@13（需要 GLIBC 2.33 + Node 22 ABI）。
**不要在宿主裸跑 v2**——必须用 `node:22-slim` 容器，镜像内 `npm install better-sqlite3`（apt 走阿里云镜像，npm 走 npmmirror）。

### 部署后仍是旧版
按顺序排查（一步步缩小范围）：
```bash
# 1. 容器里的产物新不新
ssh shadowsky 'docker exec shadowsky-v2 grep -c nav-glass /app/.next/server/app/blog.html'
# 2. 直连容器 vs 经 nginx —— 不一致就是 nginx proxy_cache(见「部署」章节)
ssh shadowsky 'curl -s http://127.0.0.1:3001/blog | md5sum
               curl -s -H "Host: shadowquake.top" http://127.0.0.1/blog | md5sum'
```
两处都新 → 才是 Cloudflare/浏览器缓存：用户 Ctrl+Shift+R；仍不行就 Cloudflare → 缓存 → 清除所有。

### Bangumi 同步失败
先确认 Worker 在线：
```bash
ssh shadowsky 'curl -sS --max-time 10 https://bangumi.shadowquake.top/v0/users/shadowquake -H "Authorization: Bearer <TOKEN>"'
```
Worker 正常但同步失败 → 查 `/var/log/bangumi-sync-v2.log` 和 `.env` 里的 `BANGUMI_API_BASE`。

### AI 日报没更新
`tail -30 /var/log/ai-daily-v2.log`。脚本发现当天 md 已存在会直接跳过；缺 key 时看旧站 `.env` 的 `SILICONFLOW_API_KEY`。

### 后台登录不上
口令是 `.env` 的 `ADMIN_PASSWORD`；改了 `AUTH_SECRET` 会让所有已签发 cookie 失效，改完要重建容器。
