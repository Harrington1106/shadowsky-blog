# ShadowSky 网站开发文档

**版本**: 1.0.0  
**最后更新**: 2025-12-23  
**状态**: 正式发布

---

## 1. 系统架构与技术栈

### 1.1 架构概览

本项目采用 **混合式架构 (Hybrid Architecture)**，结合了静态站点的极速体验与动态服务的灵活性。

* **前端层 (Frontend)**: 纯静态 HTML/JS 构建，托管于 Web 服务器或 CDN。页面加载时通过 AJAX 请求获取 JSON 数据或调用后端 API。
* **后端层 (Backend)**: 双栈设计。
  * **生产环境 (API)**: PHP 脚本处理核心业务（访问统计、数据同步），提供 MySQL 数据库支持。
  * **管理环境 (Admin)**: Node.js (Express) 服务，用于本地内容管理、RSS 代理和静态资源生成。
*   **数据层 (Data)**: 
    *   **MySQL**: 存储高频动态数据（如访问量）。
    *   **JSON 文件**: 存储内容数据（文章列表、书签、动态），作为静态 API 供前端直接读取。
    *   **KV 存储 (可选)**: 适配特定 PaaS 平台的键值存储。

### 1.2 技术栈清单

| 领域 | 技术/库 | 说明 |
| :--- | :--- | :--- |
| **前端** | HTML5, Vanilla JS | 无框架依赖，追求极致性能 |
| **样式** | Tailwind CSS v3.4 | 实用优先的 CSS 框架 |
| **构建工具** | PostCSS, Vitest | CSS 处理与单元测试 |
| **后端 (API)** | PHP 5.6+ | 兼容旧版环境，严禁使用 PHP 7.0+ 语法 (如 `??`) |
| **后端 (Admin)** | Node.js, Express | 本地开发与管理服务 |
| **数据库** | MySQL / MariaDB | 关系型数据存储 |
| 依赖管理 | npm | 前端与 Node 工具链管理 |

---

### 1.3 部署架构 (Deployment Architecture)

本项目采用 **静态平台 + 私有服务器** 的混合部署模式，以平衡性能与数据控制权。

#### 1.3.1 部署分发表 (Deployment Distribution Table)
| 文件/目录类型 | 热铁盒 (Static Host) | 私有服务器 (47.118.28.27) | 原因说明 |
| :--- | :--- | :--- | :--- |
| **前端核心** (`index.html`, `js/`, `css/`) | ✅ **必须** | ❌ 建议不放 | 热铁盒 CDN 加速可大幅提升首屏加载速度。 |
| **公共资源** (`public/`, `favicon.ico`) | ✅ **必须** | ❌ 建议不放 | 图片、图标等静态资源。 |
| **后端接口** (`api/*.php`) | ❌ **不要传** | ✅ **必须** | 需在私有服务器运行 PHP 逻辑。 |
| **敏感配置** (`api/config.php`, `.env`) | ❌ **绝对禁放** | ✅ **必须** | 包含数据库密码，传到静态站会被直接泄露。 |
| **动态数据** (`data/*.json`) | ❌ **不要传** | ✅ **必须** | 确保数据资产留在你的私有服务器上。 |
| **管理后台** (`admin/`) | ❌ **不要传** | ✅ **必须** | 基于 Node.js 的服务，静态站跑不动。 |

### 1.3.2 热铁盒 (Hot Iron Box) - 静态托管
*   **域名**: `shadowquake.top` (示例)
*   **职责**: 托管前端静态资源。
*   **部署方式**: 使用 `npm run deploy:rth` (自动过滤非静态文件)。
*   **组件**: 
    *   **静态文件**: HTML, CSS, JS, Images, Public JSON Data.

### 1.3.3 私有服务器 (Private Server) - 核心后端
*   **域名**: `api.shadowquake.top`（生产）
*   **职责**: 托管核心业务数据，运行数据库与管理后台。
*   **组件**:
    *   **数据库**: MySQL (存储访问统计、评论等动态数据).
    *   **核心 API**（基础路径 `https://api.shadowquake.top/api`）:
        *   `api/visit.php`: 页面访问统计（KVDB 聚合 + 文件回退，生产可接 MySQL）。
        *   `api/stats.php`: 统计数据导入/导出与聚合读取（与 `visit.php` 共用 `shadowsky_stats`）。
        *   `api/auth.php`: 管理员鉴权逻辑。
        *   `api/sync_*.php`: 数据同步脚本（Bangumi、RSS 等）。
    *   **Admin 后台**: `admin/` (Node.js Express App).
*   **安全要求**:
    *   必须配置 **CORS** 允许热铁盒主域 `https://shadowquake.top` 访问（见 `api/cors.php`）。
    *   **CSP 与挑战页**：为 `/api/` 路径关闭挑战页/脚本注入，确保返回纯 JSON；避免 HTML 响应触发前端解析失败与 CSP 报告。
    *   **PHP 引用路径**：统一采用 `require_once __DIR__ . '/...'`，避免在 `api/` 目录下出现 `api/api/...` 误路径。

*   **部署目录**:
    *   站点根：`/www/wwwroot/47.118.28.27`
    *   API 目录：`/www/wwwroot/47.118.28.27/api`
    *   PHP-FPM/Nginx：`location /api/` 指向上述目录并启用 `.php` 解析。
    *   管理接口必须验证 `x-admin-token`.
    *   数据库不直接暴露公网，仅供本地 PHP/Node 访问.

---

## 2. 核心功能模块设计

### 2.1 博客系统 (Blog)
*   **数据源**: `public/posts/posts.json` (由脚本自动扫描 Markdown 生成)。
*   **渲染**: `js/blog.js` 实现客户端渲染，支持分页、按时间/标签排序。
*   **视图**: 支持网格 (Grid)、时间轴 (Timeline)、目录 (Directory) 多种视图切换。
*   **筛选**: 支持 URL 参数 `?date=YYYY-MM` (或 YYYY) 进行日期归档筛选，实现与文章页详情日期的联动。

### 2.2 访问统计 (Analytics)
*   **入口**: `api/visit.php`
*   **逻辑**: 三级降级策略 (KV存储 -> MySQL -> 本地 JSON 文件)。
*   **防抖**: 简单的 IP 频率限制。

### 2.3 动态/瞬间 (Moments)
*   **数据源**: `public/data/moments.json`
*   **功能**: 类似微信朋友圈的短内容发布，支持图片、地理位置和标签。
*   **管理**: 通过 Admin 面板 (`/admin`) 发布，需鉴权。

## 3. 运维与故障排除 (Troubleshooting)

### 3.1 Nginx 与 PHP-FPM 配置 (2025-12-26 经验总结)
在私有服务器 (Aliyun) 部署后端 API 时，若遇到 **502 Bad Gateway** 或 **404 Not Found**，请按以下步骤排查：

1.  **PHP-FPM 通信方式**:
    *   **现象**: Nginx 错误日志显示 `connect() to unix:/tmp/php-cgi-82.sock failed`.
    *   **原因**: 宝塔面板或其他环境可能将 PHP-FPM 配置为监听 TCP 端口 (9000) 而非 Unix Socket。
    *   **解决**: 修改 Nginx 配置 (`vhost` 文件) 中的 `fastcgi_pass` 指向 `127.0.0.1:9000`。
    ```nginx
    location ~ [^/]\.php(/|$) {
        try_files $uri =404;
        fastcgi_pass  127.0.0.1:9000; # 强制使用 TCP
        fastcgi_index index.php;
        include fastcgi.conf;
        include pathinfo.conf;
    }
    ```

2.  **API 路径路由**:
    *   **现象**: 前端请求 `/api/visit` (无后缀) 返回 **404** 或 **405**，或被 Nginx 当作静态文件处理。
    *   **原因**: Nginx 的静态文件缓存规则 (如 `js|css|png...`) 可能优先匹配无后缀路径，或者 `try_files` 未正确重写到 `.php`。
    *   **解决**: **前端请求必须显式带上 `.php` 后缀** (如 `/api/visit.php`)。这是最稳健的跨平台/跨环境兼容方案，无需复杂的 Rewrite 规则。

### 3.2 CORS 跨域配置
当 API 部署在 `api.shadowquake.top` 而前端在 `shadowquake.top` 时，必须严格配置 CORS：

1.  **白名单处理**:
    *   在 `cors.php` 中读取环境变量 `CORS_ALLOW_ORIGIN` 时，务必使用 `trim()` 去除逗号分隔产生的空格。
    *   `Access-Control-Allow-Origin` 头必须精确匹配请求来源 (`Origin`)，或直接回显该 Origin (如果它在白名单内)。
2.  **Vary 头**:
    *   必须发送 `Vary: Origin`，告知浏览器和 CDN 根据不同的 Origin 缓存不同的响应 (或不缓存 CORS 头)。


### 2.4 专注模式 (Focus Mode)
*   **入口**: 首页右键菜单 -> "进入专注模式"
*   **核心功能**:
    *   **番茄钟**: 默认 25 分钟，支持暂停/重置。
    *   **天气组件**: 集成 Open-Meteo API，自动定位（基于 IP/浏览器），含 30 分钟本地缓存 (`weatherData`)。
    *   **沉浸体验**: 自动隐藏导航栏与页脚，高斯模糊背景内容。
    *   **个性化**: 支持调节背景 Blob 颜色与动画速度；支持 **日夜间模式自动切换**（日间：莫奈色系；夜间：星空色系）。
*   **技术实现**: `js/focus-mode.js` (独立模块，不依赖第三方库)。

### 2.5 书签与导航 (Bookmarks)
*   **数据源**: `public/data/bookmarks.json` 和 `public/data/categories.json`
*   **结构**: 采用 **二级分类 (Primary/Secondary)** 结构。
    *   一级分类（如：开发技术、个人兴趣）
    *   二级分类（如：前端开发、唱见/音乐）
    *   分类定义存储于 `categories.json`，支持 `order` 字段自定义排序。
*   **展示**: 前端页面根据 `order` 字段对一级分类进行排序，并在卡片网格中通过子标题展示二级分类分组。
*   **管理**: Admin 面板支持二级分类的联动选择与编辑。

---

## 3. 数据库设计

### 3.1 ER 图描述
系统包含三个核心实体：页面访问 (Page Visits)、访问日志 (Visit Logs) 和 RSS 订阅 (RSS Feeds)。

### 3.2 表结构定义

#### 3.2.1 `page_visits` (访问统计)
| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK, AI | 主键 |
| `page_id` | VARCHAR(255) | UNIQUE | 页面标识符 (Slug) |
| `count` | INT | Default 0 | 访问次数 |
| `last_updated` | TIMESTAMP | | 最后更新时间 |

#### 3.2.2 `visit_logs` (访问日志 - 可选)
| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK, AI | 主键 |
| `page_id` | VARCHAR(255) | | 页面标识符 |
| `ip_address` | VARCHAR(45) | | 访客 IP (支持 IPv6) |
| `user_agent` | TEXT | | 用户代理字符串 |
| `visit_time` | TIMESTAMP | | 访问时间 |

#### 3.2.3 `rss_feeds` (订阅源)
| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK, AI | 主键 |
| `url` | VARCHAR(512) | UNIQUE | RSS 地址 |
| `title` | VARCHAR(255) | | 标题 |
| `category` | VARCHAR(100) | | 分类 |

---

### 访客统计系统 (Visitor Count System)

#### 1. 架构与数据流 (Architecture & Data Flow)
此系统连接了用户的浏览器（前端）与服务器（后端），具体流程如下：

1.  **用户访问 (Browser)**:
    *   用户打开网站，`js/main.js` 触发 `fetchVisitCount()`。
2.  **API 请求 (Frontend)**:
    *   `js/api.js` 构建请求。
    *   **关键机制**: 自动检测环境。
        *   若域名为 `shadowquake.top` (HTTPS)，使用相对路径 `/api/visit.php`，避免 Mixed Content 错误。
        *   若为 `localhost`，使用 `http://localhost:3000/api`。
3.  **服务器处理 (Backend)**:
    *   `api/visit.php` 接收请求。
    *   **依赖检查**: 加载 `api/db_helper.php` (KVDB 抽象层)。
    *   **数据存储**:
        *   若为 Retinbox 环境，使用原生 `Database` 类。
        *   若为文件环境，写入 `api/data/shadowsky_stats.json`。
4.  **响应返回**:
    *   返回 JSON `{ "success": true, "total": 123, "daily": ... }`。
    *   前端更新 UI 显示。

#### 2. 故障排查 (Troubleshooting)

| 现象 | 错误代码/信息 | 原因分析 | 修复方案 |
| :--- | :--- | :--- | :--- |
| **HTTPS 网站无法显示** | `Mixed Content` | `js/api.js` 硬编码了 HTTP IP，导致浏览器拦截请求。 | **已修复**: `api.js` 现已支持相对路径 `/api`，自动适配 HTTPS。 |
| **API 返回 500** | `Database helper missing` | 服务器上缺少 `api/db_helper.php` 文件。通常是部署未同步导致。 | **操作**: 运行 `git_publish.ps1` 推送最新代码，或手动上传该文件。 |
| **数据不更新** | N/A | `api/data/` 目录没有写入权限。 | 确保 PHP 对 `api/` 目录有写权限 (chmod 777)。 |

#### 3. 部署与连接 (Deployment & Connection)
*   **连接桥梁**: 域名 `shadowquake.top` 解析到服务器 IP。Nginx/Apache 将 `/api` 路径映射到 PHP 文件。
*   **同步机制**: 本地运行 `scripts/git_publish.ps1` -> GitHub -> GitHub Actions -> 自动部署到服务器。
*   **注意事项**: 每次修改 `api/` 下的 PHP 文件后，必须提交并推送，否则服务器端逻辑不会更新。

### 3. API 接口规范 (API Specifications)

### 4.1 通用规范
*   **Base URL**: `https://api.shadowquake.top/api`
    *   生产：前端在 `shadowquake.top` 下统一指向外部 API 子域，避免静态主域 404。
    *   本地：默认也指向 `https://api.shadowquake.top/api`，因为本地 Node 开发服务器不解析 PHP；如需本地 PHP，请使用 `php -S localhost:8000` 并配置反代。
*   **鉴权**: 管理接口需 Header `x-admin-token: <ADMIN_TOKEN>`
*   **响应格式**: JSON
    ```json
    {
      "success": true,
      "data": { ... },
      "error": { "code": "...", "message": "..." } // 仅失败时出现
    }
    ```

### 4.2 核心接口

#### GET `/api/bookmarks` (Admin Server)
*   **描述**: 获取所有收藏书签。支持自动为缺少 ID 的旧数据生成 ID。
*   **响应**: JSON 数组。

#### POST `/api/bookmarks/check` (Admin Server)
*   **鉴权**: Required
*   **描述**: 批量检查书签连通性。包含 SSRF 防护（禁止内网 IP）。
*   **Body**:
    ```json
    {
      "bookmarks": [ { "id": "...", "url": "..." }, ... ]
    }
    ```
*   **响应**: `{ "results": [ { "id": "...", "status": "ok|error", "code": 200|"timeout"|"blocked" } ] }`

#### GET `/api/debug/token` (Admin Server)
*   **描述**: 获取当前 Admin Token（仅限本地或受控环境使用，用于前端自动发现）。
*   **响应**: `{ "token": "..." }`

#### POST `/api/bookmarks` (Admin Server)
*   **鉴权**: Required
*   **描述**: 
    1.  **创建**: 发送单个 JSON 对象（自动生成 ID 并添加到列表头部）。
    2.  **批量替换**: 发送 JSON 数组（覆盖整个列表，用于排序或导入）。
*   **Body (Create)**:
    ```json
    {
      "url": "https://example.com",
      "title": "Example",
      "category": "dev"
    }
    ```

#### PUT `/api/bookmarks` (Admin Server)
*   **鉴权**: Required
*   **描述**: 更新单个书签。
*   **Body**:
    ```json
    {
      "id": "uuid-...",
      "title": "New Title"
    }
    ```

#### DELETE `/api/bookmarks` (Admin Server)
*   **鉴权**: Required
*   **描述**: 删除单个书签。
*   **Query**: `?id=uuid-...`

#### POST `/api/bookmarks/batch-delete` (Admin Server)
*   **鉴权**: Required
*   **描述**: 批量删除书签。
*   **Body**:
    ```json
    {
      "ids": ["uuid-1", "uuid-2"]
    }
    ```
*   **响应**: `{ "success": true, "deleted": 2 }`

#### GET `/api/metadata` (Admin Server)
*   **鉴权**: Required
*   **描述**: 获取目标 URL 的标题和描述。
*   **Query**: `?url=https://...`
*   **响应**: `{ "title": "...", "description": "..." }`
*   **错误码**:
    *   `400`: URL 无效
    *   `403`: 内网地址被拦截 (SSRF Protection)
    *   `504`: 请求超时 (15s)
    *   `502`: 获取失败

#### GET `/api/visit.php?page={page_id}`
*   **描述**: 记录并获取页面访问量（前端具备 `visit.php` 失败自动降级到 `stats.php` 的机制）。
*   **响应**: `{ "page": "home", "count": 1234, "mode": "db" }`

#### GET `/api/feeds` (Admin Server)
*   **描述**: 获取 RSS 订阅列表。
*   **响应**: JSON 数组。

#### POST `/api/snapshots` (Admin Server)
*   **鉴权**: Required
*   **Body**:
    ```json
    {
      "content": "今天天气不错",
      "imageUrl": "https://...",
      "location": "Shanghai",
      "tags": "daily,life"
    }
    ```

#### GET `/api/rss-proxy` (Admin Server)
*   **描述**: 代理请求外部 RSS XML，解决跨域问题。
*   **Query**: `?url=https://example.com/feed.xml`
*   **安全**: 内置 SSRF 防护，禁止访问内网 IP。

#### POST `/api/save_settings.php`
*   **鉴权**: Required
*   **描述**: 保存 Bangumi 配置 (Username/Token)。

#### GET `/api/sync_bangumi.php`
*   **鉴权**: Required
*   **描述**: 触发 Bangumi 数据同步，更新 `public/data/media.json`。

---

## 5. 用户权限与角色

当前系统采用 **单用户/管理员模式**。

*   **访客 (Guest)**: 只读权限，可浏览所有公开内容。
*   **管理员 (Admin)**: 
    *   拥有所有读写权限。
    *   **鉴权方式**: 静态 Token (`ADMIN_TOKEN` 环境变量)。
    *   **管理入口**: `/admin/index.html` (需配合 Node.js 服务运行)。

---

## 6. 部署环境与依赖

### 6.1 环境要求
*   **OS**: Windows / Linux (推荐 Ubuntu/Debian)
*   **Runtime**: 
    *   Node.js v18+
    *   PHP 7.4+ (带 PDO_MySQL 扩展)
*   **Web Server**: Nginx / Apache (用于反向代理和 PHP 解析)

### 6.2 关键环境变量 (.env)
*   `PORT`: Admin 服务端口 (默认 3000)
*   `ADMIN_TOKEN`: 管理员密钥 (必须设置)
*   `RSS_PROXY_ALLOWED_HOSTS`: 允许代理的域名白名单 (逗号分隔)
*   **PHP 配置**: 修改 `api/config.php` 中的 `DB_HOST`, `DB_USER`, `DB_PASS`。

#### 6.2.1 部署与托管相关变量
- `RTH_API_KEY`: Retinbox Web Hosting 部署所需的 API 密钥（必须）。用于 `npm run deploy` 与 `deploy_rth.ps1`。
- `SITE_NAME`: 站点域名（如 `shadowquake.top`），部署脚本用于展示与目标标识。
- `CORS_ALLOWED_ORIGINS`: 允许访问私服 API 的前端域名白名单（逗号分隔），生产必须包含 `https://shadowquake.top`。

#### 6.2.2 环境变量管理策略
- `.env` 永不提交到仓库（已在 `.gitignore` 中忽略）。
- 新增或更新变量必须“追加或替换单行”，不得清空其他已有部署变量。
- 管理令牌的自动写入仅替换 `ADMIN_TOKEN` 所在行，不影响其他行（参考 `admin/server.js:20–36`）。
- 建议维护以下片段作为参考：

```
# Admin/Server
ADMIN_TOKEN=<随机令牌>
HOST=0.0.0.0
PORT=3001

# CORS
CORS_ALLOWED_ORIGINS=https://shadowquake.top,http://shadowquake.top
RSS_PROXY_ALLOWED_HOSTS=shadowquake.top

# Deployment
RTH_API_KEY=<retinbox-api-key>
SITE_NAME=shadowquake.top
```

#### 6.2.3 上线前环境验证
- 执行 `npm run deploy` 前，确认 `.env` 包含 `RTH_API_KEY`。
- 运行 `./setup_deploy.ps1` 以交互方式写入/更新 API Key。
- 若 `RTH_API_KEY` 缺失，部署脚本将提前失败并提示修复（`deploy_rth.ps1:28–35, 140–217` 与新增前置检查）。

---

## 7. 性能与扩展性

### 7.1 性能指标
*   **首屏加载**: 得益于静态架构，首屏 TTFB < 50ms (CDN 环境)。
*   **API 延迟**: PHP 接口平均响应 < 100ms。
*   **构建速度**: Tailwind CSS 增量构建 < 500ms。

### 7.2 扩展性分析
*   **水平扩展**: 前端可部署至任意 CDN。后端 API 无状态，可横向扩展。
*   **数据库**: MySQL 支持主从复制，适合读多写少场景。
*   **瓶颈**: JSON 文件存储模式 (Mode C) 在高并发下存在文件锁竞争风险，建议生产环境强制使用 MySQL。

---

## 8. 已知问题与改进建议

### 8.1 已知问题 (Known Issues)
1.  **数据持久化风险**: 使用 `file` 模式记录访问量时，重新部署可能导致 `data/visits.json` 被覆盖。
    *   *规避*: 生产环境务必配置 MySQL。
2.  **鉴权安全性**: Token 明文存储在环境变量中，且无过期机制。
3.  **双后端维护成本**: 同时维护 Node.js 和 PHP 两套逻辑增加了复杂度。

### 8.2 改进建议
1.  **统一后端技术栈**: 建议逐步将 Admin 功能迁移至 PHP 或将 API 全面迁移至 Node.js (取决于部署环境支持)。
2.  **引入 SQLite**: 对于中小型站点，可用 SQLite 替代 MySQL + JSON，简化部署且保证事务安全。
3.  **自动化测试**: 增加对 PHP API 的集成测试 (当前仅有 JS 单元测试)。

---

## 9. 网络排障手册 (Troubleshooting)

### 9.1 网络诊断工具
本地开发遇到连接问题时，请运行内置诊断脚本：

```bash
node scripts/check_network.js
```

该脚本将自动检查：
1.  **GitHub 连通性**: 验证能否拉取代码或推送更新。
2.  **热铁盒 API (Frontend)**: 验证 `shadowquake.top` 是否可访问。
3.  **私有服务器 (Backend)**: Ping 测试 IP `47.118.28.27`。

### 9.2 常见故障与解决方案

| 故障现象 | 可能原因 | 解决方案 |
| :--- | :--- | :--- |
| **GitHub 连接失败** | DNS 污染或网络阻断 | 1. 检查系统代理设置。<br>2. 尝试使用 VPN 或更换网络环境。 |
| **私有服务器 Ping 不通** | 服务器防火墙/安全组拦截 | 1. 登录阿里云/腾讯云控制台，检查安全组是否放行 ICMP。<br>2. 检查服务器是否宕机。 |
| **API 500 (Database helper missing)** | `api/db_helper.php` 文件缺失 | **原因**: 服务器 `api` 目录未同步最新代码。<br>**修复**: 在服务器执行 `git pull`，确保 `api/db_helper.php` 存在且有读取权限。 |
| **API 502 Bad Gateway** | PHP-FPM 未运行或配置错误 | 重启 PHP-FPM 服务；检查 Nginx `fastcgi_pass` 配置。 |
| **Mixed Content (HTTPS)** | 网站 HTTPS 引用 HTTP API | **原因**: `js/api.js` 硬编码了 HTTP IP。<br>**修复**: 前端已更新为自动检测生产环境并使用相对路径 `/api`。 |
| **API 404** | Nginx 伪静态规则缺失 | 确保 Nginx 配置将 `/api/` 路径请求转发给 PHP 处理。 |
| **HTML 返回而非 JSON** | 安全网关挑战页/脚本注入导致响应被替换 | 1. 为 `/api/` 路径关闭挑战与脚本注入。<br>2. 保持响应 `Content-Type: application/json`。<br>3. 前端已加入 JSON 守卫与降级逻辑。 |
| **PHP 引用路径错误** | 相对路径写成 `api/...` 导致 `api/api/...` | 将所有 `require_once 'api/...';` 改为 `require_once __DIR__ . '/...';`，示例：`api/visit.php:9–10`、`api/stats.php:8–9`。 |

---

## 10. 前端稳定性与缓存策略

*   **Service Worker**：版本号 `v5`（`sw.js:9`），静态资源缓存，明确跳过 `/api/`（`sw.js:87–91`）。
*   **降级机制**：`js/main.js:118–210`。
    *   首选 `visit.php`；失败或非 JSON → `POST stats.php { action:'record', page }`，随后 `GET stats.php` 读取聚合统计。
*   **API 基址自动识别**：`js/api.js:13–24`，当主域为 `shadowquake.top` 时使用 `https://api.shadowquake.top/api`。
| **跨域错误 (CORS)** | 域名未在白名单 | 检查 `api/cors.php`，确保 `shadowquake.top` 已加入 `Access-Control-Allow-Origin`。 |

### 9.3 紧急联系人
*   **服务器运维**: 请提交 Issue 至 GitHub 仓库，标记为 `ops`。
*   **平台客服**:
    *   服务器: 阿里云 (Aliyun) / 腾讯云 (Tencent Cloud)

---

## 11. 常见 AI 低级错误与规避指南

为确保多智能体协作稳定，以下为在本项目中已出现或易出现的低级错误及规避策略，务必遵守。

### 11.1 接口与鉴权
- 不要在 404 时自动切换“静态模式”。404 表示资源缺失而非后端不可达；前端应保留 JSON 语义并提示（参考 `admin/admin.js:128-137`）。
- 管理端写操作必须携带 `x-admin-token`（见 4.1），包括：保存视频、保存设置、触发同步、Bangumi Subject 管理查询（`api/auth.php:34-67`）。
- 访问 Bangumi 需要 UA 与 Bearer：遵循官方 UA 规范并在需要授权的端点发送 `Authorization: Bearer <token>`；NSFW 未授权返回 404 属预期（`api/bgm_subject.php`, `admin/server.js:/api/bgm_subject`）。

### 11.2 数据与兼容性
- 不要破坏 `public/data/media.json` 结构。新增字段（如 `bgm_status`）应与现有 `status` 并存，避免前端崩溃（`api/sync_bangumi.php:77-87,94-105`）。
- 保持 API_BASE 一致性：生产前端统一指向 `https://api.shadowquake.top/api`（见 4.1）；本地 Node 端将 `.php` 路由映射到 REST 路径（`admin/admin.js:81-85`）。
- 严禁暴露 `api/settings.json`。仅通过受控接口读取/写入；确保 Web 服务器禁止直接访问（ADR-0005）。

### 11.3 输入校验与安全
- Subject ID 仅允许数字，必须校验（`api/bgm_subject.php:9-15`，`admin/server.js:/api/bgm_subject`）。
- 书签/页面参数需消毒，防止路径注入（`admin/server.js:535-541`）。
- SSRF 与跨域：RSS 代理必须限制域名白名单（见 6.2 与 Admin 代理实现）。

### 11.4 变更与验证
- 代码改动后必须运行测试：`npm test`（Vitest）。若添加 PHP 逻辑，需补充集成测试或人工验证。
- 变更保持向后兼容；前端 UI 的新增字段要同步占位与渲染逻辑（例如 `media-total` 与 `VideosManager` 的 `bgm_subject_id` 展示）。
- 修改后端端点时先全局检索使用点，避免漏改（建议先全局搜索，再定位实现与调用）。

### 11.5 文档与流程
- 未经明确请求不得创建新文档文件；更新需追加到现有开发手册并遵循章节结构（本节即示例）。
- ADR 规则：遇到反复出现的歧义或跨团队冲突，新增 ADR 记录并在 4 小时内裁决（见项目规则）。

> 以上规则为强制执行项。违反任何一条，QA 有权标注为高风险并冻结相关流水线。
    *   域名/CDN: 热铁盒 (HotIronBox) / Retinbox
