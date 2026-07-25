import { getDb } from '@/lib/db';
import { notice } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/notice → { content, show, style, updated_at } */
export async function GET() {
    const row = getDb().select().from(notice).limit(1).all()[0];
    if (!row) return Response.json({});
    return Response.json({
        content: row.content || '', show: !!row.show,
        style: row.style || 'info', updated_at: row.updatedAt,
    });
}

/** PUT /api/notice → 更新公告(鉴权);无行则插入 */
export async function PUT(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const n = await request.json().catch(() => null);
    if (!n) return Response.json({ error: '请求格式错误' }, { status: 400 });
    const db = getDb();
    const row = db.select().from(notice).limit(1).all()[0];
    const values = {
        content: n.content ?? '', show: n.show ? 1 : 0,
        style: n.style || 'info', updatedAt: Math.floor(Date.now() / 1000),
    };
    if (row) db.update(notice).set(values).where(eq(notice.id, row.id)).run();
    else db.insert(notice).values(values).run();
    return Response.json({ ok: true });
}
