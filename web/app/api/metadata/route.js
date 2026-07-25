import * as cheerio from 'cheerio';
import { assertPublicUrl } from '@/lib/ssrf';
import { proxyFetch } from '@/lib/proxyFetch';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/metadata?url= → { title, description }(抓网页元信息,鉴权 + SSRF + CF回退) */
export async function GET(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const url = new URL(request.url).searchParams.get('url');
    try {
        await assertPublicUrl(url);
    } catch (e) {
        return Response.json({ error: e.message }, { status: 400 });
    }
    try {
        const res = await proxyFetch(url, {
            directTimeout: 12000, proxyTimeout: 18000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        const html = await res.text();
        const $ = cheerio.load(html);
        const title = ($('title').first().text().trim()
            || $('meta[property="og:title"]').attr('content') || '').trim();
        const description = ($('meta[name="description"]').attr('content')
            || $('meta[property="og:description"]').attr('content') || '').trim();
        return Response.json({ title, description });
    } catch (e) {
        return Response.json({ error: '抓取失败', details: e.message }, { status: 502 });
    }
}
