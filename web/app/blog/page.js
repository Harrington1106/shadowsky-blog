import BlogContent from './BlogContent';
import { OG_IMAGE, SITE_URL } from '@/lib/site';
import { getPostsIndex } from '@/lib/posts';
import { postHref } from '@/lib/links';

export const metadata = {
    title: '星空笔记',
    description: '记录技术、天文与生活的文章列表，另含每日自动生成的 AI 精选日报归档。',
    alternates: { canonical: '/blog' },
    openGraph: {
        title: '星空笔记',
        description: '记录技术、天文与生活的文章列表，另含每日自动生成的 AI 精选日报归档。',
        url: '/blog',
        images: OG_IMAGE,
    },
};

// 文章索引是运行时从磁盘扫出来的(发文即时可见),不能在构建时定死
export const dynamic = 'force-dynamic';

/**
 * 列表页的 JSON-LD。文章页(app/post/[slug]/page.js)早就有 Article 结构化数据了,
 * 作为它们索引的列表页反而没有 —— 这里补一个 Blog + ItemList,
 * 让搜索引擎知道这一页是什么、里面按顺序有哪些文章。
 */
function blogJsonLd(posts) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: '星空笔记',
        description: metadata.description,
        url: `${SITE_URL}/blog`,
        blogPost: posts.slice(0, 20).map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            datePublished: p.date,
            url: `${SITE_URL}${postHref(p.file)}`,
        })),
    };
}

export default async function Page({ searchParams }) {
    // 之前整页客户端渲染:初始 HTML 里一篇文章都没有,爬虫看到的是空壳,
    // 用户也要等 JS + /api/posts 往返才看见列表。/post 早就服务端渲染了,
    // 作为文章索引的列表页反而没有 —— 这里补上,客户端只接管筛选/搜索/翻页。
    const posts = getPostsIndex();

    // 筛选状态也在服务端就算好。自从筛选写回地址栏(?q=/?cat=/?tag=/?p=),
    // 这些链接是可以分享的 —— 而原来服务端一律渲染"全部文章第 1 页",
    // 客户端再用 useEffect 读 URL 重筛:收链接的人会先看到一屏无关文章再跳变,
    // 爬虫和社交预览抓到的更是错的内容。
    const sp = await searchParams;
    const one = (v) => (Array.isArray(v) ? v[0] : v) || '';
    const p = parseInt(one(sp.p) || '1', 10);
    const initialFilter = {
        search: one(sp.q),
        cat: one(sp.cat),
        tag: one(sp.tag),
        page: Number.isFinite(p) && p > 1 ? p : 1,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd(posts)) }}
            />
            <BlogContent initialPosts={posts} initialFilter={initialFilter} />
        </>
    );
}
