/**
 * new-post.mjs —— 生成一篇新文章的骨架，丢进 content/drafts/。
 *
 * 只写「人才知道」的字段（标题/分类/标签/封面），机械字段（excerpt、readTime、
 * lastModified）一律留给 publish-post.mjs 在发布时算 —— 手写这些是上一版工作流里
 * 最容易忘、也最容易写错的部分（现有 19 篇的 excerpt 几乎全是把标题又抄了一遍，
 * BlogContent.js 里那个 trimTitlePrefix 就是为了在展示时把它剥掉）。
 *
 * 用法:
 *   cd web && node scripts/new-post.mjs "自建邮箱保姆级教程"
 *   cd web && node scripts/new-post.mjs "标题" --slug mailcow-guide --category 教程 --tags 邮箱,Docker
 *
 * 草稿目录可用 DRAFTS_DIR 覆盖（比如指到 Obsidian 库里）:
 *   DRAFTS_DIR="D:/Obsidian/我的库/blog" node scripts/new-post.mjs "标题"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(__dirname, '..');
const DRAFTS_DIR = process.env.DRAFTS_DIR || path.join(WEB, '..', 'content', 'drafts');

const DEFAULT_AUTHOR = process.env.POST_AUTHOR || 'Thoi';

/** 解析 --key value 形式的参数，返回 { _: [位置参数], key: value } */
function parseArgs(argv) {
    const out = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) out[a.slice(2)] = argv[++i] ?? true;
        else out._.push(a);
    }
    return out;
}

/**
 * 把标题转成 URL slug。
 * slug 就是线上地址 /post/<slug>，一旦发布就不该再改（改了等于换地址、丢外链），
 * 所以中文标题必须由人给一个英文 slug —— 这里只做兜底提示，不做拼音音译。
 */
function slugify(s) {
    return String(s)
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')   // 非单词字符统一成连字符
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

function today() {
    // 服务器与本机都按本地时区取日期即可，文章日期精确到天
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const args = parseArgs(process.argv.slice(2));
const title = args._.join(' ').trim();

if (!title) {
    console.error('用法: node scripts/new-post.mjs "文章标题" [--slug xxx] [--category 教程] [--tags a,b,c]');
    process.exit(1);
}

const date = args.date || today();
let slug = args.slug ? slugify(args.slug) : slugify(title);

// 中文 slug 会变成一串 %E4%BD%A0 的百分号编码地址，既不好看也不好分享
if (/[\u4e00-\u9fa5]/.test(slug)) {
    console.error(`✗ slug「${slug}」含中文。线上地址是 /post/<slug>，请用 --slug 指定一个英文 slug：`);
    console.error(`  node scripts/new-post.mjs "${title}" --slug your-english-slug`);
    process.exit(1);
}

const fileName = `${date}-${slug}.md`;
const target = path.join(DRAFTS_DIR, fileName);

if (fs.existsSync(target)) {
    console.error(`✗ 已存在: ${target}`);
    process.exit(1);
}

const tags = String(args.tags || '').split(',').map((t) => t.trim()).filter(Boolean);

const body = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${date}"
category: "${args.category || ''}"
author: "${DEFAULT_AUTHOR}"
tags: [${tags.map((t) => `"${t}"`).join(', ')}]
coverImage: ""
---

<!--
  excerpt / readTime / lastModified 不用写，发布时自动算。
  封面：PicList 传完把地址粘到上面 coverImage；发布时会自动落到自家服务器。
  正文别再重复一遍标题（页面顶部已经有大标题了），直接从第一段开始写。
-->

`;

fs.mkdirSync(DRAFTS_DIR, { recursive: true });
fs.writeFileSync(target, body, 'utf8');

console.log(`✓ 已创建 ${path.relative(process.cwd(), target)}`);
console.log(`  线上地址将是  /post/${date}-${slug}`);
console.log(`  写完后发布    node scripts/publish-post.mjs ${fileName} --dry-run`);
