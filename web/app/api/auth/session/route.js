import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/auth/session → { authenticated } */
export async function GET() {
    const store = await cookies();
    const payload = await verifySession(store.get(SESSION_COOKIE)?.value);
    return Response.json({ authenticated: !!payload });
}
