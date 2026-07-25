import { getDb } from '@/lib/db';
import { videos } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/videos → { videos, favorites } */
export async function GET() {
    const rows = getDb().select().from(videos).all();
    const map = (v) => ({
        id: v.id, title: v.title, thumbnail: v.thumbnail, duration: v.duration,
        views: v.views, category: v.category, type: v.type, bvid: v.bvid,
    });
    return Response.json({
        videos: rows.filter((v) => v.kind === 'video').map(map),
        favorites: rows.filter((v) => v.kind === 'favorite').map(map),
    });
}

/** POST /api/videos → 新增(鉴权)。kind: video|favorite */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const v = await request.json().catch(() => null);
    if (!v?.title) return Response.json({ error: 'title 必填' }, { status: 400 });
    const r = getDb().insert(videos).values({
        title: v.title, thumbnail: v.thumbnail ?? null, duration: v.duration ?? null,
        views: Number(v.views) || 0, category: v.category ?? null, type: v.type ?? null,
        bvid: v.bvid ?? null, kind: v.kind === 'favorite' ? 'favorite' : 'video',
    }).run();
    return Response.json({ ok: true, id: Number(r.lastInsertRowid) });
}

/** PUT /api/videos → 更新(鉴权) */
export async function PUT(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const v = await request.json().catch(() => null);
    if (!v?.id) return Response.json({ error: 'id 必填' }, { status: 400 });
    getDb().update(videos).set({
        title: v.title, thumbnail: v.thumbnail ?? null, duration: v.duration ?? null,
        views: Number(v.views) || 0, category: v.category ?? null, type: v.type ?? null, bvid: v.bvid ?? null,
    }).where(eq(videos.id, Number(v.id))).run();
    return Response.json({ ok: true });
}

/** DELETE /api/videos?id=xxx(鉴权) */
export async function DELETE(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'id 必填' }, { status: 400 });
    getDb().delete(videos).where(eq(videos.id, Number(id))).run();
    return Response.json({ ok: true });
}
