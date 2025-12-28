---
title: "开源我的 Obsidian 自动化博客工作流"
date: "2025-12-07"
category: "博客运维"
author: "Thoi"
tags: ["工作流", "Obsidian", "自动化", "Node.js"]
excerpt: "写博客最痛苦的不是写文章，而是繁琐的发布流程。今天我把这套基于 Obsidian + Templater + Node.js 的自动化工作流源代码完全开源，送给每一位热爱写作的朋友。"
readTime: 8
coverImage: "https://images.unsplash.com/photo-1499750310159-529800cf2c5a?auto=format&fit=crop&q=80&w=1000"
---

# 开源我的 Obsidian 自动化博客工作流

## 👋 为什么要有这篇文章？

作为一个程序员，最不能忍受的就是**重复劳动**。

以前我写博客的流程是这样的：
1. 手动新建一个 Markdown 文件。
2. 手动去查今天的日期，然后重命名文件 `2023-xx-xx-title.md`。
3. 手动复制粘贴 Front Matter（就是文件头部的元数据），修改标题、日期、分类。
4. 写完文章后，还得手动去更新 `posts.json` 索引文件，否则首页显示不出来。
5. 如果忘了找封面图，首页就是一片白。

**这也太痛苦了！** 🤯 写作的热情都在这些琐事中消磨殆尽。

于是，我花了一个周末，打造了一套**全自动化的博客写作工作流**。现在，我的流程是：

1. 打开 Obsidian。
2. 按下快捷键。
3. 开始写作。
4. 点一下发布脚本。

完事！🎉

今天，我就把这套系统的核心代码毫无保留地分享给大家。

---

## �️ 第一部分：Obsidian 里的“魔法” (The Writing Experience)

我使用 **Obsidian** 作为我的编辑器。它最强大的地方在于插件生态，特别是 **Templater** 插件。

### 1. 自动重命名与元数据填充

我写了一个 Templater 脚本，它能做到：
*   自动把文件名改成 `YYYY-MM-DD-slug.md` 的格式。
*   如果我没起名字，它会弹窗让我输入。
*   自动填好今天的日期、作者等信息。

**📝 核心代码分享 (`templates/New Post.md`)：**

把下面这段代码保存为 `New Post.md`，放在你的 Obsidian 模板文件夹里：

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
    // ✨ 魔法时刻：自动重命名当前文件
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

**怎么用？**
1.  安装 **Templater** 插件。
2.  新建一个文件 (`Ctrl+N`)。
3.  点击一下空白处（激活光标）。
4.  按 `Alt+E` 选择这个模板。
5.  **Boom!** 文件名变了，内容填好了，你只需要专注于写作。

---

## ⚙️ 第二部分：幕后的“大脑” (The Backend Logic)

文章写好了，怎么让博客系统（通常是 Next.js/React/Vue）知道多了一篇文章呢？

我们需要更新 `posts.json`。我写了一个 Node.js 脚本 `standardize_posts.js`，它不仅能生成索引，还能**自动修补**文章的缺陷。

它的功能包括：
1.  **扫描所有 .md 文件**。
2.  **自动计算阅读时间** (Read Time)。
3.  **自动生成摘要** (Excerpt)（如果没写的话）。
4.  **自动分配封面图** (Cover Image)（如果没配图，就根据标题哈希值随机分配一张，确保不单调）。

**💻 核心逻辑片段 (`scripts/standardize_posts.js`)：**

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
console.log('✅ Post index updated!');
```

这个脚本确保了我的博客数据永远是**完整、标准**的，无论我写的时候多么粗心。

---

## 🚀 第三部分：一键发布 (One-Click Deploy)

最后，为了把这些步骤串起来，我写了一个简单的 PowerShell 脚本 `publish.ps1`。

以后发布博客，我只需要双击这个图标，或者在终端敲一下：

```powershell
./publish.ps1
```

**📜 脚本内容 (`publish.ps1`)：**

```powershell
Write-Host "🔄 Updating post index..."

# 1. 运行上面的 Node.js 脚本，标准化文章并更新索引
npm run update-posts

Write-Host "✅ Post index updated."

# 2. (可选) Git 自动化提交
# git add .
# git commit -m "Update posts: $(Get-Date -Format 'yyyy-MM-dd')"
# git push

Write-Host "🚀 Ready to deploy!"
```

---

## � 总结

通过这三个步骤，我把博客维护的时间从**30分钟**压缩到了**30秒**。

*   **Obsidian + Templater**: 解决了“开始写”的阻力。
*   **Node.js 脚本**: 解决了“数据维护”的繁琐。
*   **PowerShell**: 解决了“发布流程”的重复。

技术是为了让生活更美好，希望这套工作流的代码能给你带来灵感！如果你也想搭建这样的博客，欢迎参考我的源码。

Happy Coding! Happy Writing! ✍️