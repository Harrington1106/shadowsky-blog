import { assertPublicUrl } from '@/lib/ssrf';
import { proxyFetch } from '@/lib/proxyFetch';

export const dynamic = 'force-dynamic';

/** GET /api/rss-proxy?url= → 透传订阅源内容(SSRF 防护 + CF Worker 回退) */
export async function GET(request) {
    const url = new URL(request.url).searchParams.get('url');
    try {
        await assertPublicUrl(url);
    } catch (e) {
        return new Response(e.message, { status: 400 });
    }
    try {
        const res = await proxyFetch(url, { directTimeout: 10000 });
        const buf = await res.arrayBuffer();
        return new Response(buf, {
            status: res.ok ? 200 : 502,
            headers: {
                'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (e) {
        return new Response('抓取失败', { status: 502 });
    }
}
