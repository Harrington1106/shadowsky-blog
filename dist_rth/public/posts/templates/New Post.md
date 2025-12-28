<%*
// 1. 获取今天日期
const date = tp.date.now("YYYY-MM-DD");

// 2. 获取当前文件名
let filename = tp.file.title;

// 3. 如果文件名是"未命名"或"Untitled"，提示输入文件名
if (filename.startsWith("未命名") || filename.startsWith("Untitled")) {
    filename = await tp.system.prompt("请输入文件名 (英文 Slug, 例如 my-post)");
    if (!filename) filename = "untitled-post";
}

// 4. 如果文件名还没有日期前缀，自动加上
if (!filename.match(/^\d{4}-\d{2}-\d{2}/)) {
    const newFilename = `${date}-${filename}`;
    await tp.file.rename(newFilename);
    filename = newFilename;
}

// 5. 提取纯标题（去掉日期前缀）用于 FrontMatter
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
