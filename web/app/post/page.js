import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { aiDailyDir, postsDir, safeName } from '@/lib/content';
import { OG_IMAGE } from '@/lib/site';
import { renderMarkdown, hasMath } from '@/lib/renderMarkdown';
import { CATEGORY_IMAGES, calculateReadingTime, parseFrontMatter, normalizeTags } from '@/lib/postContent';
import PostContent from './PostContent';

/**
 * 文章 / AI 日报阅读页(服务端)。
 *
 * 正文在这里就渲染成 HTML 交给客户端组件 —— 以前整页是 client component,
 * 爬虫拿到空壳、首屏还要等一次 /api 往返。现在服务端读盘 + marked + highlight.js,
 * 客户端只保留交互(目录高亮、代码复制、图片灯箱、阅读进度、上下篇/推荐)。
 *
 * ⚠ 用了 searchParams,这条路由是动态渲染;next.config.js 的 s-maxage=60 仍然生效,
 *   CDN 按含 ?file= 的完整 URL 缓存。
 */

const AI_HERO = 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80';
// 相对图片路径的基准目录,与旧客户端(按 /api/posts/<file> 的目录)保持一致
const POST_IMAGE_BASE = '/api/posts/';

function fmtDate(s) {
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** 去掉 AI 日报标题里的装饰前缀,与 /blog 列表的显示保持一致。 */
function cleanAiTitle(raw, date) {
    const t = String(raw || '')
        .replace(/^[^\w一-鿿]+/, '')
        .replace(/^(AI|📰)\s*[-—]?\s*/i, '')
        .trim();
    return t || `AI 日报 · ${date}`;
}

/**
 * 渲染结果缓存 —— 跨请求复用,按文件 mtime 失效。
 * marked + highlight.js 渲染一篇长文约几十毫秒,而文章几天才改一次;
 * 用 mtime 当版本号既省 CPU,又不破坏「发文/改文即时可见」(C5)——
 * 文件一变 mtime 就变,下一次请求自动重渲染。
 */
const RENDER_CACHE_MAX = 64;
const renderCache = new Map();

function cached(key, mtimeMs, build) {
    const hit = renderCache.get(key);
    if (hit && hit.mtimeMs === mtimeMs) return hit.value;
    const value = build();
    if (renderCache.size >= RENDER_CACHE_MAX) renderCache.delete(renderCache.keys().next().value);
    renderCache.set(key, { mtimeMs, value });
    return value;
}

/**
 * 读盘 + 渲染。用 React cache 包住,同一次请求里 generateMetadata 和页面各调一次,
 * 只会真正读一遍文件。找不到返回 null(调用方交给 notFound())。
 */
const loadArticle = cache(function loadArticle(file, ai) {
    if (ai) {
        const name = safeName(ai, '.md');
        if (!name) return null;
        const full = path.join(aiDailyDir(), name);
        let md, mtimeMs;
        try {
            mtimeMs = fs.statSync(full).mtimeMs;
            md = fs.readFileSync(full, 'utf8');
        } catch {
            return null;
        }
        return cached(`ai:${name}`, mtimeMs, () => buildAiDaily(md, ai));
    }

    if (!file) return null;
    const name = safeName(file, '.md');
    if (!name) return null;
    const full = path.join(postsDir(), name);
    let raw, mtimeMs;
    try {
        mtimeMs = fs.statSync(full).mtimeMs;
        raw = fs.readFileSync(full, 'utf8');
    } catch {
        return null;
    }
    return cached(`post:${name}`, mtimeMs, () => buildPost(raw, name));
});

function buildAiDaily(md, ai) {
    const title = cleanAiTitle((md.match(/^#\s+(.+)/m) || [])[1], ai);
    const kw = md.match(/关键词[：:]\s*(.+)/);
    const tags = kw ? kw[1].split(/[,，、]/).map((k) => k.trim()).filter(Boolean).slice(0, 5) : [];

    // 摘要取 index.json 里算好的那份(与 /blog 列表同源)
    let description = '';
    try {
        const idx = JSON.parse(fs.readFileSync(path.join(aiDailyDir(), 'index.json'), 'utf8'));
        description = (idx.find((e) => e.date === ai)?.summary || '').replace(/\*\*/g, '').replace(/[🥇🥈🥉]/g, '').trim();
    } catch {
        // 索引缺失不影响正文
    }

    return {
        kind: 'aidaily',
        title,
        description,
        tags,
        heroImage: AI_HERO,
        html: renderMarkdown(md),
        needsMath: hasMath(md),
        meta: { kind: 'aidaily', dateStr: fmtDate(ai) || ai },
        publishedTime: ai,
        ogImages: OG_IMAGE,
        canonical: `/post?ai=${encodeURIComponent(ai)}`,
    };
}

function buildPost(raw, name) {
    const { metadata, content } = parseFrontMatter(raw);
    const category = metadata.category || '未分类';
    const coverImage = metadata.coverImage || '';
    const modifiedStr = metadata.lastModified && metadata.lastModified !== metadata.date ? fmtDate(metadata.lastModified) : null;

    return {
        kind: 'post',
        title: metadata.title || '无标题',
        description: metadata.excerpt || '',
        author: metadata.author || '',
        tags: normalizeTags(metadata.tags),
        heroImage: coverImage || CATEGORY_IMAGES[category] || CATEGORY_IMAGES.default,
        html: renderMarkdown(content, { imageBaseDir: POST_IMAGE_BASE }),
        needsMath: hasMath(content),
        meta: {
            kind: 'post',
            dateStr: fmtDate(metadata.date) || '未知日期',
            dateYm: metadata.date && /^\d{4}-\d{2}/.test(metadata.date) ? metadata.date.substring(0, 7) : null,
            category,
            readingTime: calculateReadingTime(content),
            modifiedStr,
        },
        file: name,
        // 阅读量按去掉扩展名的文件名计数,沿用旧的 pageId 规则
        pageId: 'posts/' + name.replace(/\.md$/, ''),
        publishedTime: metadata.date || undefined,
        modifiedTime: metadata.lastModified || undefined,
        ogImages: coverImage ? [coverImage] : OG_IMAGE,
        canonical: `/post?file=${encodeURIComponent(name)}`,
    };
}

export async function generateMetadata({ searchParams }) {
    const { file, ai } = await searchParams;
    const a = loadArticle(file, ai);
    if (!a) return { title: '文章不存在' };

    // 标签页/分享卡片上没有栏目上下文,"日报 — 2026-06-11" 看不出是什么,补个 AI
    const title = a.kind === 'aidaily' && !/^AI/i.test(a.title) ? `AI ${a.title}` : a.title;
    const description = a.description || undefined;

    return {
        title,
        description,
        authors: a.author ? [{ name: a.author }] : undefined,
        keywords: a.tags?.length ? a.tags : undefined,
        alternates: { canonical: a.canonical },
        openGraph: {
            type: 'article',
            title,
            description,
            publishedTime: a.publishedTime,
            modifiedTime: a.modifiedTime,
            authors: a.author ? [a.author] : undefined,
            tags: a.tags,
            url: a.canonical,
            images: a.ogImages,
        },
        twitter: { card: 'summary_large_image', title, description, images: a.ogImages },
    };
}

export default async function Page({ searchParams }) {
    const { file, ai, ref } = await searchParams;
    const article = loadArticle(file, ai);
    // 找不到就真的 404,而不是返回 200 再在页面里显示"加载失败"(软 404 对收录有害)
    if (!article) notFound();

    return <PostContent article={article} backRef={ref || null} />;
}
