import HomeContent from '@/components/HomeContent';
import { withBase } from '@/lib/utils';
import { getPhrases } from '@/lib/hitokoto';

export const metadata = {
    // absolute:首页不套 layout 里的 "%s — 夏日科技探索" 模板,免得站名出现两次
    title: { absolute: '星空笔记 — 夏日科技探索' },
    alternates: { canonical: '/' },
};

// 打字机的句子来自一言,要按请求取(内存缓存 10 分钟 + 边缘缓存 1 小时兜着,
// 实际打到 hitokoto 的次数很少)
export const dynamic = 'force-dynamic';

export default function HomePage() {
    return (
        <>
            {/*
              头像是首屏最大的图,但 shadcn/base-ui 的 Avatar 要等图片 onload 成功才把 <img>
              渲染出来 —— 也就是说浏览器解析 HTML 时根本看不见这张图,得等 JS 跑完才开始下载。
              这里显式 preload,让下载和 JS 并行(React 19 会把 link 提到 <head>)。
            */}
            <link rel="preload" as="image" href={withBase('/img/avatar.webp')} fetchPriority="high" />
            <HomeContent phrases={getPhrases()} />
        </>
    );
}
