import { getDb } from '@/lib/db';
import { pageVisits, siteStats } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/stats → { total, pages }(鉴权)。访问统计概览。 */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    const db = getDb();
    const pages = {};
    for (const r of db.select().from(pageVisits).all()) pages[r.page] = r.count;
    const total = db.select().from(siteStats).where(eq(siteStats.key, 'total_visits')).all()[0]?.value ?? 0;
    const pageTotal = Object.values(pages).reduce((a, b) => a + b, 0);
    return Response.json({ total: total || pageTotal, pages });
}
