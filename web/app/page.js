import HomeContent from '@/components/HomeContent';

export const metadata = {
    // absolute:首页不套 layout 里的 "%s — 夏日科技探索" 模板,免得站名出现两次
    title: { absolute: '星空笔记 — 夏日科技探索' },
    alternates: { canonical: '/' },
};

export default function HomePage() {
    return <HomeContent />;
}
