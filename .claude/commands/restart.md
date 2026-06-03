重启服务器 Node.js 后端服务：

```bash
ssh shadowsky 'pm2 restart shadowsky-admin && pm2 status'
```

$ARGUMENTS 可选: 传入 "log" 查看最近日志。

注意: 需要 WSL 环境才能用 `ssh shadowsky` 别名。
