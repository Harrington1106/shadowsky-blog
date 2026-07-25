import { getDb } from '@/lib/db';
import { blockedIps } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/blocked-ips → 封禁 IP 数组(鉴权) */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    return Response.json(getDb().select().from(blockedIps).all().map((r) => r.ip));
}

/** POST /api/blocked-ips { ip, action } → 加入/移除封禁(鉴权) */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const { ip, action } = (await request.json().catch(() => ({}))) || {};
    if (!ip) return Response.json({ error: 'ip required' }, { status: 400 });
    const db = getDb();
    if (action === 'remove') db.delete(blockedIps).where(eq(blockedIps.ip, String(ip))).run();
    else db.insert(blockedIps).values({ ip: String(ip) }).onConflictDoNothing().run();
    return Response.json({ success: true, blocked: db.select().from(blockedIps).all().map((r) => r.ip) });
}
