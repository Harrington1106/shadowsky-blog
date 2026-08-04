/**
 * 本地发布台的服务端共用逻辑（/admin/publish 的后端）。
 *
 * ⚠ 这一组接口**只在本机 dev 环境存在**。
 *   发布要 ssh/scp 到服务器，而线上跑的容器里既没有私钥也不该有 ——
 *   所以每个 route 第一件事就是 devOnly()，生产环境一律 404，
 *   连「存在这个接口」这件事都不暴露。
 *
 * 计算逻辑一律复用 scripts/lib/post-meta.mjs（发布台、CLI、这里三处同一份），
 * 免得同一篇文章在三个地方算出三个答案。
 */
import fs from 'node:fs';
import path from 'node:path';
import {
    parseFrontMatter, buildFrontMatter, computeExcerpt, computeReadTime,
    collectImageUrls, validate, duplicateH1, lintBody,
} from '../scripts/lib/post-meta.mjs';
import { renderMarkdown } from './renderMarkdown.js';

const WEB = process.cwd();
export const DRAFTS_DIR = process.env.DRAFTS_DIR || path.join(WEB, '..', 'content', 'drafts');
export const LOCAL_POSTS = path.join(WEB, '..', 'content', 'posts');

/** 生产环境直接当这些接口不存在 */
export function devOnly() {
    if (process.env.NODE_ENV === 'production') {
        return new Response('Not found', { status: 404 });
    }
    return null;
}

/** 一律 basename，挡路径穿越；src 只有 draft / post 两种 */
export function resolveFile(file, src) {
    const name = path.basename(String(file || ''));
    if (!name.endsWith('.md')) throw new Error('只接受 .md 文件');
    const dir = src === 'post' ? LOCAL_POSTS : DRAFTS_DIR;
    const full = path.join(dir, name);
    if (!fs.existsSync(full)) throw new Error(`找不到 ${name}`);
    return full;
}

const cjk = (s) => (s.match(/[一-龥]/g) || []).length;

function listDir(dir, src) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => {
            const full = path.join(dir, f);
            const raw = fs.readFileSync(full, 'utf8');
            const { fm, body } = parseFrontMatter(raw);
            return {
                file: f,
                src,
                title: fm.title || f,
                date: fm.date || '',
                category: fm.category || '',
                mtime: fs.statSync(full).mtimeMs,
                words: cjk(body),
                live: fs.existsSync(path.join(LOCAL_POSTS, f)),
                // 列表里就标出有没有写法问题，不用点进去才发现
                issues: lintBody(body, fm.title).length,
            };
        });
}

export function listAll() {
    return {
        drafts: listDir(DRAFTS_DIR, 'draft').sort((a, b) => b.mtime - a.mtime),
        posts: listDir(LOCAL_POSTS, 'post').sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    };
}

/** 发布预检 + 预览。和 publish-post.mjs 同一套函数，不会出现两个答案。 */
export function inspect(file, src) {
    const full = resolveFile(file, src);
    const raw = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
    const { fm, body } = parseFrontMatter(raw);

    const meta = { ...fm };
    meta.author = fm.author || 'Thoi';
    meta.excerpt = fm.excerpt || computeExcerpt(body, fm.title);
    meta.readTime = computeReadTime(body);
    meta.lastModified = new Date().toISOString().slice(0, 10);

    return {
        file,
        src: src === 'post' ? 'post' : 'draft',
        slug: path.basename(file).replace(/\.md$/, ''),
        mtime: fs.statSync(full).mtimeMs,
        live: fs.existsSync(path.join(LOCAL_POSTS, path.basename(file))),
        meta,
        raw: fm,                      // 编辑表单回填「作者原本写了什么」，不能拿自动值
        excerptAuto: !fm.excerpt,
        problems: validate(path.basename(file), fm),
        duplicateH1: duplicateH1(body, fm.title),
        lint: lintBody(body, fm.title).filter((i) => i.kind !== 'dup-h1'),
        images: collectImageUrls(body, fm.coverImage),
        html: renderMarkdown(body, { imageBaseDir: '/api/posts/' }),
    };
}

/**
 * 回写 frontmatter。
 * ⚠ 只写「人写的」字段 —— readTime/lastModified 一律不落盘，excerpt 除非明确填了也不落盘。
 *   一旦写进文件它们就变成手写值，改了正文也不会再重算。
 */
export function writeMeta(file, fields, src) {
    const full = resolveFile(file, src);
    const raw = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
    const { fm, body } = parseFrontMatter(raw);

    const next = { ...fm };
    for (const k of ['title', 'date', 'category', 'author', 'coverImage', 'excerpt']) {
        if (fields[k] !== undefined) next[k] = fields[k];
    }
    if (fields.tags !== undefined) {
        next.tags = Array.isArray(fields.tags)
            ? fields.tags
            : String(fields.tags).split(',').map((t) => t.trim()).filter(Boolean);
    }
    delete next.readTime;
    delete next.lastModified;
    if (!next.excerpt) delete next.excerpt;

    fs.writeFileSync(full, buildFrontMatter(next) + '\n' + body.replace(/^\n+/, ''), 'utf8');
}
