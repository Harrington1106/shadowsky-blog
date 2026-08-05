/**
 * 会话鉴权 —— 签发/校验会话 JWT。
 * 登录:口令校验在 lib/adminPassword.js → 本文件签发 jose JWT → 写 httpOnly cookie。
 * 校验:读 cookie → jwtVerify。中间件(edge)与 Route Handler(node)都能用,
 *       因为只依赖 jose,不碰 better-sqlite3。
 *
 * ⚠ 本文件被 middleware.js(edge runtime)引用,**不要在这里 import 数据库或任何原生模块**
 *   —— 会被打进 edge bundle 直接构建失败。要读库的逻辑放 lib/adminPassword.js。
 *
 * 环境变量(.env,不进 git):
 *   AUTH_SECRET     JWT 签名密钥(随机长字符串)
 *   ADMIN_PASSWORD  管理员口令兜底值,见 lib/adminPassword.js
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
