import { getDb } from '@/lib/db';
import { media } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

function toTotal(v) {
    if (v === null || v === undefined || v === '?' || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** GET /api/media → { anime, manga };total NULL→"?" */
export async function GET() {
    const rows = getDb().select().from(media).all();
    const map = (r) => ({
        id: r.id, title: r.title, cover: r.cover, progress: r.progress ?? 0,
        total: r.total === null ? '?' : r.total, status: r.status, tag: r.tag,
    });
    return Response.json({
        anime: rows.filter((r) => r.type === 'anime').map(map),
        manga: rows.filter((r) => r.type === 'manga').map(map),
    });
}

/** POST /api/media → 新增追番/追漫(鉴权)。id 为 bgm subject id。 */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const m = await request.json().catch(() => null);
    if (!m?.id || !m?.type || !m?.title) return Response.json({ error: 'id/type/title 必填' }, { status: 400 });
    getDb().insert(media).values({
        id: String(m.id), type: m.type, title: m.title, cover: m.cover ?? null,
        progress: toTotal(m.progress) ?? 0, total: toTotal(m.total),
        status: m.status ?? null, tag: m.tag ?? null,
    }).onConflictDoUpdate({
        target: media.id,
        set: { type: m.type, title: m.title, cover: m.cover ?? null, status: m.status ?? null },
    }).run();
    return Response.json({ ok: true, id: String(m.id) });
}

/** PUT /api/media → 更新进度/状态(鉴权) */
export async function PUT(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const m = await request.json().catch(() => null);
    if (!m?.id) return Response.json({ error: 'id 必填' }, { status: 400 });
    getDb().update(media).set({
        progress: toTotal(m.progress) ?? 0, total: toTotal(m.total),
        status: m.status ?? null, tag: m.tag ?? null, cover: m.cover ?? null, title: m.title,
    }).where(eq(media.id, String(m.id))).run();
    return Response.json({ ok: true });
}

/** DELETE /api/media?id=xxx(鉴权) */
export async function DELETE(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'id 必填' }, { status: 400 });
    getDb().delete(media).where(eq(media.id, String(id))).run();
    return Response.json({ ok: true });
}
