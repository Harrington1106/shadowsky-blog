import { getDb, getSqlite } from '@/lib/db';
import { appSettings } from '@/lib/schema';
import { requireAuth } from '@/lib/requireAuth';
import { PROTECTED_SETTING_KEYS } from '@/lib/adminPassword';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings → 全部设置对象(鉴权)。含 bangumi_username/token 等。
 * 口令 hash 这类受保护的 key 一律不吐出去 —— 没有理由让它出现在浏览器里。
 */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    const rows = getDb().select().from(appSettings).all();
    const obj = {};
    for (const r of rows) {
        if (PROTECTED_SETTING_KEYS.has(r.key)) continue;
        obj[r.key] = r.value;
    }
    return Response.json(obj);
}

/**
 * POST /api/settings → 合并写入(鉴权)
 * 这是个「任意 key 都能写」的接口,所以必须挡住口令 hash:
 * 否则拿到会话的人不用知道旧口令就能改口令。改口令走 /api/auth/password。
 */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return Response.json({ error: '请求格式错误' }, { status: 400 });
    // 先全部校验再写,避免写了一半才发现有受保护的 key
    const bad = Object.keys(body).find((k) => PROTECTED_SETTING_KEYS.has(k));
    if (bad) return Response.json({ error: `${bad} 不能通过此接口修改` }, { status: 400 });

    const up = getSqlite().prepare('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    for (const [k, v] of Object.entries(body)) up.run(k, v == null ? null : String(v));
    return Response.json({ success: true });
}
