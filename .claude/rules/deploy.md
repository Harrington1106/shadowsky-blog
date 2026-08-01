# 部署规范（v2）

线上跑的是 `web/` 的 v2 应用（Docker 容器 `shadowsky-v2`，宿主 127.0.0.1:3001）。
**`git push` 不再触发部署**——那是 v1 时代的机制。完整步骤见 CLAUDE.md「部署（v2）」。

## v2 部署（本地构建 → scp 产物 → 服务器重建容器）

```bash
cd web && npm run build
# 组装 _deploy/（standalone + static + public + db/migrations + Dockerfile.deploy）→ tar → scp
# 服务器：docker build -f Dockerfile.deploy -t shadowquake-v2:latest . && 换容器
```

数据全在挂载卷（`db/` `content/` `data/uploads`）里，容器可随意重建，不会丢数据。

## 遗留静态页部署

只剩 `gnz48.html` 及它的 `app.js / data.js / team-g.ics / schedule.json` 还是静态文件，
由 `/www/wwwroot/legacy-static/` 提供（旧站根目录 `/www/wwwroot/47.118.28.27/` 已随 v1 删除）：

```bash
scp gnz48.html shadowsky:/www/wwwroot/legacy-static/
```

`/ai-daily/*.html` 归档页已于 2026-08-01 退役，现在由 nginx 301 到 v2
（`YYYY-MM-DD.html → /post?ai=YYYY-MM-DD`，其余 → `/blog#aidaily`），不再需要部署。

## 重要注意事项

1. **永远不要提交运行时数据**：`web/db/*.db`、`web/data/`、`public/data/*.json`、`web/_deploy/`、`web/deploy.tgz`
2. **先 git pull --rebase 再 push**
3. **部署完要验证**：`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/` + 浏览器 Ctrl+Shift+R
4. **改服务器配置前先备份**：nginx conf 和 crontab 都 `cp`/`crontab -l >` 存一份带时间戳的
5. **ssh 别名**：`shadowsky` → root@47.118.28.27

## 常用运维命令

```bash
ssh shadowsky 'docker restart shadowsky-v2'          # 重启 v2
ssh shadowsky 'docker logs --tail 50 shadowsky-v2'   # 看日志
ssh shadowsky 'nginx -t && nginx -s reload'          # 重载 nginx
ssh shadowsky 'bash /www/wwwroot/shadowquake-v2/backup-v2.sh'   # 手动备份
```

`pm2 restart shadowsky-admin` 只影响已下线的旧 Express，日常不需要。
