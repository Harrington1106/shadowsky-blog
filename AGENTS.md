# ShadowQuake Blog (v2)

个人 ACG 博客 **shadowquake.top**，部署在阿里云 ECS (47.118.28.27, Hangzhou)，前端走 Cloudflare CDN。

**2026-07-25 起**：站点由 **v2**（`web/` 目录的 Next.js 15 全栈应用 + SQLite）接管。
旧 v1（14 个静态 HTML + Express `admin/server.js`:3000 + PHP `api/`）**仍在原地保留**，但 nginx 只把少数遗留路径指向它，观察期结束后清理。改任何东西前先确认改的是 v2 还是遗留件。

## 生产架构

```
用户 → Cloudflare DNS/CDN → nginx (47.118.28.27:80/4443)
        │
        ├── 遗留静态（root = /www/wwwroot/47.118.28.27/）
        │     /gnz48.html            GNZ48 日程页
        │     /ai-daily/*.html       旧 AI 日报归档页
        │     /team-g.ics /schedule.json
        │     /css/ /js/ /public/ /img/legacy/  （上面两个页面还在引用）
        │     /favicon.ico
        │
        └── 其余全部 /  → proxy_pass 127.0.0.1:3001
                          → Docker 容器 shadowsky-v2（Next standalone，容器内 :3000）

旧 *.html 路径 301 → v2 干净 URL（/blog.html → /blog，以此类推）

外部依赖：bangumi.shadowquake.top（Cloudflare Worker）
  ├─ BANGUMI_API_BASE  → 代理 api.bgm.tv（国内 ECS 直连不通）
  └─ FETCH_PROXY_BASE  → 书签抓简介等出站请求的回退代理
```

nginx 配置：`/www/server/panel/vhost/nginx/shadowquake.top.conf`（宝塔面板路径，改完 `nginx -t && nginx -s reload`）

## 项目结构

```
D:\Projects\shadowsky-blog\
├── web/                        ★ v2 全栈应用（几乎所有开发都在这里）
│   ├── app/                    Next App Router
│   │   ├── (页面) blog post moments bookmarks rss acg anime manga edits about
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
├── scripts/
│   ├── backup-v2.sh            v2 备份（cron 4:45）
│   ├── run-digest-v2.sh        AI 日报（cron 9:03）
│   └── backup-data.sh          旧站数据备份（cron 4:30，遗留）
├── .claude/skills/ai-daily-digest/   AI 日报工具链（digest.ts / gen-index.py）
├── workers/                    Cloudflare Worker 源码（bangumi-proxy.js 等）
├── nginx/                      nginx 配置副本
│
└── ── 以下为 v1 遗留，除 gnz48/日历外基本冻结 ──
    ├── *.html                  旧静态页（只有 gnz48.html 还在线上生效）
    ├── js/ css/                旧前端资源（gnz48/ai-daily 归档页仍在引用）
    ├── admin/                  旧 Express 后台（server.js:3000，PM2 里还开着但没流量）
    ├── api/                    旧 PHP API（php-fpm 已停）
    ├── ai-daily/               旧 AI 日报静态归档
    ├── calendar/               GNZ48 日历脚本（服务器上已被 /opt/gnz48-calendar 取代）
    └── deploy-web.sh / deploy-gnz48-*.sh / deploy.sh  旧部署脚本，勿用于 v2
```

## 技术栈（v2）

- **框架**：Next.js 15（App Router，`output: 'standalone'`）+ React 19
- **样式**：Tailwind CSS v4 + shadcn/ui（`components/ui`）
- **图标**：`lucide-react`
- **数据库**：SQLite（better-sqlite3 13 + Drizzle ORM），WAL 模式
- **文章 / AI 日报**：Markdown 文件（`marked` + `highlight.js` + `katex` 渲染，`dompurify` 净化）
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
> 旧站根目录的 `.env`（`/www/wwwroot/47.118.28.27/.env`）仍被 AI 日报脚本读取（`SILICONFLOW_API_KEY` 等）。

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

# 2. 组装部署产物（standalone 自包含，不含 node_modules 之外的东西）
rm -rf _deploy && mkdir -p _deploy
cp -r .next/standalone _deploy/standalone
cp -r .next/static     _deploy/static
cp -r public           _deploy/public
mkdir -p _deploy/db && cp -r db/migrations db/bootstrap.js db/seed _deploy/db/
cp Dockerfile.deploy _deploy/
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

**只改遗留静态页（gnz48.html 等）时**：`scp gnz48.html shadowsky:/www/wwwroot/47.118.28.27/`，不需要动 v2。

## 定时任务（服务器 crontab）

| 时间 | 任务 |
|------|------|
| 2:30 | Bangumi 同步 → 写 SQLite（`docker run --rm … node jobs/bangumi-sync.cjs`，日志 `/var/log/bangumi-sync-v2.log`） |
| 3:00 | GNZ48 日程更新 `/usr/local/bin/gnz48-update.sh`（跑 `/opt/gnz48-calendar`，产物 cp 到旧站根目录） |
| 4:30 | 旧站数据备份 `scripts/backup-data.sh`（遗留，清理旧系统时一起删） |
| 4:45 | v2 备份 `backup-v2.sh` → `/www/wwwroot/_backups/v2/`，保留 14 份 |
| 9:03 | AI 日报 `run-digest-v2.sh`（复用宿主 tsx 跑 `.claude/skills/ai-daily-digest`，输出到 v2 `content/ai-daily` 并重建 index.json，日志 `/var/log/ai-daily-v2.log`） |

改 crontab 前先 `crontab -l > /root/crontab.bak.$(date +%Y%m%d-%H%M%S)`。

## 备份与回滚

- **数据**：`/www/wwwroot/_backups/v2/v2-<时间戳>.tar.gz`（含 `db` + `content`），每日 4:45，保留 14 份。
- **整站回滚到 v1**：nginx 配置备份 `/www/server/panel/vhost/nginx/shadowquake.top.conf.bak.20260725-195613`，`cp` 回去 + `nginx -s reload` 即秒切旧站（旧 Express 进程一直在 PM2 里开着）。
- **代码基线**：tag `v1-static-baseline`。

## 遗留系统现状（观察期，勿随手删）

| 组件 | 状态 |
|------|------|
| Express `admin/server.js`（PM2 `shadowsky-admin`:3000） | 在线但 **nginx 已不再转发**，零流量，留作回滚 |
| PHP-FPM + `api/*.php` | 已停（`php-fpm` inactive） |
| 旧静态页 `*.html` | 只有 `gnz48.html` + `/ai-daily/*.html` 仍对外；其余被 301 到 v2 |
| `gnz48.html` | 线上版本的**真实来源是另一个项目** `D:\Projects\GNZ48-Calendar\public\`（`deploy-gnz48-upload.sh` 上传）。本仓库里的 `gnz48.html` 是旧副本，已与线上分叉，**不要拿它去覆盖线上** |
| 日程数据 `schedule.json` / `team-g.ics` / `data.js` | 服务器 `/opt/gnz48-calendar` 每天 3:00 生成并 cp 到旧站根目录 |
| `calendar/sync.py` | **已废弃**：服务器上不存在，2026-07-26 已从 crontab 删除失效任务；实际生效的是 `/opt/gnz48-calendar` |
| `deploy-web.sh` / `deploy.sh` / `deploy-gnz48-*.sh` | v1 时代脚本，**不要用来部署 v2** |

清理旧系统时的顺序建议：先停 PM2 进程观察几天 → 再删 nginx 里的遗留 location（连同 gnz48/ai-daily 的去留决策）→ 最后删旧站根目录（先打包备份）。

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
