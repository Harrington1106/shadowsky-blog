/**
 * 发信 —— 只为「忘记口令」这一条路存在,收件人写死在服务端。
 *
 * ⚠ 这里**没有**收件人参数,是故意的。
 *   忘记口令的接口必须是公开的(人都登不进来了),如果收件地址能由请求带进来,
 *   这个接口立刻变成一台任人使唤的转发机。地址只从 .env 的 ADMIN_EMAIL 读。
 *
 * ⚠ 为什么不放数据库、不做成后台可改:
 *   /api/settings 是「任意 key 都能写」的接口。收件地址一旦可写,
 *   拿到会话的人把它改成自己的邮箱,再点一次「忘记口令」就拿到长期访问权 ——
 *   跟 PROTECTED_SETTING_KEYS 挡口令 hash 是同一类漏洞。改它必须能 ssh。
 *
 * 环境变量(服务器 /www/wwwroot/shadowquake-v2/.env,权限 600):
 *   ADMIN_EMAIL  收件地址,唯一收件人
 *   SMTP_HOST    如 smtp.qq.com
 *   SMTP_PORT    465(SSL)或 587(STARTTLS),默认 465
 *   SMTP_USER    登录账号(通常就是发信地址)
 *   SMTP_PASS    授权码/密码 —— 不是邮箱登录密码,是服务商给的授权码
 *   SMTP_FROM    发信显示地址,默认取 SMTP_USER
 *
 * ⚠ 阿里云 ECS **封禁出站 25 端口**(2026-08-06 实测:25 不通,465/587 通)。
 *   所以只能走服务商的认证提交端口,不能直接投递到收件方 MX。
 *   实测这台机器 smtp.qq.com / smtp.163.com / smtp.gmail.com 的 465、587 都连得上。
 */
import nodemailer from 'nodemailer';

/** 配置齐了才算可用;缺任何一项都当作「没配」,安静禁用(与 cfPurge / backup-offsite 同一套路) */
export function isMailConfigured() {
    return Boolean(
        process.env.ADMIN_EMAIL &&
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
    );
}

/** 收件地址(只用于在后台显示「会发到哪」,做了打码) */
export function maskedAdminEmail() {
    const addr = process.env.ADMIN_EMAIL || '';
    const at = addr.indexOf('@');
    if (at < 1) return '';
    const name = addr.slice(0, at);
    const domain = addr.slice(at);
    // 留首尾各一位,中间打码:t****e@gmail.com
    const head = name[0];
    const tail = name.length > 1 ? name[name.length - 1] : '';
    return `${head}${'*'.repeat(Math.max(1, name.length - 2))}${tail}${domain}`;
}

function transporter() {
    const port = Number(process.env.SMTP_PORT || 465);
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465, // 465 直接 SSL;587 走 STARTTLS
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        // 跨境到 Gmail 时握手可能很慢,给足超时;失败要能快点回到调用方而不是吊死请求
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
    });
}

/**
 * 发一封信给管理员。
 * @param {{subject: string, text: string}} mail 主题与纯文本正文
 * @returns {Promise<void>} 失败抛异常,由调用方决定要不要把细节暴露给前端
 */
export async function sendToAdmin({ subject, text }) {
    if (!isMailConfigured()) throw new Error('邮件未配置');
    await transporter().sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject,
        text,
    });
}

/** 连通性自检 —— 后台「测试邮件」用,能提前发现授权码过期之类的问题 */
export async function verifyMailConnection() {
    if (!isMailConfigured()) throw new Error('邮件未配置');
    await transporter().verify();
}
