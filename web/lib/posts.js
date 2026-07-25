/**
 * 文章索引 —— 从 content/posts 的 .md frontmatter 实时生成(30s 缓存)。
 * 不依赖预生成的 posts.json:发文=丢一个 .md 文件即出现(守 C5)。
 * 移植自旧 Express getPostsIndex 的解析逻辑。
 */
import fs from 'node:fs';
import path from 'node:path';
import { postsDir } from './content.js';

let cache = null;
let cacheTime = 0;

function parseFrontMatter(raw) {
    const fm = {};
    const parts = raw.split('---', 3);
    if (parts.length >= 3) {
        for (const line of parts[1].trim().split('\n')) {
            const ci = line.indexOf(':');
            if (ci === -1) continue;
            const k = line.slice(0, ci).trim();
            let v = line.slice(ci + 1).trim().replace(/^["']|["']$/g, '');
            if (k === 'tags') { try { fm[k] = JSON.parse(v); } catch { fm[k] = []; } }
            else if (k === 'readTime') fm[k] = parseInt(v, 10) || 5;
            else fm[k] = v;
        }
    }
    return fm;
}

/** 返回文章索引数组(按日期倒序),形态与旧 posts.json 一致。 */
export function getPostsIndex() {
    if (cache && Date.now() - cacheTime < 30_000) return cache;
    const dir = postsDir();
    let files;
    try {
        files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !f.includes('sample') && !f.includes('templates') && !f.includes('auto_write'));
    } catch {
        return [];
    }
    const posts = files.map((file) => {
        const fm = parseFrontMatter(fs.readFileSync(path.join(dir, file), 'utf8'));
        const cat = fm.category;
        return {
            title: fm.title || '', date: fm.date || '',
            category: (!cat || cat === 'Uncategorized') ? '其他' : cat,
            author: fm.author || 'Thoi',
            tags: Array.isArray(fm.tags) ? fm.tags : [],
            excerpt: fm.excerpt || '', readTime: fm.readTime || 5,
            coverImage: fm.coverImage || '', lastModified: fm.lastModified || '', file,
        };
    });
    posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    cache = posts;
    cacheTime = Date.now();
    return posts;
}
