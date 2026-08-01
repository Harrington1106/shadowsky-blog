import AnimeContent from './AnimeContent';

export const metadata = {
    title: '我的追番',
    description: '从 Bangumi 同步的追番记录：在看、看过与想看。',
    alternates: { canonical: '/anime' },
    openGraph: {
        title: '我的追番',
        description: '从 Bangumi 同步的追番记录：在看、看过与想看。',
        url: '/anime',
    },
};

export default function Page() {
    return <AnimeContent />;
}
