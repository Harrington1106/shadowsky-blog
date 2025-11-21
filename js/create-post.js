// create-post.js - 自动化创建新的 Markdown 文章文件 (已精简模板)

const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')({ sigint: true }); // 用于命令行输入

// --- 配置 ---
const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, 'posts');

// 检查 posts 文件夹是否存在
if (!fs.existsSync(POSTS_DIR)) {
    console.error(`错误：未找到 posts 文件夹，请确保 ${POSTS_DIR} 存在`);
    process.exit(1);
}

// 辅助函数：将文本转换为 slug (小写, 连字符连接)
function slugify(text) {
    return text.toLowerCase()
        .replace(/\s+/g, '-')       // 替换空格为连字符
        .replace(/[^\w\-]+/g, '')   // 移除所有非单词字符
        .replace(/\-\-+/g, '-')     // 压缩多个连字符
        .trim();
}

// 辅助函数：获取 ISO 格式的精确日期和时间 (YYYY-MM-DDTHH:mm:ssZ)
function getCurrentISODate() {
    // 获取当前时间并确保格式为 ISO 8601，精确到秒，并以 Z 结尾表示 UTC 时间
    return new Date().toISOString().slice(0, 19) + 'Z'; 
}

// --- 模板内容 (已移除 coverImage 和 readTime) ---
const POST_TEMPLATE = (title, filename, isoDate) => `---
# ===================================================================
# 📝 文章 Front Matter (YAML 格式)
# ===================================================================
title: "${title}"
date: "${isoDate}"
file: "${filename}"

# ===================================================================
# 列表页展示字段
# ===================================================================
category: "未分类"
author: "你的名字"
excerpt: "这里是文章的摘要或简介，它将显示在博客列表卡片上，请控制在120字以内。"
tags: 
    - 标签A
    - 标签B

---

# ${title}

## 1. 文章正文从这里开始

请在这里开始撰写你的内容。
`;

// --- 主执行逻辑 ---
function createNewPost() {
    console.log("--- 🚀 博客文章创建工具 ---");
    
    // 1. 获取用户输入的标题和文件名简写 (Slug)
    const title = prompt('请输入新文章的中文标题: ');
    // 建议用户输入英文 slug 来避免中文乱码问题
    const manualSlug = prompt('请输入新文章的英文简写 (例如: my-new-post): ');

    if (!title || !manualSlug) {
        console.log("❌ 标题和简写都不能为空。操作取消。");
        return;
    }

    // 2. 生成文件名和时间
    const datePart = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const slug = slugify(manualSlug); // 确保手动输入的 slug 是干净的
    const filename = `${datePart}-${slug}.md`;
    const fullPath = path.join(POSTS_DIR, filename);
    const isoDate = getCurrentISODate(); // 获取精确到秒的 ISO 格式时间

    // 3. 检查文件是否已存在
    if (fs.existsSync(fullPath)) {
        console.log(`⚠️ 文件已存在: ${filename}。操作取消。`);
        return;
    }

    // 4. 写入文件
    const content = POST_TEMPLATE(title, filename, isoDate);
    try {
        fs.writeFileSync(fullPath, content);
        console.log(`\n✅ 文章模板创建成功!`);
        console.log(`   文件路径: ${fullPath}`);
        console.log(`   文件名: ${filename}`);
        console.log(`   请打开文件开始撰写内容。`);
        console.log(`   完成撰写后，请运行 'node js/generate-posts.js' 更新索引。`);
    } catch (error) {
        console.error("❌ 写入文件时发生错误:", error);
    }
}

createNewPost();