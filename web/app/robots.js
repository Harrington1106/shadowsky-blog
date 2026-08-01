import { SITE_URL } from '@/lib/site';

// 注意:线上 /robots.txt 目前由 Cloudflare 的 Managed robots.txt 在边缘提供
// (含各家 AI 爬虫的 Content-Signal 段)。源站这份的作用是补上 Sitemap 指向,
// 并挡掉 /admin 与 /api —— 若边缘那份完全覆盖了源站,直接在 Search Console
// 提交 /sitemap.xml 即可,不影响收录。
export default function robots() {
    return {
        rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
