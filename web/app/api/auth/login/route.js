import { cookies } from 'next/headers';
import { checkPassword, createSession, SESSION_COOKIE, cookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST /api/auth/login { password } → 校验口令,成功写会话 cookie */
export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: '请求格式错误' }, { status: 400 });
    }
    if (!checkPassword(body?.password)) {
        return Response.json({ error: '口令错误' }, { status: 401 });
    }
    const token = await createSession();
    const store = await cookies();
    store.set(SESSION_COOKIE, token, cookieOptions);
    return Response.json({ ok: true });
}
