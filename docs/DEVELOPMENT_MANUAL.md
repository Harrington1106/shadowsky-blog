# ShadowSky 网站开发文档

**版本**: 1.0.1  
**最后更新**: 2025-12-28  
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


### 3.3 访客统计系统 (Visitor Count System)

#### 3.3.1 架构与数据流
访客统计系统通过以下链路工作：
1.  **前端 (Browser)**: 用户访问页面 -> `js/main.js` 调用 `updateVisitCount()` -> `js/api.js` 调用 `fetchVisitCount()`.
    *   **动态 Endpoint**: `api.js` 会根据当前域名判断：
        *   若是 `shadowquake.top` (生产)，使用相对路径 `/api` (避免 Mixed Content)。
        *   若是 `localhost`，使用 `http://localhost:3000/api`。
2.  **后端 (Server)**: 请求到达 `/api/visit.php`.
    *   **依赖**: `visit.php` 依赖 `db_helper.php` 提供 KVDB/MySQL 抽象。
    *   **逻辑**: 尝试写入 KVDB -> 失败则写入 MySQL -> 失败则降级到文件。
3.  **数据库**: 数据最终存储在 MySQL 表 `page_visits` 或 KV 存储中。

#### 3.3.2 常见故障与修复 (Critical Troubleshooting)
*   **Mixed Content Error (HTTPS 引用 HTTP)**:
    *   **现象**: 浏览器控制台报错 `Blocked loading mixed active content "http://47.118.28.27/api/visit.php"`.
    *   **原因**: 生产环境 (HTTPS) 试图访问硬编码的 IP 地址 (HTTP)。
    *   **修复**: 确保 `js/api.js` 和 `js/tracker.js` 使用 **相对路径** (`/api/...`) 或 **动态 HTTPS 域名** (`https://api.shadowquake.top/...`)。**严禁在前端代码中硬编码 HTTP IP。**

*   **500 Internal Server Error**:
    *   **现象**: 访问 `/api/visit.php` 返回 500。
    *   **原因**:
        1.  **文件缺失**: `api/db_helper.php` 未部署到服务器。
        2.  **权限错误**: `data/` 目录不可写。
        3.  **PHP 语法错误**: 使用了 PHP 7+ 语法 (如 `??`) 但服务器是 PHP 5.6。
    *   **修复**: 检查 GitHub Actions 部署日志，确保所有 PHP 文件（尤其是新增加的 `db_helper.php`）都已成功上传。

*   **Service Worker Cache Failed**:
    *   **现象**: 控制台报错 `[SW] Cache failed`.
    *   **原因**: `sw.js` 中列出的 `STATIC_ASSETS` 有文件不存在（404）。Service Worker 的 `addAll` 是原子操作，只要有一个文件失败，整个缓存就失败。
    *   **修复**: 检查 `sw.js` 列表中的每个文件是否真实存在于服务器。

### 3.4 部署故障排除 (Deployment Troubleshooting)

#### 3.4.1 GitHub Actions 部署失败
若 GitHub Actions 提示 "All jobs have failed" 且耗时极短 (如 < 30s)：
1.  **检查工作流文件**: 确保 `.github/workflows/deploy.yml` 包含 `actions/checkout` 步骤。
    *   **原因**: 许多 Deploy Action 不会自动拉取代码，导致尝试部署空目录或缺少依赖。
2.  **检查依赖**: 确保构建脚本 (`npm run build`) 所需的 `node_modules` 已安装 (使用 `npm install`)。
3.  **检查 Secrets**: 确保 `RTH_API_KEY` 在 GitHub 仓库的 Secrets 中正确配置。

#### 3.4.2 本地部署 (Fallback)
若 CI/CD 彻底瘫痪，可使用本地脚本紧急修复：
1.  确保本地 `.env` 文件包含 `RTH_API_KEY`.
2.  运行: `npm run deploy:rth` (PowerShell).
3.  此脚本会自动处理 API 适配和文件上传。

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
