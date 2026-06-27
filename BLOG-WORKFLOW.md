# 博客文章管理流程

## 万能部署命令（唯一需要记的）

```bash
bash deploy.sh "做了什么"
```

一条命令 = 自动版本号 + 全部添加 + 提交 + 拉取 + 推送 + 冲突处理。

---

## 写新文章

1. Obsidian 新建笔记，文件名 `YYYY-MM-DD-slug.md`
2. 写完保存
3. `bash deploy.sh "新文章: xxx"`

## 修改文章

1. Obsidian 改内容
2. `bash deploy.sh "修改: xxx"`

## 删除文章

1. Obsidian 删 `.md`（或用 admin 面板点删除）
2. `bash deploy.sh "删除: xxx"`

## 部署后

访问 `shadowquake.top/blog.html` → **Ctrl+Shift+R** 强制刷新。
`posts.json` 服务器自动生成，不用管。
