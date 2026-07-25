import { getDb } from '@/lib/db';
import { greetings } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/greetings → 打招呼记录(鉴权,新→旧)。admin 用。 */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    const rows = getDb().select().from(greetings).orderBy(desc(greetings.id)).all();
    return Response.json(rows);
}
