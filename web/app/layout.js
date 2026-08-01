import './globals.css';
import NavBar from '@/components/NavBar';
import PageTracker from '@/components/PageTracker';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { withBase } from '@/lib/utils';
import { SITE_URL, SITE_NAME, SITE_DESC } from '@/lib/site';

// metadataBase 决定 og:image / canonical 里的相对路径怎么补全成绝对地址。
// 不设的话 Next 构建时会警告并退化成 localhost,分享卡片的图就取不到。
export const metadata = {
    metadataBase: new URL(SITE_URL),
    // 子页面只写自己那一截标题,由 template 补站名;首页用 title.absolute 跳过模板。
    title: {
        default: `星空笔记 — ${SITE_NAME}`,
        template: `%s — ${SITE_NAME}`,
    },
    description: SITE_DESC,
    icons: { icon: withBase('/img/favicon256.png') },
    openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        locale: 'zh_CN',
        url: SITE_URL,
        title: `星空笔记 — ${SITE_NAME}`,
        description: SITE_DESC,
        // 1200×630 品牌图,由 scripts/gen-og-image.mjs 本地生成后提交(线上零字体依赖)
        images: [{ url: withBase('/img/og-default.png'), width: 1200, height: 630, alt: `星空笔记 — ${SITE_NAME}` }],
    },
    twitter: {
        card: 'summary_large_image',
        title: `星空笔记 — ${SITE_NAME}`,
        description: SITE_DESC,
        images: [withBase('/img/og-default.png')],
    },
};

const themeInitScript = `
(function(){
    try{
        var t=localStorage.getItem("theme");
        var d=t?(t==="dark"):window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.classList.toggle("dark",d);
    }catch(e){}
})();
`;

// 清理 v1 遗留的 Service Worker 与它的 Cache Storage。
// v1(2026-07-26 下线)注册过 /sw.js,对静态资源是 cache-first;v2 不用 PWA。
// /sw.js 已 404,浏览器最终会自行注销,但用户设备上那份缓存不会自动清 —— 这里主动清掉。
// v2 没有任何 SW,所以无条件注销是安全的;对没装过的用户是空操作。
const swCleanupScript = `
(function(){
    if(!("serviceWorker" in navigator))return;
    navigator.serviceWorker.getRegistrations().then(function(rs){
        rs.forEach(function(r){r.unregister();});
    }).catch(function(){});
    if(window.caches&&caches.keys){
        caches.keys().then(function(ks){
            ks.filter(function(k){return k.indexOf("shadowsky-blog")===0;})
              .forEach(function(k){caches.delete(k);});
        }).catch(function(){});
    }
})();
`;

export default function RootLayout({ children }) {
    return (
        <html lang="zh-CN" className="dark" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
                <script dangerouslySetInnerHTML={{ __html: swCleanupScript }} />
                <meta name="theme-color" content="#0B1120" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#F8FAFC" media="(prefers-color-scheme: light)" />
                {/*
                  订阅源自动发现。写死在 <head> 而不是走 metadata.alternates.types ——
                  metadata 是浅合并,子页面只要自己写了 alternates(我们每页都写了 canonical),
                  layout 里的 types 就整个被替换掉,结果是全站一个 feed 链接都不出现。
                  同一个坑在 openGraph.images 上也踩过。
                */}
                <link rel="alternate" type="application/atom+xml" title="星空笔记 — 夏日科技探索" href={withBase('/feed.xml')} />
                {/*
                  这里原本有一条 fonts.loli.net 的字体样式表(Inter / Noto Sans SC /
                  Space Grotesk / DM Sans),2026-08-01 删除:
                  - 它是 <head> 里的阻塞样式表,大陆实测 TTFB 4.9s,首屏要等它
                  - 而这四套字体一次都没被用到 —— Tailwind 的 .font-sans 解析成
                    `--font-sans: -apple-system, Segoe UI, Roboto…` 的系统栈,
                    产物 CSS 里搜不到任何一个字体名
                  所以删掉是纯赚:零视觉变化,省下一次跨境阻塞请求。
                  以后真要上自定义字体,用 next/font 自托管,别再引外部 CDN。
                */}
            </head>
            <body className="flex min-h-screen flex-col font-sans antialiased">
                <TooltipProvider>
                    <NavBar />
                    <PageTracker />
                    {children}
                    <Toaster />
                </TooltipProvider>
            </body>
        </html>
    );
}
