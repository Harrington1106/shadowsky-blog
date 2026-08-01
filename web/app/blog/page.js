import BlogContent from './BlogContent';

export const metadata = {
    title: '星空笔记',
    description: '记录技术、天文与生活的文章列表，另含每日自动生成的 AI 精选日报归档。',
    alternates: { canonical: '/blog' },
    openGraph: {
        title: '星空笔记',
        description: '记录技术、天文与生活的文章列表，另含每日自动生成的 AI 精选日报归档。',
        url: '/blog',
    },
};

export default function Page() {
    return <BlogContent />;
}
