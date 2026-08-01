import BlogContent from './BlogContent';
import { OG_IMAGE } from '@/lib/site';
import { getPostsIndex } from '@/lib/posts';

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

export default function Page() {
    // 之前整页客户端渲染:初始 HTML 里一篇文章都没有,爬虫看到的是空壳,
    // 用户也要等 JS + /api/posts 往返才看见列表。/post 早就服务端渲染了,
    // 作为文章索引的列表页反而没有 —— 这里补上,客户端只接管筛选/搜索/翻页。
    return <BlogContent initialPosts={getPostsIndex()} />;
}
