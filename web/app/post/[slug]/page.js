import { notFound } from 'next/navigation';
import { loadPost } from '@/lib/article';
import PostContent from '../PostContent';

/**
 * 文章阅读页 /post/<slug>（slug = 文件名去掉 .md）。
 *
 * 旧地址 /post?file=<file>.md 由 app/post/page.js 永久跳转到这里。
 * 正文在服务端渲染好（lib/article.js → lib/renderMarkdown.js），
 * 客户端组件只接管交互。
 */
export async function generateMetadata({ params }) {
    const { slug } = await params;
    const a = loadPost(slug);
    if (!a) return { title: '文章不存在' };

    const description = a.description || undefined;
    return {
        title: a.title,
        description,
        authors: a.author ? [{ name: a.author }] : undefined,
        keywords: a.tags?.length ? a.tags : undefined,
        alternates: { canonical: a.canonical },
        openGraph: {
            type: 'article',
            title: a.title,
            description,
            publishedTime: a.publishedTime,
            modifiedTime: a.modifiedTime,
            authors: a.author ? [a.author] : undefined,
            tags: a.tags,
            url: a.canonical,
            images: a.ogImages,
        },
        twitter: { card: 'summary_large_image', title: a.title, description, images: a.ogImages },
    };
}

export default async function Page({ params, searchParams }) {
    const { slug } = await params;
    const { ref } = await searchParams;
    const article = loadPost(slug);
    // 文章不存在就真 404,而不是 200 + 页面里写「加载失败」(软 404 对收录有害)
    if (!article) notFound();

    return <PostContent article={article} backRef={ref || null} />;
}
