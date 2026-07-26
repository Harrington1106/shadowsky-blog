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
    async headers() {
        return [
            {
                source: '/:path((?!api/|_next/static/).*)',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
