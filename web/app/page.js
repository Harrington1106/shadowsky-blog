import { count, eq } from 'drizzle-orm';
import HomeContent from '@/components/HomeContent';
import { getPostsIndex } from '@/lib/posts';
import { getDb } from '@/lib/db';
import { media, bookmarks } from '@/lib/schema';

export const metadata = {
    // absolute:首页不套 layout 里的 "%s — 夏日科技探索" 模板,免得站名出现两次
    title: { absolute: '星空笔记 — 夏日科技探索' },
    alternates: { canonical: '/' },
};

// 统计与最新文章都要读盘/读库,不能在构建时定死(守「发文即时可见」)
export const dynamic = 'force-dynamic';

/** 首页的数字概览。查不到就返回 null,组件整块隐藏 —— 不让首页因为统计挂掉 */
function getStats(postCount) {
    try {
        const db = getDb();
        const one = (rows) => rows?.[0]?.n ?? 0;
        return {
            postCount,
            animeCount: one(db.select({ n: count() }).from(media).where(eq(media.type, 'anime')).all()),
            mangaCount: one(db.select({ n: count() }).from(media).where(eq(media.type, 'manga')).all()),
            bookmarkCount: one(db.select({ n: count() }).from(bookmarks).all()),
        };
    } catch {
        return null;
    }
}

export default function HomePage() {
    const posts = getPostsIndex();
    // 首页原本只有头像 + 打字机 + 标签,除导航栏外没有任何内容入口 —— 访客落地即死胡同。
    // 这里在服务端算好最新文章与数字概览传进去(顺带让爬虫直接读到最新文章)。
    const latestPosts = posts.slice(0, 4).map((p) => ({
        file: p.file, title: p.title, date: p.date, excerpt: p.excerpt,
        category: p.category, readTime: p.readTime,
    }));

    return <HomeContent latestPosts={latestPosts} stats={getStats(posts.length)} />;
}
