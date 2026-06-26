/**
 * 博客文章索引生成器
 * 从 public/posts/*.md 读取 frontmatter，生成 posts.json
 * 用法: node generate_posts_json.js
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, 'public', 'posts');
const OUTPUT = path.join(POSTS_DIR, 'posts.json');

function parseFrontMatter(text) {
    const parts = text.split('---', 3);
    if (parts.length < 3) return { metadata: {}, content: text };

    const fmLines = parts[1].trim().split('\n');
    const metadata = {};

    for (const line of fmLines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;

        const key = line.substring(0, colonIdx).trim();
        let value = line.substring(colonIdx + 1).trim();

        // 去掉引号
        value = value.replace(/^["']|["']$/g, '');

        // tags 特殊处理
        if (key === 'tags') {
            try {
                metadata[key] = JSON.parse(value);
            } catch {
                // 兼容 YAML 风格 [a, b, c]
                const cleaned = value.replace(/^\[|\]$/g, '');
                metadata[key] = cleaned.split(',')
                    .map(t => t.trim().replace(/^["']|["']$/g, ''))
                    .filter(Boolean);
            }
        } else if (key === 'readTime') {
            metadata[key] = parseInt(value) || 5;
        } else {
            metadata[key] = value;
        }
    }

    return {
        metadata,
        content: parts[2] || ''
    };
}

function generate() {
    const files = fs.readdirSync(POSTS_DIR)
        .filter(f => f.endsWith('.md') && !f.includes('sample') && !f.includes('templates'))
        .sort()
        .reverse();

    const posts = [];

    for (const file of files) {
        const filePath = path.join(POSTS_DIR, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { metadata } = parseFrontMatter(raw);

        posts.push({
            title: metadata.title || '无标题',
            date: metadata.date || '',
            category: metadata.category || '未分类',
            author: metadata.author || 'Thoi',
            tags: Array.isArray(metadata.tags) ? metadata.tags : [],
            excerpt: metadata.excerpt || '',
            readTime: metadata.readTime || 5,
            coverImage: metadata.coverImage || '',
            lastModified: metadata.lastModified || '',
            file: file
        });
    }

    fs.writeFileSync(OUTPUT, JSON.stringify(posts, null, 2), 'utf-8');
    console.log(`✅ 已生成 ${OUTPUT}（${posts.length} 篇文章）`);

    // 统计
    const categories = [...new Set(posts.map(p => p.category))];
    const allTags = new Set();
    posts.forEach(p => p.tags.forEach(t => allTags.add(t)));
    console.log(`   分类: ${categories.length}  标签: ${allTags.size}`);
}

generate();
