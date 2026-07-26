把当前修改提交并部署到线上（v2）：

1. `git add -A`
2. `git commit -m "$ARGUMENTS"`（$ARGUMENTS 为空时先问用户要 commit message）
3. `git push github master`
4. `bash scripts/deploy-v2.sh`

注意：`git push` **不会**触发部署，v2 是「本地构建 → scp 产物 → 服务器 docker build → 换容器」，
必须跑第 4 步。脚本内置防呆（拒绝把 `web/.env` 打进镜像）和部署后验证
（逐路由 200 + 直连容器与经 nginx 的 md5 比对，用来抓 nginx proxy_cache 发旧页面）。

只改了文档/脚本、没动 `web/` 时，跳过第 4 步即可。
