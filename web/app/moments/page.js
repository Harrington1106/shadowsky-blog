import MomentsContent from './MomentsContent';
import { OG_IMAGE } from '@/lib/site';

export const metadata = {
    title: '片刻',
    description: '随手拍下的照片与碎碎念。',
    alternates: { canonical: '/moments' },
    openGraph: {
        title: '片刻',
        description: '随手拍下的照片与碎碎念。',
        url: '/moments',
        images: OG_IMAGE,
    },
};

export default function Page() {
    return <MomentsContent />;
}
