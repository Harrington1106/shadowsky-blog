# ShadowQuake Blog

个人 ACG 博客 shadowquake.top，部署在阿里云 ECS (47.118.28.27, Hangzhou)，前端 Cloudflare CDN。

## 架构

```
用户 → Cloudflare DNS → Cloudflare Edge → nginx → Node.js:3000 (admin/server.js)
                                              ├── PHP-FPM:9000 (api/*.php, 仅静态/回退)
                                              └── 静态文件 /www/wwwroot/47.118.28.27/

Bangumi API:
  Node.js:3000 → bangumi.shadowquake.top (Cloudflare Worker) → api.bgm.tv
```

## 项目结构

```
D:\Projects\shadowsky-blog\
├── .env                    # 环境变量 (部署时 scp 到服务器根目录)
├── AGENTS.md               # 本文档
├── *.html                  # 14 个静态页面
├── js/                     # 前端 JavaScript
│   ├── api.js              # API 客户端 (window.api.xxx())
│   ├── main.js             # 全局脚本
│   ├── bookmarks.js        # 书签搜索/过滤
│   ├── context-menu.js     # 右键菜单
│   └── ...
├── css/style.css           # Tailwind 编译产物
├── public/data/            # 运行时 JSON 数据 (.gitignore)
│   ├── bookmarks.json
│   ├── moments.json
│   ├── media.json          # Bangumi 同步结果
│   ├── feeds.json
│   ├── videos.json
│   ├── visits.json
│   ├── page_visits.json
│   └── notice.json
├── api/                    # PHP API (次要，Node 已接管大部分路由)
│   ├── config.php          # 读 .env → DB/Bangumi 配置
│   ├── auth.php            # ADMIN_TOKEN 认证
│   ├── data/               # PHP KVDB JSON 存储
│   └── ...
├── admin/
│   ├── server.js           # Node.js Express 主服务 (端口 3000)
│   ├── admin.js            # 前端管理脚本
│   ├── index.html          # 管理后台页面
│   └── package.json
└── workers/
    └── bangumi-proxy.js    # Cloudflare Worker (代理 api.bgm.tv)
```

## 技术栈

- **前端**: Vanilla HTML/JS + Tailwind CSS (CDN) + Lucide Icons (CDN)
- **图标**: `<i data-lucide="icon-name">` → `lucide.createIcons()`
- **后端**: Node.js Express (admin/server.js, port 3000) + PHP (回退)
- **静态托管**: nginx root + proxy_pass :3000
- **进程管理**: PM2 (`pm2 restart shadowsky-admin`)
- **CDN/代理**: Cloudflare (DNS + Worker)
- **数据存储**: JSON 文件 (无 MySQL，mysqld 2025年12月已挂)

## 环境变量 (.env)

位置: 项目根目录 `.env`，部署时 scp 到服务器 `/www/wwwroot/47.118.28.27/.env`

Node 端通过 `readEnvVar()` 函数直接读文件 (非 process.env，因为 PM2 不加载 .env)。
PHP 端通过 `api/config.php` 的 `loadEnvConfig()` 读取。

### 完整变量

| 变量 | 用途 | 默认值 | 谁用 |
|------|------|--------|------|
| `ADMIN_TOKEN` | 后台认证令牌 (48-char hex) | 首次启动自动生成 | Node, PHP |
| `PORT` | Node 监听端口 | 3000 | Node |
| `HOST` | Node 绑定地址 | 127.0.0.1 | Node |
| `RSS_PROXY_ALLOWED_HOSTS` | RSS 代理域名白名单 | 空=全允许 | Node |
| `CORS_ALLOWED_ORIGINS` | CORS 来源 | 内置默认值 | Node |
| `BANGUMI_API_BASE` | Bangumi API 代理地址 | `https://api.bgm.tv` | Node |
| `BANGUMI_USERNAME` | Bangumi 用户名 | 空 | PHP |
| `BANGUMI_TOKEN` | Bangumi API Token | 空 | Node, PHP |
| `DB_HOST` | MySQL 主机 | localhost | PHP (不用) |
| `DB_PORT` | MySQL 端口 | 3306 | PHP (不用) |
| `DB_NAME` | 数据库名 | shadowsky_blog | PHP (不用) |
| `DB_USER` | 数据库用户 | shadowsky_blog | PHP (不用) |
| `DB_PASS` | 数据库密码 | 空=跳过 DB | PHP (不用) |

**重要**: 当前 MySQL 已挂，DB_PASS 留空。所有数据存 JSON 文件。BANGUMI_API_BASE 指向 Cloudflare Worker 代理（国内服务器无法直连 api.bgm.tv）。

## ⚠️ Bangumi 配置: 双数据源！

Node 端从 `api/settings.json` 读 Bangumi 凭据：
```json
{"bangumi_username": "shadowquake", "bangumi_token": "HhoDa5R..."}
```

PHP 端从 `.env` 读：
```
BANGUMI_USERNAME=shadowquake
BANGUMI_TOKEN=HhoDa5R...
```

修改 Bangumi 凭据时**两处都要改**。

## ⚠️ read_file + write_file 坑

`read_file()` 返回带行号前缀的内容 `     1|content`，`write_file()` 原样写入 → 行号会污染文件。

**禁止**在 execute_code 中用 read_file + write_file 编辑 HTML/CSS。
用 terminal heredoc 或 `patch` 工具：
```bash
cd /mnt/d/Projects/shadowsky-blog && python3 << 'PYEOF'
with open('file.html') as f: content = f.read()
content = content.replace('old', 'new')
with open('file.html', 'w') as f: f.write(content)
PYEOF
```

## UI 模板一致性

修改任何模板/样式时必须检查所有 14 个 HTML 页面。

| 规则 | 详情 |
|------|------|
| navbar backdrop-blur | index.html 除外 (透明)，其他全部有 |
| body 背景 | index/post 用 bg-white，其余 bg-gray-50 |
| 导航栏图标 | 全站统一: house/file-text/camera/bookmark/rss/film/user-circle |
| 访问计数 | RSS 药丸样式 + 绿点呼吸动画 |
| h1 标题 | moments/bookmarks/blog 用渐变色，其余 plain |
| 颜色体系 | 每页固定 gray 或 slate，不混用 |

修改后验证:
```bash
grep -c 'pattern' *.html   # 每文件计数
```

## 部署

```bash
# HTML 文件:
scp *.html shadowsky:/www/wwwroot/47.118.28.27/

# .env 更新:
scp .env shadowsky:/www/wwwroot/47.118.28.27/

# server.js 更新:
scp admin/server.js shadowsky:/www/wwwroot/47.118.28.27/admin/
ssh shadowsky 'pm2 restart shadowsky-admin'

# 或用 git push (服务器 receive.denyCurrentBranch=updateInstead)
```

部署后提醒用户 **Ctrl+Shift+R** 强制刷新绕过 Cloudflare 缓存。

## Cloudflare Worker (Bangumi 代理)

`workers/bangumi-proxy.js` — 代理 `api.bgm.tv`，解决国内服务器无法直连的问题。

当前部署: `bangumi.shadowquake.top` → Worker `bangumi-proxy`

部署/更新 Worker:
1. Cloudflare Dashboard → Workers & Pages → bangumi-proxy → 编辑代码
2. 粘贴 `workers/bangumi-proxy.js` → 保存并部署

## 图标规范

全站导航栏: `house`(首页) `file-text`(博客) `camera`(随手拍) `bookmark`(收藏) `rss`(订阅) `film`(视频) `user-circle`(关于)
右键菜单: `rotate-cw`(刷新) `chevron-up`(顶部) `chevron-left`(返回) `sun-moon`(主题)

改图标时所有 14 页一起改。

## 编码规范

- 中文注释，英文变量名
- new Date 注意时区
- 前端 API: `window.api.xxx()` (js/api.js)
- `public/data/*.json` 在 .gitignore，不提交
- 改 HTML 时 desktop nav + mobile nav 都要改

## 故障排查

### 页面显示行号/乱码
诊断: `ssh shadowsky 'head -1 /www/wwwroot/47.118.28.27/file.html | od -c | head -2'`
正常: `< ! D O C T Y P E` 开头。异常: `1 | < ! D O C` 开头。
修复: `git checkout -- *.html` 恢复，用 heredoc/patch 重做。

### 部署后仍是旧版
Cloudflare 缓存。用户 Ctrl+Shift+R 强制刷新。仍不行: Cloudflare → 缓存 → 清除所有。

### Bangumi 同步失败 "Failed to fetch Bangumi data"
api.bgm.tv 从国内不可达。检查 Worker 是否在线:
```bash
ssh shadowsky 'curl -sS --max-time 10 https://bangumi.shadowquake.top/v0/users/shadowquake -H "Authorization: Bearer HhoDa5R..."'
```
若 Worker 正常但 Node 仍失败，检查 `.env` 中 `BANGUMI_API_BASE` 是否设置。

### PM2 重启
```bash
ssh shadowsky 'pm2 restart shadowsky-admin'
```
PM2 会提示 `Use --update-env` — **忽略**。Node 通过 readEnvVar() 直接读 .env 文件，不依赖 PM2 环境注入。

### 访问计数不更新
`api/data/shadowsky_stats.json` 权限问题:
```bash
ssh shadowsky 'chown www:www /www/wwwroot/47.118.28.27/api/data/shadowsky_stats.json'
```
