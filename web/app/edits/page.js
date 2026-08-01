import EditsContent from './EditsContent';

export const metadata = {
    title: '我的剪辑',
    description: '自己做的视频剪辑作品合集。',
    alternates: { canonical: '/edits' },
    openGraph: {
        title: '我的剪辑',
        description: '自己做的视频剪辑作品合集。',
        url: '/edits',
    },
};

export default function Page() {
    return <EditsContent />;
}
