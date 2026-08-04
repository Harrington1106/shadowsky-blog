import { requireAuth } from '@/lib/requireAuth';
import { devOnly, inspect } from '@/lib/publishLocal';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    const gone = devOnly();
    if (gone) return gone;
    const guard = await requireAuth();
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    try {
        return Response.json(inspect(searchParams.get('file') || '', searchParams.get('src')));
    } catch (e) {
        return Response.json({ error: String(e.message) }, { status: 400 });
    }
}
