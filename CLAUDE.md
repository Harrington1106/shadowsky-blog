# ShadowQuake Blog

个人博客 shadowquake.top，部署在阿里云 ECS (47.118.28.27)。

## 项目结构

```
/
├── *.html              # 静态页面 (index/blog/moments/bookmarks/rss/acg/about...)
├── js/                  # 前端 JavaScript
│   ├── api.js          # API 客户端
│   ├── main.js         # 全局主脚本
│   ├── bookmarks.js    # 书签搜索/过滤
│   ├── context-menu.js # 右键菜单
│   └── ...
├── css/style.css       # Tailwind 编译产物
├── public/             # 静态资源 (图片/数据 JSON/文章)
│   └── data/           # 运行时数据 (被 .gitignore 排除)
├── api/                # PHP API 后端
├── admin/              # Node.js 管理后台 (server.js, port 3000)
└── CLAUDE.md           # 你在这里
```

## 技术栈

- **前端**: Vanilla HTML/JS + Tailwind CSS + Lucide Icons (CDN)
- **图标**: `<i data-lucide="icon-name">` + `lucide.createIcons()` 
- **后端**: PHP (api/) + Node.js Express (admin/server.js)
- **部署**: nginx 反代 → 静态文件 + proxy_pass :3000
- **版本控制**: git push → 服务器自动更新 (receive.denyCurrentBranch=updateInstead)

## 图标规范

全站导航栏图标统一：
- 首页: `house` | 博客: `file-text` | 随手拍: `camera`
- 收藏: `bookmark` | 订阅: `rss` | 视频: `film` | 关于: `user-circle`

右键菜单: `rotate-cw`(刷新) `chevron-up`(顶部) `chevron-left`(返回) `sun-moon`(主题)

改图标时确保所有页面一致，并检查 `lucide.createIcons()` 已调用。

## 编码规范

- 中文注释，英文变量名
- 所有 new Date 处理要考虑时区
- API 调用用 `window.api.xxx()` (来自 js/api.js)
- 数据文件在 public/data/，运行时数据不提交 git
- 修改 HTML 时注意 desktop nav 和 mobile nav 都要改

## 部署

```
git add -A && git commit -m "message" && git push
# 或在 WSL 中用 ship 命令
```

Node 后端重启: PM2 `pm2 restart shadowsky-admin`

## 注意事项

- `public/data/*.json` 在 .gitignore 中，不跟踪
- nginx root 指向 /www/wwwroot/47.118.28.27
- PHP API 路由: `/api/*.php` → fastcgi 127.0.0.1:9000
- Node 后端: `location /` → proxy_pass 127.0.0.1:3000
