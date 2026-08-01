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
        // 目前只有方形站标可用,所以卡片类型用 summary(小图)而非 summary_large_image,
        // 免得平台把 256×256 拉伸成横幅。将来做了 1200×630 的 OG 图再一起换。
        images: [{ url: withBase('/img/favicon256.png'), width: 256, height: 256, alt: SITE_NAME }],
    },
    twitter: {
        card: 'summary',
        title: `星空笔记 — ${SITE_NAME}`,
        description: SITE_DESC,
        images: [withBase('/img/favicon256.png')],
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
                <link rel="preconnect" href="https://fonts.loli.net" />
                <link rel="preconnect" href="https://gstatic.loli.net" crossOrigin="anonymous" />
                <link
                    href="https://fonts.loli.net/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap"
                    rel="stylesheet"
                />
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
