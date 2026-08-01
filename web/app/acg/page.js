import AcgContent from './AcgContent';

export const metadata = {
    title: '二次元空间',
    description: '追番、漫画与我的剪辑作品。',
    alternates: { canonical: '/acg' },
    openGraph: {
        title: '二次元空间',
        description: '追番、漫画与我的剪辑作品。',
        url: '/acg',
    },
};

export default function Page() {
    return <AcgContent />;
}
