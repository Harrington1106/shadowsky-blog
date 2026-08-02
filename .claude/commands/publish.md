把一篇草稿发到线上。$ARGUMENTS 是草稿文件名（`content/drafts/` 下），为空时先列出草稿问用户发哪篇。

```bash
cd web
node scripts/publish-post.mjs <文件名> --dry-run   # 先看会做什么
node scripts/publish-post.mjs <文件名>             # 确认后真发
```

**发文章不需要部署**。文章正文在挂载卷里（`content/posts`），不在 Docker 镜像里；
`lib/posts.js` 的索引只缓存 30s，正文按文件 mtime 失效。所以**不要**跑 `deploy-v2.sh`，
那是改了 `web/` 代码才需要的。

脚本会自动：校验 frontmatter → 算 excerpt / readTime / lastModified →
把跨境图片（PicList 传的 GitHub/jsDelivr 等）镜像到服务器 uploads 卷并改写地址 →
scp 到服务器 → 清 CF 缓存 → 验证线上 200。

常用参数：
- `--preview` 先写进本地 `content/posts/` 用真实列表看排版（**不上线**）
- `--strip-h1` 删掉正文里与标题重复的 H1（页面顶部已有大标题）
- `--keep-remote-images` 不镜像图片，自担跨境代价

跨境图床在大陆多半要过代理，下载失败时提示用户带上 `HTTPS_PROXY` 重跑。

发完提醒用户归档：`bash scripts/pull-content.sh --commit`。
