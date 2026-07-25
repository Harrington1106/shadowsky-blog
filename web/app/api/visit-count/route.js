import { getDb } from '@/lib/db';
import { pageVisits, siteStats } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** GET /api/visit-count?page=xxx → { count, total } */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = (searchParams.get('page') || 'home').replace('.html', '');
    const db = getDb();

    const row = db.select().from(pageVisits).where(eq(pageVisits.page, page)).all()[0];
    const totalRow = db.select().from(siteStats).where(eq(siteStats.key, 'total_visits')).all()[0];

    return Response.json({
        count: row?.count ?? 0,
        total: totalRow?.value ?? 0,
    });
}
