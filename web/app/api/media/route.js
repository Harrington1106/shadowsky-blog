import { getDb } from '@/lib/db';
import { media } from '@/lib/schema';

export const dynamic = 'force-dynamic';

/** GET /api/media → { anime, manga }。total 为 NULL 还原成 "?"(与旧 media.json 一致)。 */
export async function GET() {
    const db = getDb();
    const rows = db.select().from(media).all();
    const map = (r) => ({
        id: r.id, title: r.title, cover: r.cover,
        progress: r.progress ?? 0,
        total: r.total === null ? '?' : r.total,
        status: r.status, tag: r.tag,
    });
    return Response.json({
        anime: rows.filter((r) => r.type === 'anime').map(map),
        manga: rows.filter((r) => r.type === 'manga').map(map),
    });
}
