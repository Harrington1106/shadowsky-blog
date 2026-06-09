# ShadowQuake Blog — Trae Rules

个人 ACG 博客 shadowquake.top。阿里云 ECS (47.118.28.27, Hangzhou) + Cloudflare CDN。

## 架构

```
用户 → Cloudflare DNS → Cloudflare Edge → nginx → Node.js:3000 (admin/server.js)
                                              ├── PHP-FPM:9000 (api/*.php)
                                              └── 静态文件 /www/wwwroot/47.118.28.27/

Bangumi API: Node → bangumi.shadowquake.top (CF Worker) → api.bgm.tv
```

## 项目结构

```
D:\Projects\shadowsky-blog\
├── .env                    # 环境变量 (部署到 /www/wwwroot/47.118.28.27/)
├── *.html                  # 14 个静态页面 (所有页面同步修改!)
├── js/                     # 前端 JS (api.js, main.js, bookmarks.js...)
├── css/style.css           # Tailwind 编译产物
├── public/data/            # 运行时 JSON (.gitignore, 不提交)
├── api/                    # PHP (已被 Node 接管大部分路由)
├── admin/server.js         # Node.js Express 主服务 :3000
└── workers/bangumi-proxy.js # Cloudflare Worker 代理 bgm.tv
```

## 环境变量 (.env)

Node 通过 `readEnvVar()` 直接读文件 (PM2 不加载 .env)。部署: `scp .env shadowsky:/www/wwwroot/47.118.28.27/`

关键变量:
- `ADMIN_TOKEN` — 首次启动自动生成
- `BANGUMI_API_BASE=https://bangumi.shadowquake.top` — Worker 代理地址
- `BANGUMI_USERNAME=shadowquake` / `BANGUMI_TOKEN=xxx`
- `DB_PASS` — 留空 (MySQL 已挂，全用 JSON 文件)

## ⚠️ 关键规则

1. **修改 HTML 模板必须检查全部 14 页**。不同页面有细微差异: index.html 无 navbar backdrop-blur；背景色分 bg-white/bg-gray-50；h1 部分页面用渐变色。

2. **禁止 read_file + write_file 编辑 HTML**。read_file 返回带行号前缀，write_file 原样写入会污染文件。用 terminal heredoc 或 patch 工具:
```bash
cd /mnt/d/Projects/shadowsky-blog && python3 << 'PYEOF'
with open('file.html') as f: content = f.read()
content = content.replace('old', 'new')
with open('file.html', 'w') as f: f.write(content)
PYEOF
```

3. **Bangumi 双数据源**: Node 读 `api/settings.json`，PHP 读 `.env`。改凭据两处都要改。

4. **数据全存 JSON 文件**，无 MySQL (mysqld 2025.12 已挂)。public/data/ 不提交 git。

5. **部署后用户必须 Ctrl+Shift+R** 绕过 Cloudflare 缓存。

## 部署命令

```bash
# HTML: scp *.html shadowsky:/www/wwwroot/47.118.28.27/
# .env: scp .env shadowsky:/www/wwwroot/47.118.28.27/
# server.js: scp admin/server.js shadowsky:/www/wwwroot/47.118.28.27/admin/
# 重启: ssh shadowsky 'pm2 restart shadowsky-admin'
```

## Cloudflare Worker (Bangumi 代理)

Worker 名 `bangumi-proxy`，路由 `bangumi.shadowquake.top/*`。
代码: `workers/bangumi-proxy.js` (service-worker 格式, addEventListener)。
更新: Cloudflare Dashboard → Workers → bangumi-proxy → Edit Code。

## 故障排查

- **页面乱码/行号**: read_file 污染文件 → `git checkout -- *.html` 恢复
- **部署后不更新**: 用户 Ctrl+Shift+R 强制刷新
- **Bangumi 同步失败**: 检查 Worker 在线 → 检查 .env 中 BANGUMI_API_BASE → `ssh shadowsky 'curl http://127.0.0.1:3000/api/bangumi.php'`
- **访问计数不更新**: `chown www:www api/data/shadowsky_stats.json`

## 编码规范

- 中文注释，英文变量名
- 前端 API: `window.api.xxx()` (js/api.js)
- 图标: Lucide `<i data-lucide="...">` + `lucide.createIcons()`
- 导航图标: house/file-text/camera/bookmark/rss/film/user-circle
- new Date 注意时区
- 改 HTML 时 desktop nav + mobile nav 都要改
