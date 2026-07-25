/**
 * 会话鉴权 —— 替换旧的单一 ADMIN_TOKEN。
 * 登录:校验 ADMIN_PASSWORD → 签发 jose JWT → 写 httpOnly cookie。
 * 校验:读 cookie → jwtVerify。中间件(edge)与 Route Handler(node)都能用,
 *       因为只依赖 jose,不碰 better-sqlite3。
 *
 * 环境变量(.env,不进 git):
 *   ADMIN_PASSWORD  管理员口令(明文比对,timing-safe)
 *   AUTH_SECRET     JWT 签名密钥(随机长字符串)
 */
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'sq_session';
const ALG = 'HS256';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 天

function secret() {
    const s = process.env.AUTH_SECRET;
    if (!s) throw new Error('AUTH_SECRET 未配置');
    return new TextEncoder().encode(s);
}

/** 校验口令(长度无关的常量时间比较,避免 timing 泄露) */
export function checkPassword(input) {
    const expected = process.env.ADMIN_PASSWORD || '';
    if (!expected || typeof input !== 'string') return false;
    const a = new TextEncoder().encode(input);
    const b = new TextEncoder().encode(expected);
    // 长度不同直接 false,但仍走一遍比较避免早退
    let diff = a.length ^ b.length;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) diff |= (a[i] || 0) ^ (b[i] || 0);
    return diff === 0;
}

/** 签发会话 JWT */
export async function createSession(subject = 'admin') {
    return new SignJWT({ role: 'admin' })
        .setProtectedHeader({ alg: ALG })
        .setSubject(subject)
        .setIssuedAt()
        .setExpirationTime(`${MAX_AGE}s`)
        .sign(secret());
}

/** 校验会话 JWT,合法返回 payload,否则 null */
export async function verifySession(token) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
        return payload;
    } catch {
        return null;
    }
}

export const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
};
