---
title: "我的 Obsidian 博客写作工作流"
date: "2025-12-07"
category: "博客运维"
author: "Thoi"
tags: ["工作流","Obsidian","自动化","Node.js"]
excerpt: "写博客真正耗时间的不是写，是发布前后的琐事：改文件名、填 frontmatter、更新索引、补封面。这篇把我用 Obsidian + Templater + Node.js 搭的这套流程和代码完整写出来。"
lastModified: "2026-08-03"
readTime: 5
coverImage: "/uploads/covers/a402dfc0.webp"
---

以前我发一篇博客要做这么几件事：

1. 新建一个 Markdown 文件
2. 查今天的日期，把文件重命名成 `2023-xx-xx-title.md`
3. 复制粘贴 frontmatter，改标题、日期、分类
4. 写完之后更新 `posts.json` 索引，不然首页看不到
5. 忘了配封面图的话，首页就是一片白

真正在写字的时间可能十分钟，前后的杂活要花掉半小时。后来花了个周末把这些步骤全自动化了，现在的流程是：打开 Obsidian，按快捷键，写，最后跑一下发布脚本。

下面把三个环节的代码都放出来。

## 一、Obsidian 里的写作环节

编辑器用的是 Obsidian，主要看中它的插件生态，尤其是 Templater。

我写了一个 Templater 模板，它负责三件事：

- 把文件名改成 `YYYY-MM-DD-slug.md` 的格式
- 如果还没起名字，弹窗让我输入
- 自动填好日期、作者这些固定字段

### 模板代码

把下面这段存成 `New Post.md`，放进 Obsidian 的模板文件夹：

```javascript
<%*
// 1. 获取今天日期
const date = tp.date.now("YYYY-MM-DD");

// 2. 获取当前文件名
let filename = tp.file.title;

// 3. 如果文件名是"未命名"或"Untitled"，提示输入文件名
if (filename.startsWith("未命名") || filename.startsWith("Untitled")) {
    // 弹窗询问文件名（英文 Slug）
    filename = await tp.system.prompt("请输入文件名 (英文 Slug, 例如 my-post)");
    if (!filename) filename = "untitled-post";
}

// 4. 如果文件名还没有日期前缀，自动加上
if (!filename.match(/^\d{4}-\d{2}-\d{2}/)) {
    const newFilename = `${date}-${filename}`;
    // 自动重命名当前文件
    await tp.file.rename(newFilename);
    filename = newFilename;
}

// 5. 提取纯标题（去掉日期前缀）用于 Front Matter
const title = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
_%>
---
title: <% title %>
date: <% date %>
category: 未分类
author: Thoi
tags: []
excerpt: 
coverImage: 
---

# <% title %>

这里开始写正文...
```

### 用法

1. 装 Templater 插件
2. 新建文件（`Ctrl+N`）
3. 点一下空白处激活光标
4. 按 `Alt+E` 选这个模板

文件名和 frontmatter 就都好了，接下来只管写正文。

## 二、后端的索引生成

文章写完，博客系统还不知道多了一篇，需要更新 `posts.json`。

这一步交给一个 Node.js 脚本 `standardize_posts.js`。它除了生成索引，还会把文章里缺的字段补上：

1. 扫描所有 `.md` 文件
2. 计算阅读时间
3. 没写摘要的自动截取正文开头
4. 没配封面的，按标题哈希从图库里挑一张——同一个标题永远对应同一张图，不会每次构建都变

### 核心逻辑

```javascript
// ...前面的引入代码...

// 随机封面图库
const DEFAULT_COVERS = [
    "https://images.unsplash.com/photo-1...",
    "https://images.unsplash.com/photo-2...",
    // ... 更多图片
];

// 根据标题生成固定的随机封面（同一个标题永远对应同一张图）
function getRandomCover(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % DEFAULT_COVERS.length;
    return DEFAULT_COVERS[index];
}

// 主循环：处理每篇文章
files.forEach(file => {
    // ... 读取文件内容 ...

    // 如果没有封面，自动加上
    if (!metadata.coverImage) {
        metadata.coverImage = getRandomCover(metadata.title || file);
        hasChanges = true;
    }

    // 如果没有摘要，自动截取前120个字
    if (!metadata.excerpt) {
        metadata.excerpt = generateExcerpt(bodyContent);
        hasChanges = true;
    }

    // 计算阅读时间
    metadata.readTime = calcReadTime(bodyContent);

    // ... 如果有修改，写回文件 ...
});

// 最后生成 posts.json
fs.writeFileSync(outputFile, JSON.stringify(allPosts, null, 2));
console.log('Post index updated!');
```

这样一来，写的时候再怎么偷懒，索引里的数据都是齐的。

## 三、一键发布

最后把上面这些串起来，用一个 PowerShell 脚本 `publish.ps1`：

```powershell
Write-Host "Updating post index..."

# 1. 运行上面的 Node.js 脚本，标准化文章并更新索引
npm run update-posts

Write-Host "Post index updated."

# 2. (可选) Git 自动化提交
# git add .
# git commit -m "Update posts: $(Get-Date -Format 'yyyy-MM-dd')"
# git push

Write-Host "Ready to deploy!"
```

以后发布就是双击一下，或者在终端敲 `./publish.ps1`。

## 小结

三个环节各解决一件事：

- Obsidian 加 Templater，解决「开始写」之前的摩擦
- Node.js 脚本，解决元数据维护的琐碎
- PowerShell 脚本，解决发布流程的重复

维护博客的时间从半小时压到了半分钟。代码都在上面，按自己的目录结构改改就能用。
