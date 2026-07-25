import { getDb, getSqlite } from '@/lib/db';
import { socialLinks } from '@/lib/schema';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/social → [{ name, url, icon }] */
export async function GET() {
    const rows = getDb().select().from(socialLinks).orderBy(socialLinks.sort).all();
    return Response.json(rows.map((s) => ({ name: s.name, url: s.url, icon: s.icon })));
}

/** PUT /api/social → 整体替换社交链接列表(鉴权)。body 为数组。 */
export async function PUT(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const list = await request.json().catch(() => null);
    if (!Array.isArray(list)) return Response.json({ error: '需要数组' }, { status: 400 });
    const db = getDb();
    // better-sqlite3 事务是连接级的,drizzle 操作走同一连接,故可包在其中
    getSqlite().transaction(() => {
        db.delete(socialLinks).run();
        list.forEach((s, i) => {
            if (s?.name && s?.url) {
                db.insert(socialLinks).values({ name: s.name, url: s.url, icon: s.icon ?? null, sort: i }).run();
            }
        });
    })();
    return Response.json({ ok: true });
}
