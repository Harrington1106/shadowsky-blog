import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout → 清除会话 cookie */
export async function POST() {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return Response.json({ ok: true });
}
