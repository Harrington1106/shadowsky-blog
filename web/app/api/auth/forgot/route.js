import { headers } from 'next/headers';
import { SITE_URL } from '@/lib/site';
import { isMailConfigured, sendToAdmin } from '@/lib/mailer';
import { issueResetCode, checkSendQuota, recordSend, clearResetCode, RESET_TTL_MINUTES } from '@/lib/passwordReset';
import { clientIp } from '@/lib/loginRateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/forgot → { available }
 * 登录页据此决定要不要显示「忘记口令」。
 *
 * 只回一个布尔值,**不带邮箱地址**(哪怕打码的)——这是个公开接口,
 * 站主自己知道自己的邮箱,没必要对着全互联网报出域名。打码地址只在
 * 登录后的设置页显示。
 */
export async function GET() {
    return Response.json({ available: isMailConfigured() });
}

/**
 * POST /api/auth/forgot → 给管理员邮箱发一个临时口令。
 *
 * 公开接口(人都登不进来了,不可能要求鉴权),所以三重约束:
 *   1. 收件地址写死在 .env,请求体里带什么都没用 —— 不是转发机
 *   2. 全局频率限制(5 分钟一封、一天 5 封),不然收件箱会被刷爆
 *   3. 临时口令不覆盖现有口令,所以别人替你点它,最坏也只是让你收封没用的邮件
 */
export async function POST() {
    if (!isMailConfigured()) {
        return Response.json(
            { error: '服务器没有配置邮件发送,请用 ssh 走救援流程(见 CLAUDE.md「后台口令」)' },
            { status: 503 }
        );
    }

    const gate = checkSendQuota();
    if (!gate.allowed) {
        const msg = gate.reason === 'daily'
            ? '今天的找回次数已用完,请改用 ssh 救援'
            : `刚发过一封,请 ${Math.ceil(gate.retryAfter / 60)} 分钟后再试`;
        return Response.json({ error: msg, retryAfter: gate.retryAfter }, { status: 429 });
    }

    const ip = clientIp(await headers());
    const { code } = issueResetCode();

    try {
        await sendToAdmin({
            subject: `[ShadowQuake] 后台临时口令(${RESET_TTL_MINUTES} 分钟内有效)`,
            text: [
                '有人在后台登录页点了「忘记口令」。',
                '',
                `临时口令:${code}`,
                `有效期:${RESET_TTL_MINUTES} 分钟,只能用一次。`,
                '',
                `登录地址:${SITE_URL}/admin/login`,
                '把上面这串直接填进口令框即可登录,登录后请立刻设置新口令。',
                '',
                `请求来源 IP:${ip}`,
                '',
                '如果这不是你本人操作 —— 不用做任何事。',
                '你原来的口令没有被改动,现在依然有效;这个临时口令过期后自动失效。',
            ].join('\n'),
        });
    } catch (e) {
        // 发失败就把刚签发的临时口令收回,不留一把「谁也没收到、却真实有效」的钥匙
        clearResetCode();
        console.error('[forgot] 邮件发送失败:', e.message);
        return Response.json({ error: '邮件发送失败,请检查服务器 SMTP 配置' }, { status: 502 });
    }

    recordSend();
    return Response.json({ ok: true, expiresInMinutes: RESET_TTL_MINUTES });
}
