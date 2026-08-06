import { requireAuth } from '@/lib/requireAuth';
import { isMailConfigured, maskedAdminEmail, sendToAdmin, verifyMailConnection } from '@/lib/mailer';
import { hasPendingResetCode } from '@/lib/passwordReset';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/mail → 邮件找回的当前状态(鉴权)
 * 打码后的收件地址只在这里露出 —— 公开的 /api/auth/forgot 一个字都不说。
 */
export async function GET() {
    const guard = await requireAuth();
    if (guard) return guard;
    return Response.json({
        configured: isMailConfigured(),
        address: maskedAdminEmail(),
        host: process.env.SMTP_HOST || '',
        pending: hasPendingResetCode(),
    });
}

/**
 * POST /api/auth/mail → 发一封测试邮件(鉴权)
 *
 * 存在的理由:找回口令这条路平时用不到,等真被锁在门外那天才发现授权码早就过期了,
 * 就彻底没意义了。趁登录着先验一遍,是这套东西唯一能被验证的时机。
 */
export async function POST() {
    const guard = await requireAuth();
    if (guard) return guard;

    if (!isMailConfigured()) {
        return Response.json({ error: '还没配置 SMTP,见服务器 .env' }, { status: 400 });
    }

    try {
        // 先验连接再发信:授权码错、端口不通这类问题在 verify 阶段就能报出来,
        // 报错也比 sendMail 抛出来的更具体
        await verifyMailConnection();
        await sendToAdmin({
            subject: '[ShadowQuake] 测试邮件',
            text: [
                '这是一封测试邮件,说明后台的「忘记口令」能正常把信送到这个邮箱。',
                '',
                '真正找回口令时,你会收到一个 15 分钟有效的临时口令,',
                '把它填进登录页的口令框即可进入后台,进去后请立刻设置新口令。',
                '',
                '收到这封信后建议把发件地址加进白名单,免得下次进了垃圾箱。',
            ].join('\n'),
        });
    } catch (e) {
        console.error('[mail-test] 失败:', e.message);
        return Response.json({ error: `发送失败:${e.message}` }, { status: 502 });
    }

    return Response.json({ ok: true, address: maskedAdminEmail() });
}
