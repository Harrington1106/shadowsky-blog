import MomentsContent from './MomentsContent';

export const metadata = {
    title: '片刻',
    description: '随手拍下的照片与碎碎念。',
    alternates: { canonical: '/moments' },
    openGraph: {
        title: '片刻',
        description: '随手拍下的照片与碎碎念。',
        url: '/moments',
    },
};

export default function Page() {
    return <MomentsContent />;
}
