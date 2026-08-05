import { cookies, headers } from 'next/headers';
import { createSession, SESSION_COOKIE, cookieOptions } from '@/lib/auth';
import { checkAdminPassword } from '@/lib/adminPassword';
import { clientIp, checkLoginRateLimit, recordLoginFailure, resetLoginAttempts } from '@/lib/loginRateLimit';

export const dynamic = 'force-dynamic';

/** POST /api/auth/login { password } → 校验口令,成功写会话 cookie。失败按 IP 限流。 */
export async function POST(request) {
    const ip = clientIp(await headers());

    const gate = checkLoginRateLimit(ip);
    if (!gate.allowed) {
        return Response.json(
            { error: `尝试过于频繁,请 ${gate.retryAfter} 秒后再试`, retryAfter: gate.retryAfter },
            { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: '请求格式错误' }, { status: 400 });
    }

    if (!checkAdminPassword(body?.password)) {
        const hit = recordLoginFailure(ip);
        if (hit.locked) {
            return Response.json(
                { error: `口令错误次数过多,请 ${hit.retryAfter} 秒后再试`, retryAfter: hit.retryAfter },
                { status: 429, headers: { 'Retry-After': String(hit.retryAfter) } }
            );
        }
        // 只在快锁上时才提示剩余次数,平时不泄露计数状态
        const tail = hit.remaining > 0 && hit.remaining <= 2 ? `,再错 ${hit.remaining} 次将暂时锁定` : '';
        return Response.json({ error: `口令错误${tail}` }, { status: 401 });
    }

    resetLoginAttempts(ip);
    const token = await createSession();
    const store = await cookies();
    store.set(SESSION_COOKIE, token, cookieOptions);
    return Response.json({ ok: true });
}
