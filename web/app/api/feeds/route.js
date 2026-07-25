import { getDb } from '@/lib/db';
import { feeds } from '@/lib/schema';

export const dynamic = 'force-dynamic';

/** GET /api/feeds → RSS 订阅源数组 [{ title, url, category }] */
export async function GET() {
    const db = getDb();
    const rows = db.select().from(feeds).all();
    return Response.json(rows.map((f) => ({ title: f.title, url: f.url, category: f.category })));
}
