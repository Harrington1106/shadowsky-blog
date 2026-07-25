import { getDb } from '@/lib/db';
import { bookmarks, bookmarkCategories } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/bookmarks → { categories, bookmarks } */
export async function GET() {
    const db = getDb();
    const rows = db.select().from(bookmarks).all();
    const cats = db.select().from(bookmarkCategories).all();
    const categories = {};
    for (const c of cats) {
        categories[c.slug] = { name: c.name, subcategories: JSON.parse(c.subcategories || '{}') };
    }
    const list = rows.map((b) => ({
        id: b.id, url: b.url, title: b.title,
        category: b.category, subcategory: b.subcategory,
        tags: JSON.parse(b.tags || '[]'),
        description: b.description, addedAt: b.addedAt,
    }));
    return Response.json({ categories, bookmarks: list });
}

/** POST /api/bookmarks → 新建(鉴权) */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const b = await request.json().catch(() => null);
    if (!b?.url || !b?.title) return Response.json({ error: 'url/title 必填' }, { status: 400 });
    const id = String(b.id || Date.now());
    getDb().insert(bookmarks).values({
        id, url: b.url, title: b.title,
        category: b.category ?? null, subcategory: b.subcategory ?? null,
        tags: JSON.stringify(b.tags || []), description: b.description ?? null,
        addedAt: b.addedAt || new Date().toISOString(),
    }).run();
    return Response.json({ ok: true, id });
}

/** PUT /api/bookmarks → 按 id 更新(鉴权) */
export async function PUT(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const b = await request.json().catch(() => null);
    if (!b?.id) return Response.json({ error: 'id 必填' }, { status: 400 });
    getDb().update(bookmarks).set({
        url: b.url, title: b.title, category: b.category ?? null,
        subcategory: b.subcategory ?? null, tags: JSON.stringify(b.tags || []),
        description: b.description ?? null,
    }).where(eq(bookmarks.id, String(b.id))).run();
    return Response.json({ ok: true });
}

/** DELETE /api/bookmarks?id=xxx(鉴权) */
export async function DELETE(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'id 必填' }, { status: 400 });
    getDb().delete(bookmarks).where(eq(bookmarks.id, String(id))).run();
    return Response.json({ ok: true });
}
