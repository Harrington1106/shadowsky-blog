import RssContent from './RssContent';

export const metadata = {
    title: '订阅',
    description: '我在追的 RSS 订阅源，以及它们的最新文章。',
    alternates: { canonical: '/rss' },
    openGraph: {
        title: '订阅',
        description: '我在追的 RSS 订阅源，以及它们的最新文章。',
        url: '/rss',
    },
};

export default function Page() {
    return <RssContent />;
}
