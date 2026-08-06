import { cookies } from 'next/headers';
import { requireAuth, getSession } from '@/lib/requireAuth';
import { createSession, SESSION_COOKIE, cookieOptions } from '@/lib/auth';
import { checkAdminPassword, setAdminPassword, hasStoredPassword, MIN_PASSWORD_LENGTH } from '@/lib/adminPassword';
import { clearResetCode } from '@/lib/passwordReset';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/password → { custom, viaReset }
 * custom   口令是否已由后台改过(false = 还在用 .env 的兜底值)
 * viaReset 当前会话是不是拿邮件里的临时口令进来的 —— 前端据此提示「请立刻设置新口令」
 */
export async function GET() {
    const session = await getSession();
    if (!session) return Response.json({ error: '未授权' }, { status: 401 });
    return Response.json({ custom: hasStoredPassword(), viaReset: !!session.pwreset });
}

/**
 * POST /api/auth/password { current, next } → 修改管理员口令
 *
 * 两种放行方式:
 *   a. 普通会话:必须同时知道当前口令 —— 只有 cookie 不够,防止 cookie 被盗后直接改掉口令锁死站主
 *   b. 临时口令换来的会话(pwreset):不要求旧口令 —— 旧口令正是忘掉的那个。
 *      这个会话是「能收到管理员邮箱的信」换来的,强度就等于那个邮箱。
 */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const session = await getSession();
    const viaReset = !!session?.pwreset;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return Response.json({ error: '请求格式错误' }, { status: 400 });

    const { current, next } = body;
    if (!viaReset && !checkAdminPassword(current)) {
        return Response.json({ error: '当前口令不正确' }, { status: 401 });
    }
    if (typeof next !== 'string' || next.length < MIN_PASSWORD_LENGTH) {
        return Response.json({ error: `新口令至少 ${MIN_PASSWORD_LENGTH} 位` }, { status: 400 });
    }
    if (!viaReset && next === current) {
        return Response.json({ error: '新口令与当前口令相同' }, { status: 400 });
    }

    setAdminPassword(next);
    // 邮件里那个临时口令可能还没到期,口令都重设了就没理由让它继续能用
    clearResetCode();

    // 换发一个不带 pwreset 的会话:这个标记的特权是「免旧口令改口令」,
    // 用完必须当场收回,否则它会在 cookie 里一直躺到 7 天后自然过期。
    if (viaReset) {
        const token = await createSession();
        (await cookies()).set(SESSION_COOKIE, token, cookieOptions);
    }

    // 会话 JWT 是无状态的,改口令不会踢掉已签发的 cookie(含其他设备)。
    // 要立刻踢掉所有设备只能换 AUTH_SECRET 并重建容器,前端已就此作说明。
    return Response.json({ ok: true });
}
