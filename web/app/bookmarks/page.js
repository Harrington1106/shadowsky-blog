import BookmarksContent from './BookmarksContent';
import { OG_IMAGE } from '@/lib/site';

export const metadata = {
    title: '收藏',
    description: '值得反复回看的站点、工具与文章。',
    alternates: { canonical: '/bookmarks' },
    openGraph: {
        title: '收藏',
        description: '值得反复回看的站点、工具与文章。',
        url: '/bookmarks',
        images: OG_IMAGE,
    },
};

export default function Page() {
    return <BookmarksContent />;
}
