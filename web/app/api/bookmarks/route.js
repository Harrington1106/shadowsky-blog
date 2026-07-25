import { getDb } from '@/lib/db';
import { bookmarks, bookmarkCategories } from '@/lib/schema';

export const dynamic = 'force-dynamic';

/** GET /api/bookmarks → { categories, bookmarks }(与旧 fetchBookmarks 期望一致) */
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
