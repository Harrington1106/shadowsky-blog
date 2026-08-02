const path = require('path');

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';
// 生产 API 源：默认代理到线上环境，方便本地开发直接读真实数据。
// 需要打本地 Node 后端联调时改成 http://127.0.0.1:3000
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || 'https://shadowquake.top';
// 预览部署走 shadowquake.top/preview/ 路径前缀，与现有静态站点同域共存；
// 正式接管时把 NEXT_PUBLIC_BASE_PATH 去掉即可切回根路径。
// 用 NEXT_PUBLIC_ 前缀是因为客户端手写的 <a href> 拼接（见 lib/utils.js withBase）
// 也需要读到同一个值，Next 会在构建时把 NEXT_PUBLIC_* 内联进客户端 bundle。
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
    // v2:standalone 全栈。Next 常驻 Node 进程,同时提供页面 + /api Route Handlers,
    // 取代旧的 Express + PHP 双后端。内容页仍可静态预渲染 + Cloudflare 缓存,
    // 文章正文保持 .md 文件、服务端按请求读取,守住"发文即时可见"(C5)。
    output: 'standalone',
    images: { unoptimized: true },
    basePath: BASE_PATH,
    // better-sqlite3 是原生模块,不能被 webpack 打包,标为服务端外部依赖。
    serverExternalPackages: ['better-sqlite3'],
    // 仓库根目录另有一份独立于本项目的旧版静态站点 package.json/lock，
    // 与 web/ 无关；显式指定 tracing root 避免 Next 误判工作区目录。
    outputFileTracingRoot: path.join(__dirname),
    // dev 阶段:尚未迁移的 /public 数据文件回退代理到线上,便于增量开发。
    // /api 已由本地 Route Handlers 接管(真实路由优先于 rewrites),故不再代理 /api。
    async rewrites() {
        if (!isDev) return [];
        return [
            { source: '/public/:path*', destination: `${API_PROXY_TARGET}/public/:path*` },
        ];
    },
    // 页面 HTML 的缓存策略。
    //
    // Next 给预渲染页的默认头是 `Cache-Control: s-maxage=31536000` —— 共享缓存可以存一年。
    // 2026-07-26 就是这条头让 nginx 的全局 proxy_cache 在部署后继续发旧 HTML(排查了很久)。
    // nginx 那层已关缓存,但 Cloudflare 侧同样的雷还在:哪天开个 "Cache Everything" 规则,
    // 用户就会拿到一年前的 HTML —— 而它引用的 /_next/static chunk 早已随部署删除,直接白屏。
    //
    // 所以显式收紧:边缘最多缓 60 秒,过期后可先用旧的再后台回源(SWR),浏览器每次都校验。
    // 只作用于页面,/api 与 /_next/static 不匹配(前者要实时,后者本就带 immutable 长缓存)。
    // 订阅源只有 /feed.xml 一个真身,另外两个常见地址跳过去
    async redirects() {
        return [
            { source: '/rss.xml', destination: '/feed.xml', permanent: true },
            { source: '/atom.xml', destination: '/feed.xml', permanent: true },
        ];
    },
    // ⚠ 同一个 URL,Next 对带 `RSC` 头的请求返回的是 flight 数据(`1:"$Sreact.fragment"…`)
    //   而不是 HTML。响应里虽然有 `Vary: rsc,…`,但 **Cloudflare 默认忽略 Vary**
    //   (官方文档:by default, Cloudflare does not consider vary values in caching decisions),
    //   于是两种响应共用同一个缓存键 —— 2026-08-01 开边缘缓存后立刻复现:
    //   8 轮测试里 6 轮普通请求拿到了 flight 数据,页面直接是乱码。
    //   仅在 CDN 规则里「排除 RSC 请求」不够:排除后走的是默认行为,照样读写同一条缓存。
    //   所以从源头把 RSC 响应标成不可缓存,边缘就只会存 HTML 那一份。
    async headers() {
        return [
            {
                source: '/:path((?!api/|_next/static/).*)',
                // missing:普通文档请求才给可缓存的头
                missing: [{ type: 'header', key: 'RSC' }],
                headers: [
                    // s-maxage 从 60 秒拉到 1 小时(2026-08-01):60 秒对本站这种流量密度
                    // 几乎等于没缓存 —— 实测多数访问仍是 MISS,要跨太平洋回源 1.2–2.5s。
                    //
                    // 敢拉长的前提是「内容一变就清边缘」已经接好(scripts/cf-purge.sh):
                    //   部署后        → 清全站(旧 HTML 引用的 chunk 已被删,不清会白屏)
                    //   后台改/删文章 → 清该文与列表页(lib/cfPurge.js)
                    //   cron 出日报   → 清 / /blog /ai-daily/<date> /sitemap.xml
                    // 另外只有 /post/* 与 /ai-daily/* 是服务端渲染正文;/blog、/moments、
                    // /bookmarks、ACG 各页都是壳 + 客户端读 /api(/api 从不缓存),
                    // 所以那些页面即使壳被缓存 1 小时,数据依然是实时的。
                    //
                    // ⚠ 末尾的 no-transform 是用来挡 Cloudflare 注入 RUM beacon 的。
                    //   免费版**默认**给你开 Real User Monitoring(Speed → Observatory,
                    //   文档原话:"Free customers have RUM enabled automatically … can switch it off"),
                    //   CF 会在 HTML 流过边缘时插一段
                    //     <script src="https://static.cloudflareinsights.com/beacon.min.js" …>
                    //   —— 我们源码里没有它,但每个访客都要多打一次美国域名,
                    //   与「前端零跨境依赖」直接冲突。而且它只对像浏览器的请求注入
                    //   (curl 默认 UA 看不到),所以扫源码、扫 SSR HTML 都发现不了,
                    //   只有在真浏览器里看 network 才会露出来。
                    //   CF 文档:响应带 no-transform 时边缘不会改写 payload,注入即失效。
                    //   代价:同时关掉 CF 的 Polish/Mirage/Rocket Loader/HTML 压缩改写 ——
                    //   这些我们本来就没用(图片是自己镜像的 webp)。gzip/br 传输压缩不受影响。
                    { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, no-transform' },
                ],
            },
            {
                source: '/:path*',
                has: [{ type: 'header', key: 'RSC' }],
                headers: [
                    { key: 'Cache-Control', value: 'private, no-store' },
                ],
            },
            {
                // 镜像封面图的文件名是内容 sha1，图变了就是新文件名 —— 可以放心长缓存
                source: '/img/covers/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
