import fs from 'node:fs';
import path from 'node:path';
import { getPostsIndex } from '@/lib/posts';
import { aiDailyDir } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

// 文章与日报都是运行时从磁盘读的(后台发文、cron 生成日报都不重新构建),
// 所以 sitemap 必须每次请求现算,不能在构建时定死。
export const dynamic = 'force-dynamic';

const STATIC_ROUTES = [
    { path: '/', priority: 1.0, changeFrequency: 'daily' },
    { path: '/blog', priority: 0.9, changeFrequency: 'daily' },
    { path: '/moments', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/bookmarks', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/rss', priority: 0.5, changeFrequency: 'daily' },
    { path: '/acg', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/anime', priority: 0.5, changeFrequency: 'weekly' },
    { path: '/manga', priority: 0.5, changeFrequency: 'weekly' },
    { path: '/edits', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.4, changeFrequency: 'monthly' },
];

/** 把 'YYYY-MM-DD' 之类的字符串转成 Date,解析不出来就返回 undefined。 */
function toDate(s) {
    if (!s) return undefined;
    const d = new Date(s);
    return isNaN(d) ? undefined : d;
}

export default function sitemap() {
    const now = new Date();

    const staticEntries = STATIC_ROUTES.map((r) => ({
        url: `${SITE_URL}${r.path}`,
        lastModified: now,
        changeFrequency: r.changeFrequency,
        priority: r.priority,
    }));

    const postEntries = getPostsIndex().map((p) => ({
        url: `${SITE_URL}/post?file=${encodeURIComponent(p.file)}`,
        lastModified: toDate(p.lastModified) || toDate(p.date) || now,
        changeFrequency: 'monthly',
        priority: 0.8,
    }));

    let aiEntries = [];
    try {
        const idx = JSON.parse(fs.readFileSync(path.join(aiDailyDir(), 'index.json'), 'utf8'));
        aiEntries = idx.map((e) => ({
            url: `${SITE_URL}/post?ai=${encodeURIComponent(e.date)}`,
            lastModified: toDate(e.date) || now,
            changeFrequency: 'never',
            priority: 0.4,
        }));
    } catch {
        // 索引缺失时就只输出文章,不要让整张 sitemap 挂掉
    }

    return [...staticEntries, ...postEntries, ...aiEntries];
}
