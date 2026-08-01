import MangaContent from './MangaContent';
import { OG_IMAGE } from '@/lib/site';

export const metadata = {
    title: '我的漫画',
    description: '从 Bangumi 同步的漫画阅读记录。',
    alternates: { canonical: '/manga' },
    openGraph: {
        title: '我的漫画',
        description: '从 Bangumi 同步的漫画阅读记录。',
        url: '/manga',
        images: OG_IMAGE,
    },
};

export default function Page() {
    return <MangaContent />;
}
