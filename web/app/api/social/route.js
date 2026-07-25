import { getDb } from '@/lib/db';
import { socialLinks } from '@/lib/schema';

export const dynamic = 'force-dynamic';

/** GET /api/social → 社交链接数组 [{ name, url, icon }] */
export async function GET() {
    const db = getDb();
    const rows = db.select().from(socialLinks).orderBy(socialLinks.sort).all();
    return Response.json(rows.map((s) => ({ name: s.name, url: s.url, icon: s.icon })));
}
