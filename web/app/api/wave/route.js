import { getDb, getSqlite } from '@/lib/db';
import { greetings } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

function clientIp(request) {
    const h = request.headers;
    return h.get('cf-connecting-ip') || (h.get('x-forwarded-for') || '').split(',')[0].trim() || '';
}

/** POST /api/wave → 记录一次打招呼(公开),最多留最近 50 条 */
export async function POST(request) {
    const db = getDb();
    db.insert(greetings).values({
        time: new Date().toISOString(),
        ip: clientIp(request),
        ua: (request.headers.get('user-agent') || '').substring(0, 200),
    }).run();
    // 裁剪到最近 50 条
    getSqlite().prepare(
        `DELETE FROM greetings WHERE id NOT IN (SELECT id FROM greetings ORDER BY id DESC LIMIT 50)`
    ).run();
    const count = db.select().from(greetings).all().length;
    return Response.json({ success: true, count });
}

/** GET /api/wave → 打招呼列表(鉴权,新→旧) */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    const rows = getDb().select().from(greetings).orderBy(desc(greetings.id)).all();
    return Response.json(rows);
}
