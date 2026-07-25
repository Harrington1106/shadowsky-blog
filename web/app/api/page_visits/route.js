import { getDb } from '@/lib/db';
import { pageVisits } from '@/lib/schema';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/page_visits → { pages: { page: count } }(鉴权) */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    const pages = {};
    for (const r of getDb().select().from(pageVisits).all()) pages[r.page] = r.count;
    return Response.json({ pages });
}
