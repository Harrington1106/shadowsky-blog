import { getDb } from '@/lib/db';
import { feeds } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/feeds → [{ id, title, url, category }] */
export async function GET() {
    const rows = getDb().select().from(feeds).all();
    return Response.json(rows.map((f) => ({ id: f.id, title: f.title, url: f.url, category: f.category })));
}

/** POST /api/feeds → 新增订阅源(鉴权) */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const f = await request.json().catch(() => null);
    if (!f?.url || !f?.title) return Response.json({ error: 'title/url 必填' }, { status: 400 });
    const r = getDb().insert(feeds).values({ title: f.title, url: f.url, category: f.category ?? null }).run();
    return Response.json({ ok: true, id: Number(r.lastInsertRowid) });
}

/** DELETE /api/feeds?id=xxx(鉴权) */
export async function DELETE(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'id 必填' }, { status: 400 });
    getDb().delete(feeds).where(eq(feeds.id, Number(id))).run();
    return Response.json({ ok: true });
}
