重启线上 v2 服务（Docker 容器 `shadowsky-v2`）：

```bash
ssh shadowsky 'docker restart shadowsky-v2 && sleep 3 && docker ps --filter name=shadowsky-v2 --format "{{.Status}}"'
ssh shadowsky 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/'
```

$ARGUMENTS 传入 "log" 时改为看日志：

```bash
ssh shadowsky 'docker logs --tail 50 shadowsky-v2'
```

旧的 PM2 后端（`shadowsky-admin`）已于 2026-07-26 随旧系统一起下线，不要再用 `pm2 restart`。
