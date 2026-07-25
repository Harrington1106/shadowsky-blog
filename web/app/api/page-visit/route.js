import { getDb, getSqlite } from '@/lib/db';
import { excludedIps } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function clientIp(request) {
    const h = request.headers;
    return h.get('cf-connecting-ip') || (h.get('x-forwarded-for') || '').split(',')[0].trim() || '';
}

/** POST /api/page-visit { url } → 记一次页面访问(公开,排除 IP 跳过)。tracker 调用。 */
export async function POST(request) {
    const body = await request.json().catch(() => null);
    if (!body?.url) return Response.json({ error: 'missing url' }, { status: 400 });

    const ip = clientIp(request);
    if (ip === '127.0.0.1' || ip === '::1') return Response.json({ success: true, skipped: true });
    const db = getDb();
    if (ip && db.select().from(excludedIps).where(eq(excludedIps.ip, ip)).all().length) {
        return Response.json({ success: true, skipped: true });
    }

    let page = 'home';
    try {
        const file = new URL(body.url).pathname.split('/').pop() || 'index.html';
        page = file.replace('.html', '');
        if (!page || page === '/' || page === 'index') page = 'home';
    } catch { /* keep home */ }

    const sqlite = getSqlite();
    sqlite.prepare('INSERT INTO page_visits (page,count) VALUES (?,1) ON CONFLICT(page) DO UPDATE SET count=count+1').run(page);
    sqlite.prepare("INSERT INTO site_stats (key,value) VALUES ('total_visits',1) ON CONFLICT(key) DO UPDATE SET value=value+1").run();
    return Response.json({ success: true });
}
