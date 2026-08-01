import { getPostsIndex } from '@/lib/posts';
import { loadPost } from '@/lib/article';
import { postHref, postSlug } from '@/lib/links';
import { mirrorCover } from '@/lib/coverMirror';
import { SITE_URL, SITE_NAME, SITE_DESC } from '@/lib/site';

/**
 * Atom 订阅源 /feed.xml
 *
 * 这站有个读别人订阅源的 /rss 页面，自己却一直没有 feed（/feed.xml /rss.xml /atom.xml
 * 全是 404），别人想追更只能手动来看。2026-08-01 补上。
 *
 * 正文直接带全文（<content type="html">）——阅读器里能直接读完，不用回站点。
 * 正文渲染走 lib/article 的 mtime 缓存，多篇文章一起渲染也不会真的重算。
 * AI 日报每天一篇，塞进来会把手写文章淹掉，所以不收；要单独订阅再另开一个源。
 */
export const dynamic = 'force-dynamic';

// 全文条数：太多会让 feed 变得很大（阅读器每小时都在拉）
const FULL_CONTENT_LIMIT = 15;

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** 'YYYY-MM-DD' → RFC 3339；解析不了就退回当下 */
function rfc3339(s) {
    const d = new Date(s);
    return (isNaN(d.getTime()) ? new Date() : d).toISOString();
}

export async function GET() {
    const posts = getPostsIndex();
    const updated = rfc3339(posts[0]?.lastModified || posts[0]?.date);

    const entries = posts.slice(0, FULL_CONTENT_LIMIT).map((p) => {
        const url = `${SITE_URL}${postHref(p.file)}`;
        const article = loadPost(postSlug(p.file));
        const cover = p.coverImage ? mirrorCover(p.coverImage) : null;
        // 分类常常也在 tags 里(比如「前端」),去重免得 <category> 重复
        const terms = [...new Set([p.category, ...(p.tags || [])].filter(Boolean))];

        return `  <entry>
    <title>${esc(p.title)}</title>
    <link rel="alternate" type="text/html" href="${esc(url)}"/>
    <id>${esc(url)}</id>
    <published>${rfc3339(p.date)}</published>
    <updated>${rfc3339(p.lastModified || p.date)}</updated>
    <author><name>${esc(p.author || 'Thoi')}</name></author>
${terms.map((t) => `    <category term="${esc(t)}"/>`).join('\n')}${terms.length ? '\n' : ''}${p.excerpt ? `    <summary type="text">${esc(p.excerpt)}</summary>\n` : ''}${cover ? `    <link rel="enclosure" type="image/webp" href="${esc(SITE_URL + cover)}"/>\n` : ''}${article ? `    <content type="html">${esc(article.html)}</content>\n` : ''}  </entry>`;
    });

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>星空笔记 — ${esc(SITE_NAME)}</title>
  <subtitle>${esc(SITE_DESC)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${SITE_URL}/feed.xml"/>
  <link rel="alternate" type="text/html" href="${SITE_URL}/blog"/>
  <id>${SITE_URL}/</id>
  <updated>${updated}</updated>
  <author><name>Thoi</name></author>
  <icon>${SITE_URL}/img/favicon256.png</icon>
  <logo>${SITE_URL}/img/og-default.png</logo>
${entries.join('\n')}
</feed>
`;

    return new Response(xml, {
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
    });
}
