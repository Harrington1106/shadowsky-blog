import { getDb } from '@/lib/db';
import { appSettings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.BANGUMI_API_BASE || 'https://bangumi.shadowquake.top';

function bgmToken() {
    return process.env.BANGUMI_TOKEN
        || getDb().select().from(appSettings).where(eq(appSettings.key, 'bangumi_token')).all()[0]?.value
        || '';
}

/** GET /api/bgm_search?q=&type= → Bangumi 条目搜索(鉴权,经 CF Worker) */
export async function GET(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const sp = new URL(request.url).searchParams;
    const q = sp.get('q');
    if (!q) return Response.json({ error: 'Missing q' }, { status: 400 });
    const t = String(sp.get('type') || '');
    const subjectType = (t === '1' || t.toLowerCase() === 'manga') ? 1 : 2;

    const headers = { 'User-Agent': 'ShadowQuake/Admin', Accept: 'application/json' };
    const token = bgmToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const url = `${API_BASE}/v0/search/subjects?keyword=${encodeURIComponent(q)}&type=${subjectType}&limit=12`;
    try {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
        const data = await res.json().catch(() => ({}));
        return Response.json(data, { status: res.status });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 502 });
    }
}
