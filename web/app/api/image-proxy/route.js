import { assertPublicUrl } from '@/lib/ssrf';
import { proxyFetch } from '@/lib/proxyFetch';

export const dynamic = 'force-dynamic';

/** GET /api/image-proxy?url= → 代理图片(SSRF 防护 + CF Worker 回退,长缓存) */
export async function GET(request) {
    const url = new URL(request.url).searchParams.get('url');
    try {
        await assertPublicUrl(url);
    } catch {
        return new Response(null, { status: 400 });
    }
    try {
        const res = await proxyFetch(url, { directTimeout: 5000, proxyTimeout: 15000 });
        if (!res.ok) return new Response(null, { status: 502 });
        const buf = await res.arrayBuffer();
        return new Response(buf, {
            headers: {
                'Content-Type': res.headers.get('content-type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch {
        return new Response(null, { status: 502 });
    }
}
