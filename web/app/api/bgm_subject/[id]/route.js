import { getDb } from '@/lib/db';
import { appSettings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.BANGUMI_API_BASE || 'https://bangumi.shadowquake.top';

/** GET /api/bgm_subject/[id] → Bangumi 条目详情(鉴权,经 CF Worker) */
export async function GET(request, { params }) {
    const guard = await requireAuth();
    if (guard) return guard;
    const { id } = await params;
    if (!/^\d+$/.test(id)) return Response.json({ error: 'Invalid subject id' }, { status: 400 });

    const token = process.env.BANGUMI_TOKEN
        || getDb().select().from(appSettings).where(eq(appSettings.key, 'bangumi_token')).all()[0]?.value
        || '';
    const headers = { 'User-Agent': 'ShadowQuake/Admin', Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
        const res = await fetch(`${API_BASE}/v0/subjects/${id}`, { headers, signal: AbortSignal.timeout(12000) });
        const data = await res.json().catch(() => ({}));
        return Response.json(data, { status: res.status });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 502 });
    }
}
