---
title: "自动生成模板并发布文章的流程"
date: "2025-11-21"
category: "博客运维"
author: "THOI"
excerpt: "基于现有脚本，快速生成 Markdown 模板、撰写内容并更新文章索引，使博客列表与详情页同步显示。"
readTime: 6
tags: workflow, blog, automation
---

# 自动生成模板并发布文章的流程

这篇文章记录我在本站的写作发布流程：先用脚本自动生成 Markdown 模板，再填写内容，最后更新文章索引，让博客列表和详情页同步展示。

## 1. 自动生成 Markdown 模板

使用内置脚本生成标准模板文件，包含标题、日期、分类、标签等 Front Matter 元信息。

```bash
node js/create-post.js
```

- 按提示输入中文标题与英文简写（slug），脚本会在 `posts/` 目录创建形如 `YYYY-MM-DD-<slug>.md` 的新文件，并写入规范 Front Matter。
- 模板字段与渲染逻辑兼容列表页与详情页。

示例 Front Matter（支持多行或单行格式）：

```yaml
---
title: "我的文章标题"
date: "2025-11-21"
category: "随笔"
author: "THOI"
excerpt: "一句话简介用于列表卡片展示。"
tags: js, blog
---
```

## 2. 撰写正文内容

在模板下方开始写内容，支持 Markdown、代码高亮、数学公式（KaTeX）、流程图（Mermaid）等。

```markdown
# 正文标题

这里是正文段落。可以插入代码块、图片、列表等。
```

## 3. 更新文章索引

写完后更新文章索引，使博客列表页读取最新条目。

```bash
node js/generate-posts.js
```

- 索引文件为 `posts/posts.json`，博客列表页会从该文件读取标题、摘要、日期、标签等。
- 解析器支持多行与单行 Front Matter，并自动生成摘要与阅读时长。

## 4. 预览与发布

- 打开 `blog.html` 查看列表卡片；点击卡片跳转到详情页 `post.html?file=<文件名>`。
- 如果使用部署脚本或自动化流程，运行部署即可将更新上线。

## 5. 小贴士

- Front Matter 建议包含 `title/date/category/author/excerpt/tags`，格式可用逗号分隔或 YAML 列表。
- 需要封面时可在索引中加入 `coverImage` 字段并放置到合适位置。
- 文章中若包含 HTML 片段，详情页会进行安全净化后渲染。

完成以上步骤后，文章即可在列表与详情页正常显示。