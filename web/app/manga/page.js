import MangaContent from './MangaContent';

export const metadata = {
    title: '我的漫画',
    description: '从 Bangumi 同步的漫画阅读记录。',
    alternates: { canonical: '/manga' },
    openGraph: {
        title: '我的漫画',
        description: '从 Bangumi 同步的漫画阅读记录。',
        url: '/manga',
    },
};

export default function Page() {
    return <MangaContent />;
}
