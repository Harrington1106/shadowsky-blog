import AboutContent from './AboutContent';

export const metadata = {
    title: '关于',
    description: '关于 Thoi 与这个站点：在写什么、用什么技术、怎么联系。',
    alternates: { canonical: '/about' },
    openGraph: {
        title: '关于',
        description: '关于 Thoi 与这个站点：在写什么、用什么技术、怎么联系。',
        url: '/about',
    },
};

export default function Page() {
    return <AboutContent />;
}
