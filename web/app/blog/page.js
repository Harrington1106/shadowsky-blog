import BlogContent from './BlogContent';
import { OG_IMAGE } from '@/lib/site';

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

export default function Page() {
    return <BlogContent />;
}
