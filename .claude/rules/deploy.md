# 部署规范

## 部署命令

```bash
git add -A && git commit -m "message" && git push
```

push 后服务器自动更新（`receive.denyCurrentBranch = updateInstead`）。

## 重要注意事项

1. **永远不要 push 运行时数据**: public/data/*.json 在 .gitignore 中
2. **先 git pull --rebase 再 push**: 服务器可能有自动写入（访问统计等）
3. **修改后测试**: 部署完不等于能用，确认功能正常
4. **WSL ssh 别名**: `shadowsky` → root@47.118.28.27

## 服务器重启

Node 后端 (shadowsky-admin):
```bash
ssh shadowsky 'pm2 restart shadowsky-admin'
```

Nginx 重载:
```bash
ssh shadowsky 'nginx -s reload'
```
