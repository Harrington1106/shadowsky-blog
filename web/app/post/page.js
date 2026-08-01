import fs from 'node:fs';
import path from 'node:path';
import { getPostsIndex } from '@/lib/posts';
import { aiDailyDir } from '@/lib/content';
import PostContent from './PostContent';

/**
 * 文章 / AI 日报阅读页。
 *
 * 正文仍由客户端渲染(marked + 按需加载的 highlight.js/katex,见 PostContent),
 * 这里只负责在服务端把标题、摘要、封面写进 <head> —— 之前整页是 client component,
 * 分享到任何平台拿到的都是站点默认标题。
 *
 * ⚠ 用了 searchParams,这条路由因此是动态渲染(不再预渲染成静态 HTML)。
 *   next.config.js 的 s-maxage=60 仍然生效,CDN 按完整 URL(含 ?file=)缓存。
 */

/**
 * 去掉 AI 日报标题里的装饰前缀,与 BlogContent/PostContent 的处理保持一致。
 * 差别在于这里会把 "AI" 补回去:页面上有栏目上下文,标签页和分享卡片没有,
 * 只写"日报 — 2026-06-11"看不出是什么。
 */
function cleanAiTitle(raw, date) {
    const t = (raw || '')
        .replace(/^[^\w一-鿿]+/, '')
        .replace(/^(AI|📰)\s*[-—]?\s*/i, '')
        .trim();
    if (!t) return `AI 日报 · ${date}`;
    return /^AI/i.test(t) ? t : `AI ${t}`;
}

export async function generateMetadata({ searchParams }) {
    const { file, ai } = await searchParams;

    if (ai) {
        try {
            const idx = JSON.parse(fs.readFileSync(path.join(aiDailyDir(), 'index.json'), 'utf8'));
            const entry = idx.find((e) => e.date === ai);
            if (entry) {
                const title = cleanAiTitle(entry.title, ai);
                const description = (entry.summary || '').replace(/\*\*/g, '').replace(/[🥇🥈🥉]/g, '').trim();
                return {
                    title,
                    description,
                    alternates: { canonical: `/post?ai=${encodeURIComponent(ai)}` },
                    openGraph: { type: 'article', title, description, publishedTime: ai, url: `/post?ai=${encodeURIComponent(ai)}` },
                };
            }
        } catch {
            // 索引缺失/损坏时退回下面的默认标题,不要让阅读页因为 <head> 挂掉
        }
        return { title: `AI 日报 · ${ai}`, alternates: { canonical: `/post?ai=${encodeURIComponent(ai)}` } };
    }

    if (file) {
        const post = getPostsIndex().find((p) => p.file === file);
        if (post) {
            const url = `/post?file=${encodeURIComponent(file)}`;
            const images = post.coverImage ? [post.coverImage] : undefined;
            return {
                title: post.title,
                description: post.excerpt || undefined,
                authors: post.author ? [{ name: post.author }] : undefined,
                keywords: post.tags?.length ? post.tags : undefined,
                alternates: { canonical: url },
                openGraph: {
                    type: 'article',
                    title: post.title,
                    description: post.excerpt || undefined,
                    publishedTime: post.date || undefined,
                    modifiedTime: post.lastModified || undefined,
                    authors: post.author ? [post.author] : undefined,
                    tags: post.tags,
                    url,
                    images,
                },
                // 有封面图才值得用大图卡片,否则维持 layout 里的 summary
                twitter: images ? { card: 'summary_large_image', title: post.title, description: post.excerpt || undefined, images } : undefined,
            };
        }
    }

    return { title: '文章' };
}

export default function Page() {
    return <PostContent />;
}
