/**
 * 写 API 的鉴权守卫(在 Route Handler 里用)。
 * 用法:
 *   const guard = await requireAuth();
 *   if (guard) return guard;   // 未授权,直接返回 401
 */
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from './auth.js';

export async function requireAuth() {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    const payload = await verifySession(token);
    if (!payload) {
        return Response.json({ error: '未授权' }, { status: 401 });
    }
    return null; // 通过
}
