# 博客文章管理流程

## 一句话总结

文章就是 `public/posts/` 里的 `.md` 文件。改了文件 → git push → 完事。`posts.json` 服务器自动生成，不用管。

---

## 写新文章

1. 打开 Obsidian，vault 选 `public/posts/`
2. 新建笔记，用 Templater 模板（`templates/New Post.md`）
3. 模板会自动生成 frontmatter：

```
---
title: 文章标题
date: 2026-06-27
category: 开发与技术
author: Thoi
tags: [标签1, 标签2]
excerpt: 一句话摘要
coverImage: https://xxx.jpg
---
```

4. 文件名格式：`YYYY-MM-DD-slug.md`（如 `2026-06-27-my-post.md`）
5. 写完内容，保存
6. 部署：

```bash
git add public/posts/2026-06-27-my-post.md
git commit -m "post: 新文章标题"
git pull --rebase
git push
```

---

## 修改文章

1. 在 Obsidian 里打开 `.md` 文件，直接改
2. 如果想更新"最后修改时间"，手动改 frontmatter 里的 `lastModified` 字段
3. 部署：

```bash
git add public/posts/文章文件名.md
git commit -m "post: 修改 xxx 文章"
git pull --rebase
git push
```

---

## 删除文章

1. 在 Obsidian 里右键 → 删除，或直接删 `.md` 文件
2. 部署：

```bash
git rm public/posts/文章文件名.md
git commit -m "post: 删除 xxx 文章"
git pull --rebase
git push
```

---

## 部署后

- 推送后服务器自动更新
- `posts.json` 自动重新生成（服务器扫描 `.md` 文件，30秒缓存过期后刷新）
- 访问 `shadowquake.top/blog.html` 查看效果
- **Ctrl+Shift+R** 强制刷新绕过 Cloudflare 缓存

---

## 文件结构

```
public/posts/
├── 2025-12-07-blog-workflow.md    ← 文章（文件名决定排序）
├── 2025-12-08-docker-guide.md
├── 2026-06-27-my-post.md
├── posts.json                     ← ⚠️ 不存磁盘，服务器实时生成
├── templates/
│   └── New Post.md                ← Obsidian 模板
└── .obsidian/                     ← Obsidian 配置（插件等）
```

---

## 注意事项

| 事项 | 说明 |
|------|------|
| 文件名 | 必须 `YYYY-MM-DD-slug.md` 格式，日期决定文章排序 |
| frontmatter | 用 `---` 包裹，必须包含 title 和 date |
| category | 建议写中文名，如 `开发与技术`、`博客运维` |
| 图片 | 用 PicGo/PicList 插件自动上传到图床 |
| 推送前 | **必须** `git pull --rebase`，防止覆盖服务器自动变更 |
| 运行时数据 | `public/data/*.json` 已加入 `.gitignore`，不会被提交覆盖 |
