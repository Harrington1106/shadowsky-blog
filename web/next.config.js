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
    // 纯静态导出：不在服务器常驻 Next 进程，产物由现有 nginx 直接托管，
    // 博客数据仍走客户端 fetch（见 lib/api.js），发布新文章无需重新构建。
    output: 'export',
    images: { unoptimized: true },
    basePath: BASE_PATH,
    // 仓库根目录另有一份独立于本项目的旧版静态站点 package.json/lock，
    // 与 web/ 无关；显式指定 tracing root 避免 Next 误判工作区目录。
    outputFileTracingRoot: path.join(__dirname),
    // rewrites 只在 `next dev` 时生效，export 构建会忽略；
    // 生产环境下 /api、/public 与页面同源部署，直接走相对路径即可。
    async rewrites() {
        if (!isDev) return [];
        return [
            { source: '/api/:path*', destination: `${API_PROXY_TARGET}/api/:path*` },
            { source: '/public/:path*', destination: `${API_PROXY_TARGET}/public/:path*` },
        ];
    },
};

module.exports = nextConfig;
