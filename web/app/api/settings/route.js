import { getDb, getSqlite } from '@/lib/db';
import { appSettings } from '@/lib/schema';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/settings → 全部设置对象(鉴权)。含 bangumi_username/token 等。 */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    const rows = getDb().select().from(appSettings).all();
    const obj = {};
    for (const r of rows) obj[r.key] = r.value;
    return Response.json(obj);
}

/** POST /api/settings → 合并写入(鉴权) */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return Response.json({ error: '请求格式错误' }, { status: 400 });
    const up = getSqlite().prepare('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    for (const [k, v] of Object.entries(body)) up.run(k, v == null ? null : String(v));
    return Response.json({ success: true });
}
