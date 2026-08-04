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
        ├── /uploads/*  → alias /www/wwwroot/shadowquake-v2/data/uploads/（2026-08-04 起）
        │                 nginx 直接发，不进 v2。见下方「⚠ /uploads 必须由 nginx 发」
        │
        └── 其余全部 /  → proxy_pass 127.0.0.1:3001
                          → Docker 容器 shadowsky-v2（Next standalone，容器内 :3000）

旧 *.html 路径 301 → v2 干净 URL（/blog.html → /blog，以此类推）

阅读页地址（2026-08-01 起）：
  文章 `/post/<slug>`（slug = 文件名去掉 .md）  日报 `/ai-daily/<YYYY-MM-DD>`
  三代老地址都还通：`/post.html?file=x.md` → `/post?file=x.md` → `/post/x`（app/post/page.js 做 308），
  `/ai-daily/<date>.html` → `/ai-daily/<date>`（nginx 301）。`app/post/page.js` 是兼容层，别删。

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
1. ~~**让 Cloudflare 边缘缓存 HTML**（Cache Rule）~~ **2026-08-01 已做，但收益远低于预期**。
   实测发现关键事实：**CF 免费版把大陆流量路由到 LAX（洛杉矶）**，不是港/日
   （`curl https://www.cloudflare.com/cdn-cgi/trace` 从大陆本机和杭州源站出去，`colo` 都是 LAX）。
   所以「命中就不走美国」这个前提根本不成立 —— 边缘本身就在美国。
   实测：命中 TTFB 0.7–0.9s（其中光是握到 LAX 就要 TCP 0.19s + TLS 0.41s），
   未命中仍是 1.2–2.5s。本站流量稀疏 + 60s TTL + 每台边缘机各自一份缓存 → 大多数请求是 MISS。
   还能榨的两点：开 **Tiered Cache**（免费版可用，未命中先找上层而不是直接跨太平洋回源）、
   把边缘 TTL 拉长并在部署时清缓存。
   ⚠ 开缓存必须同时处理 RSC：见下方「RSC 与边缘缓存」。
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
  渲染结果过 **`sanitize-html`** 白名单（2026-08-01 起）：白名单必须同时覆盖我们自己生成的
  标记（代码块的 `pre/div/button/svg`、复制按钮、标题 id）和内容里真正用到的原生 HTML
  （`<details>/<summary>/<br>`）；**iframe 只放行 bilibili 域名**，内联样式只放行布局属性。
  改白名单后务必逐篇比对结构计数，漏一项就是可见的功能损坏。
  `/rss` 页的外部内容仍走客户端 `dompurify`。
- **鉴权**：`jose` 签发 JWT，httpOnly cookie，`middleware.js` 保护 `/admin`
- **运行**：Docker 容器 `shadowsky-v2`（`node:22-slim`），`restart=unless-stopped`，约 100MB 内存
- **CDN/代理**：Cloudflare（DNS + Worker）

## 片刻 / 收藏两页（2026-08-03 UI 改版）

结构仍是常规的「`page.js` 只出 metadata + `XxxContent.js` 客户端拉 `/api` 渲染」。
下面几条是改版时踩出来的，动这两页之前先看一眼。

**片刻（`web/app/moments/MomentsContent.js`）**

- 三个视图走 `?view=` 深链：`feed`（瀑布，默认）/ `wall`（照片墙）/ `timeline`（时间线）；
  单条仍是 `?id=`，另有 `?tag=` `?q=`
- **`/api/moments` 不返回图片尺寸**（库里就没存），所以瀑布的占位框先按 4:5 撑开，
  `onLoad` 量出 `naturalWidth/Height` 再写回真实比例。首屏 8 张必须 `eager` ——
  懒加载会让比例陆续填进来、分列跟着重算，用户正读的那张卡会左右跳
- 分列**不能**按 `i % cols` 轮流塞：一条长文案就能把某一列拉长半屏、右边几列早早见底。
  现在按 `estimateHeight()` 往当前最矮的列填，高度相同时留在最左，保住「横着读是倒序」
- 文案 / 日期 / 地点 / 标签**常驻可见**，别再改回「只在 hover 浮出」——
  触屏没有 hover，改版前那套在手机上等于一条信息都不给
- 灯箱有 `DialogTitle`（`sr-only`）。base-ui 的 Dialog 少了它，屏读器读不出这是什么对话框；
  另外 `DialogContent` 基类是 `grid`，要盖成 flex 必须显式写 `flex`（tw-merge 只在同组内去重）

**收藏（`web/app/bookmarks/BookmarksContent.js`）**

- 列表容器是 `grid`，**别换回 `columns-*`**：CSS 多列是列优先排版，阅读顺序会变成
  「一列到底再换下一列」，各列长度也没法平衡
- 分类导航宽屏在左侧吸顶栏、窄屏降级成横滚胶囊（`lg:hidden`），两边同一份 `catCounts`
- 子分类名取自 `categories[父分类].subcategories`（`{slug: 中文名}`），查不到才落
  `SUB_FALLBACKS`，再查不到直接显示 slug —— 库里分类元信息不全时页面上会看见英文 slug，
  那是数据问题不是显示 bug
- 站点图标只查 `lib/iconMirror` 的本地镜像，查不到就显示域名首字母块。
  **不允许**回退到任何在线 favicon 服务（见「前端零跨境依赖」）

**两页共用**

- 筛选胶囊的交互态统一走 `lib/utils.js` 的 `chipInteractive()`（`/blog` 也在用，改一处三页都变）
- ⚠ 胶囊横滚条上的 `py-1 -my-1` 不能删：CSS 规定一个轴非 `visible` 时，另一个轴的
  `visible` 会被算成 `auto` —— 横向滚动区在**纵向同样是裁剪区**，胶囊 hover 上移的那 1px
  连同投影会被整齐切掉。内边距留余量、负外边距抵消回去，视觉间距不变

## 数据存储

| 数据 | 位置（服务器） | 容器内路径 |
|------|----------------|-----------|
| 结构化数据（书签/随手拍/媒体/订阅/视频/统计/设置…） | `/www/wwwroot/shadowquake-v2/db/shadowquake.db` | `/app/db/shadowquake.db` |
| 文章 Markdown | `/www/wwwroot/shadowquake-v2/content/posts` | `/app/content/posts` |
| AI 日报 Markdown + index.json | `/www/wwwroot/shadowquake-v2/content/ai-daily` | `/app/content/ai-daily` |
| 上传图片 | `/www/wwwroot/shadowquake-v2/data/uploads` | `/app/public/uploads`（挂着，但**不由它对外发**） |

这三个目录是**容器的 volume 挂载**，即全部生产数据。备份脚本打包 `db` + `content` 两项。

### ⚠ `/uploads` 必须由 nginx 直接发（2026-08-04 踩过，全站封面消失一整天）

**Next standalone 在启动时把 `public/` 递归扫成一个 Set，之后只查这个 Set** ——
容器启动后新增的文件一律 404，哪怕它就躺在挂载卷里、`docker exec ls` 看得见。
而「发文章镜像封面」正是往这个卷里丢新文件，于是每张新封面都要等下次重启容器才出得来。

诊断姿势（三步就能定位，别一上来怀疑 CF）：
```bash
ssh shadowsky 'docker exec shadowsky-v2 ls -la /app/public/uploads/covers/<x>.webp   # 文件在
               curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/uploads/covers/<x>.webp
               docker inspect -f "{{.State.StartedAt}}" shadowsky-v2'   # 文件比它新 → 就是这个
```
现在 nginx 有 `location ^~ /uploads/`（alias 到宿主目录 + `immutable`），发文即可见、不用重启，
也省掉一趟 Node 转发。文件名本来就是内容唯一的（封面=源 URL 的 sha1，随手拍=时间戳+随机），
所以敢上 30 天 immutable。**别把这条 location 删掉退回给 v2**。

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
bash scripts/deploy-v2.sh                            # 完整部署
bash scripts/deploy-v2.sh --skip-build               # 复用现有 .next
bash scripts/deploy-v2.sh --skip-build --skip-upload # 包已经在服务器 /tmp,别再传 28MB
```

⚠ **上传这一跳会抽风**：2026-08-04 实测连续两次 `Connection reset`，手工重传成功但只有
78KB/s（28MB 传了 6 分钟）。脚本现在自动重试 3 次，传完一律比对 md5 才继续
（scp 断在半路也可能返回 0，拿半个 tar 去 `docker build` 只会报一堆看不懂的错）。
链路实在不行就先手工 `scp web/deploy.tgz shadowsky:/tmp/`，回头 `--skip-upload` 接着跑。
⚠ `--skip-upload` **同时跳过打包** —— tar 不是字节可复现的，重打一次 md5 就变了，
那样永远和服务器上那个包对不上，flag 等于白给。它的语义是「服务器上那个包正是我要部署的」。

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
| 页面 HTML | `max-age=0, s-maxage=3600, stale-while-revalidate=86400` | CDN 最多 1 小时；浏览器每次校验 |
| `/_next/static/*` | `max-age=31536000, immutable` | 文件名带 hash，可以放心长缓存 |
| `/api/*` | 不设 | 实时数据，不缓存 |

页面这条是在 `web/next.config.js` 的 `headers()` 里显式收紧的 —— Next 对预渲染页的默认头是
`s-maxage=31536000`（共享缓存可存**一年**），正是它让 nginx 在部署后继续发旧 HTML。
不收紧的话，哪天在 Cloudflare 开个 "Cache Everything" 规则就会重演，
而且更糟：旧 HTML 引用的 chunk 早已随部署删除，用户直接白屏。

### 前端零跨境依赖（2026-08-01 起）

源站压到 0.7s 后，页面真正的等待全在外部域名上（大陆实测）：`fonts.loli.net` TTFB 4.89s、
`cdnjs.cloudflare.com` 3.66s、`images.unsplash.com` 整图下载 3.98–15.19s。已全部清除：

| 原依赖 | 现在 | 维护方式 |
|--------|------|----------|
| 4 套 Google 字体 | **删除**（查证从未被使用，`--font-sans` 是系统栈） | 要上字体请用 `next/font` 自托管 |
| cdnjs 的 hljs 主题 | 内联进 `app/hljs-theme.css`，按 `html.dark` 作用域 | `node scripts/gen-hljs-css.mjs` |
| unsplash 封面 | 镜像到 `public/img/covers/*.webp`（文件名=URL 的 sha1，`immutable`） | `node scripts/mirror-covers.mjs` |
| 分类默认图（已 404） | 本地星空兜底图 | `node scripts/gen-fallback-cover.mjs` |
| 收藏页 Google favicon（大陆**不通**） | 镜像到 `public/img/favicons/*.webp`，未收录用域名首字母块 | `node scripts/mirror-icons.mjs` |
| 关于页 simpleicons CDN | 镜像到 `public/img/icons/*.svg`（深浅各一份） | 同上 |
| 片刻的 Google 地图链接 | 改用高德（大陆点得开） | — |

⚠ **扫描外部依赖时别只看服务端 HTML** —— 收藏页 favicon、关于页社交图标都是客户端
运行时才拼出来的地址，只扫 SSR HTML 会漏掉。要连 `/_next/static/chunks/*.js` 一起 grep。
**收藏/社交链接变动后重跑 `mirror-icons.mjs`**；不跑不会坏，只是新域名显示字母块。

**新文章用了外链封面 → 部署前跑一次 `mirror-covers.mjs`**；不跑不会坏，只是那张图仍走外链。
封面镜像同时作用于文章头图、列表缩略图和 og:image。

**封面是两张，不是一张**（2026-08-04 起）：`mirrorImage` 一次出 `<hash>.webp`（宽 1600 内，
给文章头图和 og:image）和 `<hash>.thumb.webp`（宽 240，给 `/blog` 列表）。
起因是列表那个 64–80px 的小方框一直在拉 1000px 的原图 —— 按面积算下载的像素是用到的
150 倍，首屏 11 张 664KB，每张还都要跨太平洋，浏览器的转圈要等它们全部结束。
换成缩略图后同样 11 张只有 55KB。
前端按 `lib/coverMirror.js` 的 `coverThumb()` 拼地址（只对 `/uploads/covers/` 生效），
拿不到就回落原图，两张都挂才隐藏。**改文件名规则要三处一起改**：`post-meta.mjs` 的
`thumbName()`、`coverThumb()`、以及补历史欠账的 `gen-cover-thumbs.mjs`。

### Cloudflare 边缘缓存与清缓存（2026-08-01 起）

Cache Rule「边缘缓存页面 HTML」+ Tiered Cache（Smart）已开启，页面 HTML 边缘缓 1 小时。
**TTL 敢拉长的前提是内容一变就清边缘**，三条路径都已接好，缺凭据时全部静默跳过：

| 时机 | 清什么 | 代码 |
|------|--------|------|
| 部署后 | 全站 | `deploy-v2.sh` 换完容器即调用（旧 HTML 引用的 chunk 已删，不清会白屏） |
| 后台改/删文章 | 该文 + `/` + `/blog` + `/sitemap.xml` | `web/lib/cfPurge.js`（挂在 `/api/posts` 的 PUT/DELETE） |
| cron 出日报 | `/` `/blog` `/ai-daily/<date>` `/sitemap.xml` | `run-digest-v2.sh` |

凭据：`/www/wwwroot/shadowquake-v2/tools/cf.env`（600，只有 `CF_ZONE_ID` + `CF_PURGE_TOKEN`，
token 权限仅 `Zone → Cache Purge`）。容器不抄一份，`docker run` 再挂一个 `--env-file`。
手工清：`ssh shadowsky 'bash /www/wwwroot/shadowquake-v2/tools/cf-purge.sh [/路径 …]'`

只有 `/post/*` 与 `/ai-daily/*` 是服务端渲染正文，靠 purge 保新鲜；`/blog`、`/moments`、
ACG 各页是壳 + 客户端读 `/api`（`/api` 从不缓存），壳缓 1 小时也不影响数据实时性。

实测（大陆本机，全部命中后）：TTFB 0.66–1.53s，中位约 0.70s；改造前 0.82–3.3s。
剩下的延迟是大陆↔LAX 那一跳，缓存已经无能为力。

### ⚠️ RSC 与边缘缓存（2026-08-01 踩过，出过线上事故）

同一个 URL，Next 对**带 `RSC` 头**的请求返回的是 flight 数据（`1:"$Sreact.fragment"…`）
而不是 HTML。响应里有 `Vary: rsc,…`，但 **Cloudflare 默认忽略 Vary**
（官方文档：*by default, Cloudflare does not consider vary values in caching decisions*），
两种响应共用同一个缓存键 → 开了边缘缓存后普通访客会拿到 flight 数据，页面全是乱码。
实测 8 轮里 6 轮中招。

**只在 Cache Rule 表达式里排除 RSC 请求不够** —— 被排除的请求走「默认行为」，
照样读写同一条缓存条目。正解是在源头分流（`next.config.js` 的 `headers()`）：

| 请求 | Cache-Control |
|------|---------------|
| 普通文档请求（`missing: RSC`） | `public, max-age=0, s-maxage=60, stale-while-revalidate=86400` |
| 带 `RSC` 头（`has: RSC`） | `private, no-store` |

改完 RSC 请求在边缘是 `BYPASS`，写不进缓存。验证（用随机 query 造全新缓存条目，
先打 RSC 再打普通请求，看普通请求拿到的是不是 `<!DOCTYPE`）：
```bash
U="https://shadowquake.top/blog?cb=$RANDOM"
curl -sI --noproxy '*' -H "RSC: 1" "$U" | grep -i cf-cache-status   # 应为 BYPASS
curl -s  --noproxy '*' "$U" | head -c 12                            # 应为 <!DOCTYPE
```

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

### 单篇修订记录（2026-08-02 起）

服务器上的 `content/` 是一个 **git 仓库**，`tools/content-snapshot.sh` 每 10 分钟提交一次变化，
并生成 `content/.revisions.json`（每篇最近 20 条修订：时间 + 增删行数 + commit）。

为什么要这样：文章正文在 Obsidian 里写完、由脚本推上服务器，**不经过站点**（后台编辑器只能改
frontmatter），所以「保存时记一笔」只覆盖一半。git 无论从哪条路进来的改动都能抓到，还自带 diff 与回滚。
容器里没有 git（`node:22-slim`），所以脚本跑在宿主，站点只读那个 JSON。

⚠ 两处联动，改的时候别漏：
- `pull-content.sh` 必须排除 `.git` / `.gitignore` / `.revisions.json` —— 整目录 tar 回本仓库会套出
  嵌套 git，内容镜像直接失效
- `.revisions.json` 是派生文件，服务器上的 `content/.gitignore` 已把它排除，否则每次生成都算一次变化，
  会无限自我提交

手工查看：`ssh shadowsky 'git -C /www/wwwroot/shadowquake-v2/content log --oneline'`
某篇的历史：`git -C …/content log --follow -p -- posts/<file>.md`

**页面上还没有展示** —— 先让它攒一段时间真实数据，内容太少时露出「修订 N 次」反而显得空。

## 写文章工作流（2026-08-02 起）

**发文章不需要部署。** 文章正文是挂载卷里的文件（`content/posts`），不在 Docker 镜像里；
`lib/posts.js` 的索引只缓存 30s，正文按文件 mtime 失效。丢一个 `.md` 上去 + 清 CF 缓存就生效。
`deploy-v2.sh` 只在改了 `web/` 代码时才需要。

**四个入口，按场景挑：**

| 场景 | 用什么 |
|------|--------|
| 开写一篇新的 | Obsidian 命令面板 → **Templater: 新建：新文章**（`content/drafts` 就是库，见下） |
| 想看着排版决定发不发 | 双击桌面「发布台」图标，或 `cd web && npm run post:ui` |
| 就想快速发一篇 | `cd web && npm run post` — 交互式命令行 |
| 脚本 / 自动化 | `node scripts/publish-post.mjs <文件>` |

**`content/` 本身就是一个 Obsidian 库**（2026-08-03 起，库根就在 `content/`），所以
Obsidian 存盘 = 草稿箱立刻可见，中间没有复制/同步。库里：`drafts/` 写作区、
`_templates/新文章.md`（Templater 模板，问标题/slug/分类/标签/封面，自动改名成
`<日期>-<slug>.md`）、`_docs/使用说明.md`，以及只读的 `posts/` `ai-daily/` 两份线上镜像。
分类清单与「slug 是否已被占用」都从 `content/posts` 现读，不写死。
只有 **`drafts/` 这一层**的 `*.md` 会被发布台列出来（`DRAFTS_DIR`），
`_templates` / `_docs` 不在这一层，所以不会混进去。
主题是 Phycat 0.2.9（从别的库搬来）：**只拷 `manifest.json` + `theme.css`**，
原目录里的 `.git` 千万别带 —— 会在本仓库里套出嵌套 git，和 `pull-content.sh` 那条坑同源。

⚠ 库里 `propertiesInDocument` 特意设成 `source`（不是默认的 `visible`）：
Obsidian 的属性编辑器会把 `tags: ["a","b"]` 重排成多行 YAML，而线上解析器只认单行 JSON
数组，改回去就是「文章标签全空」。插件二进制与主题本体不进 git（见 `content/.gitignore`），
但库配置和模板进 —— 换机器时重装 Templater 即可，设置是现成的。
Templater **2.24.3**（2026-08-03 从 2.20.6 升上来，Obsidian 已自动升到 1.13.4）。

**插件汉化**：`node scripts/obsidian-i18n.mjs`（`--check` 体检 / `--restore` 还原）。
只有 Templater 需要它 —— 那个插件没有任何 i18n，只能替换打包后的字面量；
`Image auto upload` 自带 zh-cn 词典，跟 Obsidian 界面语言走，别去改它的 `main.js`。
脚本每次都从 `main.js.orig` 重新生成（幂等），译文表在 `scripts/obsidian-i18n.templater.json`。
它会校验三件事：键在源码里真实存在、译文引号闭合、**键值的代码骨架逐字符相同**
（`setTooltip("x")` 不能被翻成 `setToolTip("译")`，`` `Insert ${i}` `` 里的 `${i}` 不能丢），
最后过一遍 `node --check`，不通过就不写盘。
⚠ **插件升级会覆盖汉化**，升完重跑一次；`--check` 会列出新增的、表里还没有的英文文案。
2.20 → 2.24 就是个例子：设置页从 `setName()/setDesc()` 改成了声明式的 `{name, desc, heading}`，
163 条里当时有 59 条对不上，全靠 `--check` 报出来。译文表里的 `_skip` 是**故意不翻**的清单
（tp.* 那套自动补全文档是 API 说明，翻了反而和官方文档对不上）。

**桌面启动器**（2026-08-03 起）：双击「发布台」→ 隐藏启动 node 服务 → 用 Edge 的
`--app=` 模式开一个没有地址栏/标签页的独立窗口。三个件在 `scripts/`：
`post-ui-launcher.vbs`（启动器）、`post-ui.ico`（`make-ico.mjs` 从站点 favicon 生成，手写 ICO
因为 sharp 不输出 ico）、`install-post-ui-shortcut.ps1`（建桌面+开始菜单快捷方式，`-Uninstall` 删）。
**仓库换位置要重跑一次 install 脚本**（快捷方式里是绝对路径）。

⚠ **两个文件的编码不能改**：`.vbs` 必须是 **UTF-16LE + BOM**（WSH 按 ANSI 读，UTF-8 会把
中文字符串撑断报 "Unterminated string constant"；UTF-8 BOM 也不行，它当成非法字符）；
`.ps1` 必须带 **UTF-8 BOM**（Windows PowerShell 5.1 否则按 ANSI 读，同样啃中文）。
服务起来后会一直挂着（约 76MB），下次双击秒开；要停就杀占 4000 端口的那个 node。

**发布台**（`post:ui`，只绑 127.0.0.1）摆在 Obsidian 旁边用：左栏草稿、中间用
**站点自己的渲染管线和样式**做的正文预览（深浅色可切）、右栏自动算好的字段与待镜像图片。
那边 Ctrl+S，这边自动刷新（轮询 mtime）。能新建、能直接改 frontmatter、能先试抓图片、能删草稿。
发布是两步确认，第一步会显示具体要发到哪个地址。

⚠ 界面里改 frontmatter 时**只回写「人写的」字段**：`readTime`/`lastModified` 一律不落盘，
`excerpt` 除非明确填了也不落盘 —— 一旦写进草稿它们就变成手写值，以后改了正文也不会再重算。

**命令行版**（`post`）不带参数：草稿箱空的就问你标题、建一篇；有草稿就列出来选，
先跑预检给你看，再问预览还是发布。

底层的两个脚本仍可单独用（自动化 / CI 走这条）：

```
content/drafts/<file>.md          写作区（本地，不同步到服务器）
   │  node scripts/new-post.mjs "标题" --slug xxx --category 教程 --tags a,b
   ↓
node scripts/publish-post.mjs <file> --dry-run    看会做什么，不碰服务器
node scripts/publish-post.mjs <file> --preview    写进本地 content/posts 用真实列表看排版（未上线）
node scripts/publish-post.mjs <file>              真发
   ↓
校验 frontmatter → 补 excerpt/readTime/lastModified → 镜像跨境图片 → scp → 清 CF → 验证 200
   ↓
bash scripts/pull-content.sh --commit             归档进 git
```

也可以 `/publish <文件名>`。

⚠ `post.mjs` 里的交互提示是自己拉 stdin 行的，没用 `rl.question` ——
后者在 stdin 不是 TTY（管道 / CI）时会挂住不返回，最后抛一个看不懂的
"unsettled top-level await"。改脚本时别换回去。

**正文写法体检**（`lintBody`，发布台与 CLI 共用，只警告不拦发布）：正文 H1 重复标题、
整行粗体当小标题、标题跳级、**代码块没标语言**、**图片缺 alt**、**用了站点不认的语法**
（callout / `==高亮==` / `[[双链]]` / `![[嵌入]]` / 脚注 —— 站点是纯 GFM，这些全是字面量）、
**段落超 180 字**。⚠ 除代码块语言那条外都跑在**剥掉代码块与行内代码**的正文上，
否则讲 Obsidian 语法的教程会把自己报成问题。阈值是拿现有 19 篇量出来的（段落最长 132 字）。

**只写人才知道的字段**：`title` `date` `category` `tags`（`coverImage` 可留空，会落到分类默认图）。
`excerpt` / `readTime` / `lastModified` 一律由脚本算 —— 手写这三个是上一版工作流最容易出错的地方，
现有 19 篇的 `excerpt` 几乎全是把标题又抄了一遍（`BlogContent.js` 的 `trimTitlePrefix` 就是为此打的补丁）。

**图片：PicList 照常用。** 发布时脚本会把正文与封面里所有**跨境**图片地址抓下来、转 webp、
传到服务器 `data/uploads/covers/`（挂载卷，不进镜像），并把地址改写成 `/uploads/covers/<sha1>.webp`。
这是在守「前端零跨境依赖」那条约束 —— GitHub/jsDelivr 在大陆 TTFB 3.7–4.9s，而封面基本就是 LCP 元素。
文件名取源 URL 的 sha1 前 8 位，换图即换名，不用为图片清缓存。
跨境图床下载多半要过代理：`HTTPS_PROXY=http://127.0.0.1:7890 node scripts/publish-post.mjs …`。

⚠ **镜像失败会中止发布**（文章不上线），不再「保持外链继续发」。
原来那样会让「零跨境依赖」被静默破坏 —— 警告淹在输出里，等发现时已经是大陆用户加载 4.5 秒了。
真要带外链发得自己写 `--keep-remote-images`。发布台里可以先点「试抓一遍图片」提前试出来。
`collectImageUrls` 扫的是**剥掉代码块与行内代码**的正文（和 `lintBody` 同一条理由）——
讲前端的教程里 ```html 代码块中的 `<img src="…/YOUR_COVER_IMAGE.jpg">` 是示例不是图片，
不剥就会去抓这个占位地址、404、整篇发不出去。

⚠ 几个约束，改脚本时别踩：
- frontmatter 每个值**必须单行**，且不能含 `---` —— 线上解析器是 `raw.split('---', 3)` +
  逐行 `indexOf(':')`，值里一个换行就能把后面所有字段冲掉
- `tags` 必须是单行合法 JSON 数组（`JSON.parse` 直接吃）
- 文件名就是线上地址 `/post/<slug>`，发布后再改等于换地址、丢外链
- `--preview` 会在本地 `content/posts/` 留一个服务器上没有的文件，
  `pull-content.sh` 会把这类文件单独列出来提醒

`mirror-covers.mjs` 仍然保留，管的是**已经在镜像里**的那批 unsplash 封面和代码里写死的图；
新文章走上面这条路，不再需要它。

## 定时任务（服务器 crontab）

| 时间 | 任务 |
|------|------|
| 2:30 | Bangumi 同步 → 写 SQLite（`docker run --rm … node jobs/bangumi-sync.cjs`，日志 `/var/log/bangumi-sync-v2.log`） |
| 3:00 | GNZ48 日程更新 `/usr/local/bin/gnz48-update.sh`（跑 `/opt/gnz48-calendar`，产物 cp 到 `legacy-static/`） |
| */10 | 内容修订快照 `tools/content-snapshot.sh`（git 提交 + 重建 `.revisions.json`，无变化即退出，日志 `/var/log/content-snapshot.log`） |
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
- **R2 异地备份：已评估并搁置，不要再提议**。卡在账户侧——Cloudflare 开通 R2 必须绑付款方式，
  且不收借记卡（可用国区 PayPal 绑银联储蓄卡）。**站主没有信用卡**，评估后认为为备份不值得走这一步。
  现有三份副本（服务器 14 / 本机 30 / 私有 GitHub 全量历史）已覆盖误删、掉盘、本机丢失三种情况。
  若将来为**图床**开通 R2，可顺带启用备份。
  代码是现成的：`scripts/backup-offsite.py`（零依赖，标准库手写 SigV4；这台 ECS 装不了 rclone/boto3），
  `backup-v2.sh` 打包后会自动调用它——只在 `tools/r2.env` 存在时生效，否则安静跳过。
  真要启用时：Cloudflare 开通 R2 → 建桶 → 生成**仅对该桶可读写**的 API Token →
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
