import AboutContent from './AboutContent';
import { OG_IMAGE } from '@/lib/site';

const DESC = '关于 Thoi 与这个站点：在写什么、用什么技术、代码是怎么和 AI 一起写出来的、怎么联系。';

export const metadata = {
    title: '关于',
    description: DESC,
    alternates: { canonical: '/about' },
    openGraph: {
        title: '关于',
        description: DESC,
        url: '/about',
        images: OG_IMAGE,
    },
};

export default function Page() {
    return <AboutContent />;
}
