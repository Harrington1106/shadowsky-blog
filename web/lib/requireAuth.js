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

/**
 * 取当前会话的 payload(没登录返回 null)。
 * 给需要看会话内容、而不只是「过没过」的地方用 —— 目前是改口令那条:
 * 带 pwreset 标记的会话(拿邮件临时口令进来的)允许不提供旧口令。
 * @returns {Promise<object|null>}
 */
export async function getSession() {
    const store = await cookies();
    return verifySession(store.get(SESSION_COOKIE)?.value);
}
