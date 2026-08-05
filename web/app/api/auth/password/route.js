import { requireAuth } from '@/lib/requireAuth';
import { checkAdminPassword, setAdminPassword, hasStoredPassword, MIN_PASSWORD_LENGTH } from '@/lib/adminPassword';

export const dynamic = 'force-dynamic';

/** GET /api/auth/password → { custom } 口令是否已由后台改过(false = 还在用 .env 的兜底值) */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    return Response.json({ custom: hasStoredPassword() });
}

/**
 * POST /api/auth/password { current, next } → 修改管理员口令
 * 要求已登录 **且** 知道当前口令 —— 只有会话不够,防止 cookie 被盗后直接改掉口令锁死站主。
 */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return Response.json({ error: '请求格式错误' }, { status: 400 });

    const { current, next } = body;
    if (!checkAdminPassword(current)) {
        return Response.json({ error: '当前口令不正确' }, { status: 401 });
    }
    if (typeof next !== 'string' || next.length < MIN_PASSWORD_LENGTH) {
        return Response.json({ error: `新口令至少 ${MIN_PASSWORD_LENGTH} 位` }, { status: 400 });
    }
    if (next === current) {
        return Response.json({ error: '新口令与当前口令相同' }, { status: 400 });
    }

    setAdminPassword(next);
    // 会话 JWT 是无状态的,改口令不会踢掉已签发的 cookie(含其他设备)。
    // 要立刻踢掉所有设备只能换 AUTH_SECRET 并重建容器,前端已就此作说明。
    return Response.json({ ok: true });
}
