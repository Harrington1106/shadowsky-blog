import { requireAuth } from '@/lib/requireAuth';
import { devOnly, listAll } from '@/lib/publishLocal';

export const dynamic = 'force-dynamic';

export async function GET() {
    const gone = devOnly();
    if (gone) return gone;
    const guard = await requireAuth();
    if (guard) return guard;

    try {
        return Response.json(listAll());
    } catch (e) {
        return Response.json({ error: String(e.message) }, { status: 500 });
    }
}
