import { getDb } from '@/lib/db';
import { videos } from '@/lib/schema';

export const dynamic = 'force-dynamic';

/** GET /api/videos → { videos, favorites }(按 kind 拆分)。 */
export async function GET() {
    const db = getDb();
    const rows = db.select().from(videos).all();
    const map = (v) => ({
        id: v.id, title: v.title, thumbnail: v.thumbnail,
        duration: v.duration, views: v.views,
        category: v.category, type: v.type, bvid: v.bvid,
    });
    return Response.json({
        videos: rows.filter((v) => v.kind === 'video').map(map),
        favorites: rows.filter((v) => v.kind === 'favorite').map(map),
    });
}
