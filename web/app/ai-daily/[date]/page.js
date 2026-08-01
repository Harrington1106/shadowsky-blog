import { notFound } from 'next/navigation';
import { loadAiDaily } from '@/lib/article';
import PostContent from '../../post/PostContent';

/**
 * AI 日报阅读页 /ai-daily/<YYYY-MM-DD>。
 *
 * 这个路径正好接回 v1 时代的静态归档页地址：nginx 把 /ai-daily/<date>.html
 * 永久跳到这里（少了 .html），旧外链一路可达。
 * 旧的 /post?ai=<date> 同样由 app/post/page.js 跳过来。
 */
export async function generateMetadata({ params }) {
    const { date } = await params;
    const a = loadAiDaily(date);
    if (!a) return { title: '日报不存在' };

    // 标签页与分享卡片没有栏目上下文，"日报 — 2026-06-11" 看不出是什么，补个 AI
    const title = /^AI/i.test(a.title) ? a.title : `AI ${a.title}`;
    const description = a.description || undefined;

    return {
        title,
        description,
        alternates: { canonical: a.canonical },
        openGraph: {
            type: 'article',
            title,
            description,
            publishedTime: a.publishedTime,
            url: a.canonical,
            images: a.ogImages,
        },
        twitter: { card: 'summary_large_image', title, description, images: a.ogImages },
    };
}

export default async function Page({ params }) {
    const { date } = await params;
    const article = loadAiDaily(date);
    if (!article) notFound();

    return <PostContent article={article} backRef="#aidaily" />;
}
