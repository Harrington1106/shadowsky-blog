import { getDb, getSqlite } from '@/lib/db';
import { excludedIps } from '@/lib/schema';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/excluded-ips → 排除 IP 数组(鉴权) */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    return Response.json(getDb().select().from(excludedIps).all().map((r) => r.ip));
}

/** POST /api/excluded-ips { ips: [...] } → 整体替换(鉴权) */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const body = await request.json().catch(() => null);
    const ips = Array.isArray(body?.ips) ? body.ips : [];
    getSqlite().transaction(() => {
        getDb().delete(excludedIps).run();
        const ins = getSqlite().prepare('INSERT OR IGNORE INTO excluded_ips (ip) VALUES (?)');
        for (const ip of ips) if (ip) ins.run(String(ip));
    })();
    return Response.json({ success: true });
}
