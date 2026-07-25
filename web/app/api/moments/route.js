import { getDb } from '@/lib/db';
import { moments } from '@/lib/schema';

export const dynamic = 'force-dynamic';

/** GET /api/moments → 随手拍数组(按日期倒序)。source 反解为 fromAdmin/fromGithub 兼容旧前端。 */
export async function GET() {
    const db = getDb();
    const rows = db.select().from(moments).all();
    const list = rows.map((m) => ({
        id: m.id, date: m.date, content: m.content,
        image: m.image, location: m.location,
        tags: JSON.parse(m.tags || '[]'),
        fromAdmin: m.source === 'admin',
        fromGithub: m.source === 'github',
    }));
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return Response.json(list);
}
