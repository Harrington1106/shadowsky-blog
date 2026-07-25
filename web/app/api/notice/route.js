import { getDb } from '@/lib/db';
import { notice } from '@/lib/schema';

export const dynamic = 'force-dynamic';

/** GET /api/notice → 站点公告对象 { content, show, style, updated_at } */
export async function GET() {
    const db = getDb();
    const row = db.select().from(notice).limit(1).all()[0];
    if (!row) return Response.json({});
    return Response.json({
        content: row.content || '',
        show: !!row.show,
        style: row.style || 'info',
        updated_at: row.updatedAt,
    });
}
