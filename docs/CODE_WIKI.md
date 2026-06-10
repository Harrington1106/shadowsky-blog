# ShadowSky Blog Code Wiki

## 1. 文档说明

- 文档目标：为当前仓库生成一份基于代码现状的结构化 Wiki，覆盖整体架构、模块职责、关键类与函数、依赖关系、运行方式、部署方式与测试现状。
- 分析范围：仓库根目录静态站点、`js/` 前端脚本、`api/` PHP 接口、`admin/` 管理端与 Node 服务、`nginx/` 部署配置。
- 事实边界：仓库中未发现 `docs/DEVELOPMENT_MANUAL.md`、`docs/` 既有文档集和 `project-state.yml`，因此本 Wiki 只能以当前代码为准，不对历史设计意图作推断。
- 技术基线：项目采用“静态多页面前端 + PHP API + Node 管理后端 + Nginx 反代”的混合架构。

## 2. 仓库总览

```text
shadowsky-blog/
├─ *.html                    # 前台静态页面入口
├─ css/
│  └─ style.css              # 共享样式产物
├─ js/                       # 前端通用脚本与页面模块
├─ api/                      # PHP API、认证、统计、内容读写
├─ admin/                    # 管理后台 UI 与 Node 服务
├─ public/
│  ├─ img/                   # 图片资源
│  └─ posts/                 # Markdown 文章与文章索引
├─ nginx/
│  └─ shadowquake.top.conf   # Nginx 部署配置
├─ sw.js                     # Service Worker
└─ CLAUDE.md                 # 仓库现有开发说明
```

## 3. 整体架构

### 3.1 架构摘要

- 前台是原生 HTML 多页面站点，不依赖前端框架。
- 公共前端能力集中在 `js/main.js`、`js/api.js`、`css/style.css`。
- 内容页和业务页通过各自页面脚本完成渲染，例如博客、随手拍、RSS、媒体和视频。
- 后台管理由 `admin/index.html` + `admin/admin.js` 提供 UI。
- 管理端后端由 `admin/server.js` 提供一套 Node API，并与 `api/*.php` 共同构成双后端模式。
- Nginx 将 `/api/*.php` 转发给 PHP-FPM，将其他路径默认反代给 Node 服务，同时直接托管静态资源。

### 3.2 请求流

```text
浏览器
  ├─ 访问静态页面 -> Nginx -> 根目录 HTML / CSS / JS / public/*
  ├─ 请求 /api/*.php -> Nginx -> PHP-FPM -> api/*.php
  └─ 访问后台或 Node API -> Nginx -> 127.0.0.1:3000 -> admin/server.js
```

### 3.3 运行形态

```text
前台页面
  -> js/api.js 统一请求封装
  -> PHP API 或 Node API
  -> JSON 文件 / KV 存储 / 外部服务

管理后台
  -> admin/admin.js
  -> 优先调用同源 /api
  -> 失败后尝试 localhost:3000/api
  -> 再失败时降级到 Mock / 静态模式
```

## 4. 前端结构

### 4.1 页面入口一览

| 页面 | 入口文件 | 主要脚本 | 主要职责 |
|---|---|---|---|
| 首页 | `index.html` | `js/main.js`、`js/tracker.js`、页内脚本 | 氛围化封面首页、主题与导航壳、访问记录 |
| 博客列表 | `blog.html` | `js/blog.js` | 编辑式内容入口、搜索、分页、多视图切换 |
| 文章详情 | `post.html` | `js/post-viewer.js` | 稳定阅读面板、目录侧栏、代码高亮、推荐阅读 |
| 随手拍 | `moments.html` | `js/moments.js`、`js/activity_chart.js` | 画册式图片流、热力图、标签过滤与工具条 |
| 收藏页 | `bookmarks.html` | `js/bookmarks.js`、`js/bookmarks-admin.js` | 策展型资源目录、搜索、分类导航与精选摘要 |
| RSS | `rss.html` | `js/rss.js` | 三栏阅读工作台、订阅源管理、文章聚合与阅读区展示 |
| ACG 首页 | `acg.html` | `js/media-data.js`、`js/video-loader.js` | ACG 聚合入口、统一 public-shell 壳层、视频聚焦区 |
| 番剧页 | `anime.html` | `js/media-data.js` | 番剧目录页、统一筛选工具条、状态过滤与列表栅格 |
| 漫画页 | `manga.html` | `js/media-data.js` | 漫画目录页、统一筛选工具条、状态过滤与列表栅格 |
| 剪辑页 | `edits.html` | `js/video-loader.js` | 剪辑分类浏览、统一分类工具条与作品栅格 |
| 关于页 | `about.html` | `js/main.js`、页内脚本 | 个人介绍页、故事壳层、互动反馈与信号卡片 |
| 404 页 | `404.html` | 页内脚本 | 错误恢复页、小游戏面板与返回动作区 |

### 4.2 前端共享模块

| 文件 | 核心符号 | 职责 |
|---|---|---|
| `js/main.js` | 全局初始化逻辑 | 全站主题、导航、移动菜单、访问数展示 |
| `js/api.js` | `ApiClient` | 统一封装 API 地址、重试、超时、错误格式 |
| `js/context-menu.js` | 自定义右键菜单逻辑 | 根据上下文动态注入站内菜单 |
| `js/back-to-top.js` | 返回顶部控制器 | 兼容普通页面和特殊滚动容器 |
| `js/click-effect.js` | 点击特效逻辑 | 注入交互反馈效果 |
| `js/tracker.js` | 访问埋点逻辑 | 将页面访问提交到统计接口 |
| `js/cache.js` | `CacheManager`、`StaleWhileRevalidate` | 提供缓存抽象与 SWR 策略 |

### 4.3 页面业务模块

| 文件 | 关键符号 | 核心职责 |
|---|---|---|
| `js/blog.js` | 博客列表控制逻辑 | 加载 `public/posts/posts.json`，实现搜索、分页和多视图 |
| `js/post-viewer.js` | 文章渲染逻辑 | 拉取 Markdown、解析 Front Matter、构建目录和推荐 |
| `js/moments.js` | 随手拍页控制逻辑 | 聚合本地数据与 GitHub Issues，控制视图和筛选 |
| `js/activity_chart.js` | `ActivityChart` | 渲染最近月份活跃折线图 |
| `js/bookmarks.js` | 收藏页控制逻辑 | 分类渲染、检索、标签过滤、缓存控制 |
| `js/bookmarks-admin.js` | 本地管理扩展逻辑 | 在本地环境下接入 GitHub Issues 管理书签 |
| `js/rss.js` | RSS 阅读器控制逻辑 | 订阅源加载、文章聚合、阅读详情展示 |
| `js/media-data.js` | `MediaLoader` | 加载 `media.json`，渲染动漫/漫画卡片 |
| `js/video-loader.js` | `VideoLoader` | 视频卡片渲染、分类、弹窗播放 |
| `js/video.js` | 视频历史工具逻辑 | 维护独立的视频观看状态辅助能力 |
| `js/heatmap.js` | `HeatmapChart` | 热力图渲染能力 |

### 4.4 前台液态玻璃 UI 系统

- 作用范围：本次统一样式仅覆盖公开前台页面，包括 `index.html`、`blog.html`、`post.html`、`moments.html`、`bookmarks.html`、`rss.html`、`acg.html`、`anime.html`、`manga.html`、`edits.html`、`about.html`、`404.html`，不包含 `admin/` 后台。
- 公共令牌：`css/style.css` 末尾新增“Liquid Glass UI System For Public Pages”区块，集中定义玻璃背景、边框、阴影、模糊、圆角和深浅主题变量，避免各页面重复维护透明度与模糊参数。
- 公共组件：新增 `glass-panel`、`glass-card`、`glass-toolbar`、`glass-pill`、`glass-input` 等通用类，用于统一导航、移动菜单、筛选栏、卡片、输入框、弹层和页脚。
- 公共壳层：核心公开页额外引入 `public-shell`、`public-shell--floating-nav`、`section-shell`、`utility-glass-bar`、`reading-surface` 等类，用于统一导航留白、工具条节奏、阅读面板和页脚容器。
- 首页首屏收口：`index.html` 删除标签区和 `home-gateway` 入口块，改为单一 hero 封面，只保留头像、主标题、副句与底栏，用于降低首页突兀感并统一视觉语言。
- 全站布局恢复层：`css/style.css` 追加 `layout-safe-top`、`layout-flow-section`、`layout-toolbar-wrap`、`layout-grid-stable`、`layout-overflow-guard` 等恢复类，统一顶部安全间距、分段节奏、工具条换行、栅格稳定性和溢出防护。
- 公开页统一主容器与页脚：`index.html` 到 `404.html` 的公开页逐步收敛到 `public-shell`、`public-footer`、`public-footer__inner` 这套共享骨架，减少旧页脚与局部 `max-w-*` 容器分叉。
- ACG 系列页布局收口：`acg.html`、`anime.html`、`manga.html`、`edits.html` 统一补齐 `layout-safe-top`、筛选工具条和视频栅格保护类，降低平板与手机断点下的换行挤压和横向溢出。
- 复杂滚动页面布局保护：`rss.html`、`moments.html`、`post.html` 通过 `layout-overflow-guard`、工作台最小宽度控制和热力图横向滚动保护，减少 sticky/fixed/overflow 组合导致的遮挡与裁切。
- 层级语义：Task 3.2 为六个核心页补充 `editorial-stack`、`insight-grid`、`sidebar-stack`、`workbench-pane` 与配套 `data-ui-*` 标记，用于表达首页概览、博客控制区、文章侧栏分组、瞬间洞察区、收藏搜索/分类关系和 RSS 三栏职责。
- 页面接入：公开页通过 `body.public-page.liquid-glass-ui` 进入统一样式域，静态页面与动态渲染模块共享同一套视觉规则，降低局部内联样式分叉。
- 状态文案：`js/main.js` 将访问量与加载占位统一为中文文案，避免页面继续依赖 `Loading...` 或英文访问量前缀。
- 动态内容适配：`js/blog.js`、`js/moments.js`、`js/bookmarks.js`、`js/media-data.js`、`js/video-loader.js` 在动态卡片或标签渲染时挂载公共玻璃类，保证博客卡片、瞬间卡片、收藏卡片、媒体卡片和视频卡片视觉一致。
- 性能策略：高频出现的内容卡片以半透明背景和阴影为主，只有导航、抽屉、工具条、输入区和弹层启用 `backdrop-filter`，用于降低大面积模糊带来的滚动与绘制成本。

## 5. 后端结构

### 5.1 PHP API 层

PHP 目录 `api/` 负责公开读取接口、管理员写接口、统计接口、Bangumi 数据同步、设置保存与若干调试脚本。

| 文件 | 类型 | 主要职责 |
|---|---|---|
| `auth.php` | 认证基础设施 | 读取 `ADMIN_TOKEN`，执行管理员令牌校验 |
| `config.php` | 配置/数据库 | 提供 PDO 连接与 Bangumi 常量配置 |
| `core_db.php` | 存储抽象 | 为 KV 数据访问提供统一封装 |
| `db_helper.php` | 存储辅助 | JSON/KV 回退逻辑与统计初始化辅助 |
| `bookmarks.php` | 业务接口 | 收藏夹读写删改 |
| `snapshots.php` | 业务接口 | 随手拍数据读取、创建、删除 |
| `media.php` | 业务接口 | 动漫/漫画数据读取与整包保存 |
| `feeds.php` | 业务接口 | RSS 订阅源读取与保存 |
| `videos.php` | 业务接口 | 视频推荐数据读写 |
| `notice.php` | 业务接口 | 公告读取与保存 |
| `settings.php` | 业务接口 | 系统设置读取与保存 |
| `get_settings.php` / `save_settings.php` | 兼容接口 | 旧式设置读取/保存路径 |
| `visit.php` | 统计接口 | 写入访问记录与日统计 |
| `stats.php` | 统计接口 | 输出统计汇总并支持管理态读取 |
| `bangumi.php` | 聚合接口 | 汇总 Bangumi 收藏数据 |
| `bgm_search.php` | 管理接口 | 搜索 Bangumi 条目 |
| `bgm_subject.php` | 管理接口 | 获取 Bangumi 条目详情 |
| `sync_bangumi.php` | 管理接口 | 拉取并同步 Bangumi 收藏到本地 `media.json` |
| `rss-proxy.php` | 代理接口 | RSS 代理与安全过滤 |

### 5.2 Node 管理后端

`admin/server.js` 是管理后台的本地/开发态 Node 服务，也承担部分通用 API 职责。

主要特点：

- 使用 `express` 提供 REST API。
- 直接读写 `api/settings.json` 与 `public/data/*.json`。
- 内建管理员令牌校验、中间件限流、CORS 白名单、私网校验。
- 提供 `/api/rss-proxy`、`/api/metadata` 等代理能力。
- 暴露与 PHP 接口相似的 API 路径，供 `admin/admin.js` 按模式切换。

### 5.3 双后端并存模式

当前仓库存在 PHP 与 Node 两套后端实现，特点如下：

- PHP 更接近线上正式数据读写路径。
- Node 更偏本地开发、后台管理和兼容代理层。
- 管理前端通过 `safeFetch()` 自动适配两者路径差异。
- 内容文件大量共享，例如 `api/settings.json`、`public/data/*.json`。
- 统计与收藏存在“PHP KV/JSON”和“Node JSON 文件”并行模型，属于当前架构的一个复杂点。

## 6. 管理后台结构

### 6.1 管理后台职责

后台入口位于 `admin/index.html`，业务逻辑集中在 `admin/admin.js`。其核心职责包括：

- 收藏夹管理
- 随手拍管理
- 追番/漫画管理
- 订阅源管理
- 视频推荐管理
- 访问统计与图表展示
- 系统设置与公告管理
- 管理令牌校验与后端可用性探测

### 6.2 关键管理模块

| 符号 | 文件 | 职责 |
|---|---|---|
| `safeFetch()` | `admin/admin.js` | 统一管理端请求、自动附加 token、兼容 PHP/Node 路径 |
| `verifyToken()` | `admin/admin.js` | 校验管理员令牌有效性 |
| `BookmarksManager` | `admin/admin.js` | 管理书签、分类、GitHub 导入导出 |
| `SnapshotsManager` | `admin/admin.js` | 管理随手拍预览、上传、删除 |
| `MediaManager` | `admin/admin.js` | 管理动漫/漫画列表与状态 |
| `BgmSearch` | `admin/admin.js` | 搜索 Bangumi 并辅助填充媒体数据 |
| `FeedsManager` | `admin/admin.js` | 管理订阅源 |
| `VideosManager` | `admin/admin.js` | 管理视频推荐数据 |
| `StatsManager` | `admin/admin.js` | 拉取统计数据并渲染图表/分布 |
| `DarkModeManager` | `admin/admin.js` | 管理后台暗黑主题 |
| `NoticeManager` | `admin/admin.js` | 管理站点公告 |
| `Dashboard` | `admin/admin.js` | 控制后台导航切换与页面联动 |

## 7. 关键类与函数说明

### 7.1 前端关键类

#### `ApiClient` (`js/api.js`)

- 作用：统一浏览器端 API 请求能力。
- 核心职责：
  - 计算运行环境对应的 `baseUrl`
  - 封装 `GET`/`POST`
  - 提供重试、超时与统一错误格式
  - 解析异常响应，避免 HTML/PHP 源码被误当作 JSON
- 适用范围：几乎所有需要通过 `window.api.xxx()` 访问后端的页面。

#### `MediaLoader` (`js/media-data.js`)

- 作用：读取 `public/data/media.json` 并渲染番剧/漫画卡片。
- 核心职责：
  - 按类型 `anime` / `manga` 装载数据
  - 绑定状态过滤按钮
  - 计算状态标签、进度条与卡片展示
- 适用页面：`acg.html`、`anime.html`、`manga.html`。

#### `VideoLoader` (`js/video-loader.js`)

- 作用：统一视频卡片渲染、过滤与播放弹窗管理。
- 核心职责：
  - 初始化视频列表与分类映射
  - 支持已 SSR DOM 与纯前端渲染两种模式
  - 生成卡片、绑定点击播放、初始化筛选器
  - 兼容 Bilibili 缩略图代理
- 适用页面：`acg.html`、`edits.html`。

#### `ActivityChart` (`js/activity_chart.js`)

- 作用：在随手拍页面渲染近月活跃趋势图。
- 核心职责：
  - 汇总按月统计数据
  - 响应主题切换重新绘制
  - 使用 Canvas 绘制折线、面积和提示态

#### `CacheManager` / `StaleWhileRevalidate` (`js/cache.js`)

- 作用：为前端资源和数据请求提供缓存能力。
- 核心职责：
  - 管理本地缓存键值
  - 实现 SWR 式“先返回旧值，再后台刷新”
- 价值：降低网络请求频率，改善页面首屏与弱网体验。

### 7.2 管理端关键对象

#### `safeFetch()` (`admin/admin.js`)

- 作用：是管理后台所有后端请求的统一入口。
- 核心职责：
  - 动态切换同源 `/api`、本地 Node API、Mock/静态模式
  - 自动附加 `x-admin-token`
  - 兼容 Node 对 `.php` 接口路径的改写
  - 统一错误提示

#### `BookmarksManager` (`admin/admin.js`)

- 作用：后台收藏夹管理主控对象。
- 核心职责：
  - 归并书签来源
  - 规范化 URL 去重
  - 读取 GitHub Issues 书签
  - 管理分类与标签
  - 执行新增、编辑、批量删除与状态检查

#### `SnapshotsManager` (`admin/admin.js`)

- 作用：后台随手拍管理对象。
- 核心职责：
  - 拉取并预览数据
  - 支持图床链接或文件上传
  - 删除记录并触发前端刷新

#### `MediaManager` (`admin/admin.js`)

- 作用：后台动漫/漫画管理对象。
- 核心职责：
  - 在 `anime` 和 `manga` 两种内容类型间切换
  - 新增、删除、保存媒体数据
  - 计算进度百分比和状态映射

#### `StatsManager` (`admin/admin.js`)

- 作用：后台统计看板控制器。
- 核心职责：
  - 请求统计接口
  - 整理日访问数据
  - 渲染折线图、访问日志和 IP 分布

### 7.3 PHP 关键函数

| 函数 | 文件 | 说明 |
|---|---|---|
| `get_server_admin_token()` | `api/auth.php` | 从环境变量或 `.env` 中读取管理员令牌 |
| `require_admin_token()` | `api/auth.php` | 校验请求头中的管理员令牌 |
| `getDBConnection()` | `api/config.php` | 创建 PDO 连接 |
| `fetchUrl()` | `api/bangumi.php` | 发起 Bangumi API 请求 |
| `fetchCollection()` | `api/bangumi.php` | 拉取指定分类收藏列表 |
| `validate_url()` | `api/rss-proxy.php` | 校验 RSS 代理请求 URL 的安全性 |
| `is_private_ip()` | `api/rss-proxy.php` | 拒绝访问私网地址，降低 SSRF 风险 |
| `fetchBgm()` | `api/sync_bangumi.php` | 调用 Bangumi API 获取同步数据 |

### 7.4 Node 关键函数

| 函数 | 文件 | 说明 |
|---|---|---|
| `readEnvToken()` | `admin/server.js` | 从 `.env` 读取管理员令牌 |
| `writeEnvToken()` | `admin/server.js` | 在缺失时写入自动生成的令牌 |
| `rateLimit()` | `admin/server.js` | 生成基础限流中间件 |
| `requireAdminToken()` | `admin/server.js` | 校验管理接口请求头中的 token |
| `originAllowed()` | `admin/server.js` | 校验 CORS 来源是否允许 |
| `isPrivateIp()` | `admin/server.js` | 判断 IP 是否属于私网，保护调试与代理能力 |

## 8. 依赖关系

### 8.1 页面到模块依赖

```text
blog.html
  -> js/main.js
  -> js/api.js
  -> js/blog.js
  -> public/posts/posts.json

post.html
  -> js/post-viewer.js
  -> public/posts/*.md
  -> public/posts/posts.json
  -> marked / highlight.js / katex

moments.html
  -> js/moments.js
  -> js/activity_chart.js
  -> public/data/moments.json
  -> GitHub Issues (可选)

bookmarks.html
  -> js/bookmarks.js
  -> js/bookmarks-admin.js (本地环境)
  -> public/data/bookmarks.json / categories.json
  -> GitHub API (本地管理时)
```

### 8.2 管理端依赖

```text
admin/index.html
  -> admin/admin.js
  -> 同源 /api 或 localhost:3000/api
  -> api/settings.json
  -> public/data/*.json
```

### 8.3 数据存储依赖

| 存储位置 | 主要使用者 | 说明 |
|---|---|---|
| `public/posts/*.md` | 博客详情页 | Markdown 原文内容 |
| `public/posts/posts.json` | 博客列表、文章详情页 | 文章元数据索引 |
| `public/data/media.json` | ACG 页面、管理后台 | 动漫/漫画主数据 |
| `public/data/*.json` | Node 后端、前台页面 | 运行时内容数据文件 |
| `api/settings.json` | PHP、Node、管理端 | 系统设置与 Bangumi 相关配置 |
| KVDB / `api/data/*.json` | PHP 统计与收藏 | 统计、收藏的后备数据层 |

### 8.4 外部服务依赖

| 外部依赖 | 使用位置 | 作用 |
|---|---|---|
| Bangumi API | `api/bangumi.php`、`api/sync_bangumi.php`、Node 对应代理 | 拉取番剧/漫画收藏与搜索结果 |
| GitHub API | `js/bookmarks-admin.js`、`admin/admin.js` | 管理书签、可选拉取动态数据 |
| RSS 源站 | `api/rss-proxy.php`、`admin/server.js` | 拉取订阅内容 |
| 图像代理服务 | `js/video-loader.js` | 代理 Bilibili 缩略图 |
| CDN 资源 | 多个 HTML 页面 | Lucide、Tailwind、Chart.js、KaTeX、Highlight.js 等 |

## 9. 认证与安全模型

### 9.1 管理令牌

- 管理员能力基于 `ADMIN_TOKEN`。
- PHP 侧通过 `api/auth.php` 校验 `x-admin-token` 或兼容旧头。
- Node 侧通过 `requireAdminToken()` 校验 `x-admin-token`。
- 管理前端将 token 缓存在 `localStorage.admin_token` 中，并在请求时自动携带。

### 9.2 当前安全边界

- `rss-proxy.php` 与 Node 代理都做了 URL / IP 过滤，用于降低 SSRF 风险。
- 管理端调试发现 token 的接口仅允许私网来源，但仍应视为敏感接口。
- 项目中存在配置与敏感信息硬编码的情况，需在后续治理中迁移到环境变量。

## 10. 运行与部署

### 10.1 本地运行

当前仓库能直接确认的 Node 本地启动方式为：

```bash
cd admin
npm install
node server.js
```

说明：

- `admin/package.json` 定义了 Node 依赖。
- `admin/server.js` 是 Express 服务入口。
- 仓库未提供根级一键启动脚本，也未发现 Docker 或 Compose 编排文件。

### 10.2 线上部署

线上部署模型如下：

```text
Git Push
  -> 服务器工作树更新
  -> Nginx 站点根目录读取当前仓库内容
  -> PM2 托管 admin/server.js
  -> PHP-FPM 托管 /api/*.php
```

可确认信息：

- Nginx 站点根目录：`/www/wwwroot/47.118.28.27`
- PHP-FPM 地址：`127.0.0.1:9000`
- Node 服务地址：`127.0.0.1:3000`
- Node 重启方式：`pm2 restart shadowsky-admin`

### 10.3 环境变量与配置

| 名称 | 使用位置 | 说明 |
|---|---|---|
| `PORT` | `admin/server.js` | Node 服务端口，默认 `3000` |
| `HOST` | `admin/server.js` | Node 服务监听地址，默认 `127.0.0.1` |
| `ADMIN_TOKEN` | PHP/Node 共享 | 后台管理认证令牌 |
| `RSS_PROXY_ALLOWED_HOSTS` | `admin/server.js` | RSS 代理域名白名单 |
| `CORS_ALLOWED_ORIGINS` | `admin/server.js` | CORS 允许来源 |

注意：

- PHP 侧数据库配置和 Bangumi Token 当前仍位于 `api/config.php` 常量中。
- 这意味着项目配置来源不完全统一，存在环境变量与硬编码配置并存的问题。

## 11. 测试现状

### 11.1 已存在测试

仓库内存在一批 `*.test.js` 文件，覆盖：

- 管理后台逻辑：`admin/admin.test.js`
- API 客户端与页面模块：`js/api.test.js`、`js/blog.test.js`、`js/main.test.js` 等
- 统计逻辑：`api/stats.test.js`

### 11.2 测试依赖

从测试文件可确认的依赖包括：

- `vitest`
- `fast-check`
- `jsdom`

### 11.3 当前限制

- 仓库中没有根级 `package.json`。
- `admin/package.json` 未声明测试脚本和测试依赖。
- 因此目前只能确认“存在测试文件”，不能把某条命令认定为正式测试入口。

### 11.4 本次前台 UI 改造验证

- 已执行静态校验，确认公开页已接入 `public-page liquid-glass-ui` 作用域，公共样式块与动态卡片类已写入目标文件。
- 由于仓库缺少统一的前台测试脚本与根级测试入口，本次未运行自动化 UI 回归测试，验证方式以代码级一致性检查和结构化 grep 复核为主。
- 本次改动未触碰 PHP 接口、Node 管理端和 `admin/` 前端，因此未引入新的后端 SQL 注入或后台 Token 校验变更面。

## 12. 架构观察与维护建议

### 12.1 当前优点

- 前台结构清晰，页面职责分离明确。
- 管理后台模块化程度较高，核心能力围绕 Manager 对象展开。
- 代理、令牌校验、基础限流已具备初步安全意识。
- 内容类数据采用 JSON 文件存储，部署与迁移成本较低。

### 12.2 当前复杂点

- PHP 与 Node 双后端并存，接口和存储职责存在重叠。
- 运行时配置来源不统一，存在硬编码敏感信息。
- 统计、收藏与设置数据路径较多，长期维护成本偏高。
- 管理端带有 Mock、静态模式、Node 模式、同源模式，多模式切换提升了兼容性，也增加了复杂度。

### 12.3 推荐的后续整理方向

1. 明确单一正式后端，减少 PHP/Node 职责重叠。
2. 将数据库密码、Bangumi Token 和其他敏感配置迁移到环境变量。
3. 为测试补齐统一的依赖声明和脚本入口。
4. 为 `public/data/*.json` 制定明确的数据模型说明和更新策略。
5. 将当前 Wiki 拆分为 `架构说明`、`接口说明`、`前端模块说明`、`运维部署说明` 四类文档，以便后续持续维护。

## 13. 关键入口速查

| 类别 | 路径 |
|---|---|
| 前台首页 | `index.html` |
| 博客列表 | `blog.html` |
| 文章详情 | `post.html` |
| 随手拍 | `moments.html` |
| 收藏页 | `bookmarks.html` |
| RSS | `rss.html` |
| ACG | `acg.html` / `anime.html` / `manga.html` |
| 视频页 | `edits.html` |
| 管理后台 | `admin/index.html` |
| Node 服务 | `admin/server.js` |
| PHP 认证 | `api/auth.php` |
| 访问统计 | `api/visit.php` / `api/stats.php` |
| 媒体同步 | `api/sync_bangumi.php` |
| Nginx 配置 | `nginx/shadowquake.top.conf` |

## 14. 审计附录

> 本节用于满足仓库工作协议中的 QA 约束，重点记录当前仓库在代码结构分析中发现的风险点，不代表已完成完整渗透或压力测试。

| 隐患点 | 严重程度 | 修复建议 |
|---|---|---|
| `api/config.php` 存在数据库密码与 Bangumi Token 硬编码 | 高 | 迁移到环境变量或服务器密钥文件 |
| `api/settings.php` 公开读取设置文件，若含敏感字段可能泄露 | 高 | 对敏感字段脱敏，或将读接口纳入鉴权 |
| `api/stats.php` 的部分管理态逻辑仅检查请求头存在性，校验强度不足 | 高 | 统一复用 `require_admin_token()` |
| PHP 与 Node 双后端并行，统计与收藏可能出现数据口径不一致 | 中 | 统一正式写路径和单一数据源 |
| `admin/server.js` 中基于文件的同步读写在高并发下可能形成 I/O 瓶颈 | 中 | 将热点数据迁移到异步队列、KV 或数据库 |
| 收藏可达性检测与部分外部抓取请求存在批量外网访问成本 | 中 | 增加缓存、并发上限和任务队列 |
| 当前未发现显著业务 SQL 拼接路径，但后续启用 SQL 时仍需强制预处理 | 低 | 统一采用 PDO 预处理，避免引入注入风险 |

QA 结论：当前仓库整体为中高风险，不标记 `VERIFIED`。
