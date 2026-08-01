import { notFound } from 'next/navigation';
import { loadPost } from '@/lib/article';
import PostContent from '../PostContent';
import { SITE_URL, SITE_NAME } from '@/lib/site';

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

/**
 * 结构化数据（schema.org BlogPosting）。
 * 搜索引擎靠它拿到发布时间、作者、封面 —— <meta> 里的 og:* 是给社交平台的，
 * 搜索侧认的是 JSON-LD，两者不能互相替代。
 */
function articleJsonLd(article) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.description || undefined,
        datePublished: article.publishedTime || undefined,
        dateModified: article.modifiedTime || article.publishedTime || undefined,
        author: { '@type': 'Person', name: article.author || 'Thoi' },
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/img/og-default.png` },
        },
        image: article.ogImages?.map((i) => (typeof i === 'string' ? i : i.url)).map((u) => (u.startsWith('http') ? u : SITE_URL + u)),
        keywords: article.tags?.length ? article.tags.join(', ') : undefined,
        articleSection: article.meta?.category || undefined,
        inLanguage: 'zh-CN',
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${article.canonical}` },
    };
}

export default async function Page({ params, searchParams }) {
    const { slug } = await params;
    const { ref } = await searchParams;
    const article = loadPost(slug);
    // 文章不存在就真 404,而不是 200 + 页面里写「加载失败」(软 404 对收录有害)
    if (!article) notFound();

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(article)) }}
            />
            <PostContent article={article} backRef={ref || null} />
        </>
    );
}
