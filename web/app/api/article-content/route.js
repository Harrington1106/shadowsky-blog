import * as cheerio from 'cheerio';
import { assertPublicUrl } from '@/lib/ssrf';
import { proxyFetch } from '@/lib/proxyFetch';

export const dynamic = 'force-dynamic';

const CONTENT_SELECTORS = [
    'article', '[role="main"]', 'main',
    '.post-content', '.article-content', '.post-body', '.article-body',
    '.entry-content', '.content', '#content', '#article',
    '.markdown-body', '.prose', '.post', '.article',
];

/** GET /api/article-content?url= → cheerio 抽正文,返回 { success, content, title } */
export async function GET(request) {
    const url = new URL(request.url).searchParams.get('url');
    try {
        await assertPublicUrl(url);
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 400 });
    }

    let html = '';
    try {
        const res = await proxyFetch(url, {
            directTimeout: 15000, proxyTimeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShadowQuake RSS Reader/1.0)' },
        });
        html = await res.text();
    } catch {
        return Response.json({ success: false, error: '直连和代理均无法获取原文' }, { status: 502 });
    }

    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, iframe, .sidebar, .comment, .comments, .ad, .advertisement, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();

    let content = null;
    for (const sel of CONTENT_SELECTORS) {
        const el = $(sel);
        if (el.length && el.text().trim().length > 200) { content = el.html(); break; }
    }
    if (!content) {
        let best = null, bestLen = 0;
        $('div, section').each((_, el) => {
            const text = $(el).text().trim();
            if (text.length > bestLen && text.length > 300) { best = el; bestLen = text.length; }
        });
        if (best) content = $(best).html();
    }
    if (!content) content = $('body').html() || '';

    return Response.json({
        success: true,
        content: (content || '').replace(/\s+(href|src)=/g, ' $1='),
        title: $('title').text().trim() || '',
    });
}
