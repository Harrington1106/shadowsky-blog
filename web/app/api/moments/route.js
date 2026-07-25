import { getDb } from '@/lib/db';
import { moments } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/moments → 随手拍数组(倒序) */
export async function GET() {
    const rows = getDb().select().from(moments).all();
    const list = rows.map((m) => ({
        id: m.id, date: m.date, content: m.content, image: m.image, location: m.location,
        tags: JSON.parse(m.tags || '[]'),
        fromAdmin: m.source === 'admin', fromGithub: m.source === 'github',
    }));
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return Response.json(list);
}

/** POST /api/moments → 新建(鉴权) */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const m = await request.json().catch(() => null);
    if (!m || (!m.content && !m.image)) return Response.json({ error: '内容或图片至少填一个' }, { status: 400 });
    const id = String(m.id || `snap-${Date.now()}`);
    getDb().insert(moments).values({
        id, date: m.date || new Date().toISOString(),
        content: m.content ?? null, image: m.image ?? null, location: m.location ?? null,
        tags: JSON.stringify(m.tags || []), source: 'admin',
    }).run();
    return Response.json({ ok: true, id });
}

/** PUT /api/moments → 更新(鉴权) */
export async function PUT(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const m = await request.json().catch(() => null);
    if (!m?.id) return Response.json({ error: 'id 必填' }, { status: 400 });
    getDb().update(moments).set({
        content: m.content ?? null, image: m.image ?? null, location: m.location ?? null,
        tags: JSON.stringify(m.tags || []),
    }).where(eq(moments.id, String(m.id))).run();
    return Response.json({ ok: true });
}

/** DELETE /api/moments?id=xxx(鉴权) */
export async function DELETE(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'id 必填' }, { status: 400 });
    getDb().delete(moments).where(eq(moments.id, String(id))).run();
    return Response.json({ ok: true });
}
