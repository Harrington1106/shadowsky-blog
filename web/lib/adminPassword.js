/**
 * 管理员口令 —— 口令 hash 存在 SQLite 的 app_settings 里,后台可自助修改。
 *
 * 为什么单独一个文件、不并进 lib/auth.js:
 *   middleware.js 跑在 edge runtime 且 import 自 @/lib/auth。
 *   这里要读数据库(better-sqlite3,原生模块),塞进 auth.js 会被一起打进 edge bundle 直接构建失败。
 *   所以 auth.js 只留 jose(edge 安全),口令校验这类要碰库的逻辑放这里,只被 Route Handler 引用。
 *
 * 口令来源的优先级:
 *   1. 库里有 admin_password_hash → 只认它(env 里的旧口令即刻失效)
 *   2. 库里没有 → 回落到 .env 的 ADMIN_PASSWORD(首次部署 / 忘记口令后的救援口令)
 *
 * ⚠ 忘了自己改的口令怎么办(需要 ssh):
 *   sqlite3 /www/wwwroot/shadowquake-v2/db/shadowquake.db \
 *     "DELETE FROM app_settings WHERE key='admin_password_hash';"
 *   删掉后立刻回落到 .env 的 ADMIN_PASSWORD,不用重建容器。
 */
import crypto from 'node:crypto';
import { getDb, getSqlite } from './db.js';
import { appSettings } from './schema.js';
import { eq } from 'drizzle-orm';

/** 口令 hash 在 app_settings 里的 key */
export const PASSWORD_KEY = 'admin_password_hash';

/**
 * 不允许经 /api/settings 读写的 key。
 * 口令 hash 不能出现在「读全部设置」的响应里,更不能被那个万能 POST 直接覆盖 ——
 * 否则拿到会话的人无需知道旧口令就能改掉它。改口令只走 /api/auth/password。
 */
export const PROTECTED_SETTING_KEYS = new Set([PASSWORD_KEY]);

// scrypt 参数。N=16384 在这台小 VPS 上约 30–50ms,够慢又不至于拖垮登录。
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const SALT_BYTES = 16;

/** 口令最短长度(改口令时校验) */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * 生成口令 hash,格式:scrypt$<N>$<r>$<p>$<saltBase64>$<hashBase64>
 * @param {string} plain 明文口令
 * @returns {string} 可直接入库的字符串
 */
export function hashPassword(plain) {
    const salt = crypto.randomBytes(SALT_BYTES);
    const hash = crypto.scryptSync(plain, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
    return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * 比对明文与库里的 hash(常量时间)
 * @param {string} plain 明文口令
 * @param {string} stored 库里的 hash 串
 */
export function verifyHash(plain, stored) {
    if (typeof plain !== 'string' || typeof stored !== 'string') return false;
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const [, n, r, p, saltB64, hashB64] = parts;
    try {
        const salt = Buffer.from(saltB64, 'base64');
        const expected = Buffer.from(hashB64, 'base64');
        const actual = crypto.scryptSync(plain, salt, expected.length, {
            N: Number(n), r: Number(r), p: Number(p),
            // scrypt 默认 maxmem 32MB,N=16384/r=8 恰好贴着上限,显式放宽避免抛错
            maxmem: 256 * 1024 * 1024,
        });
        return crypto.timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
}

/** 明文常量时间比较(长度不同也不早退,避免 timing 泄露长度) */
function constantTimeEqual(input, expected) {
    if (typeof input !== 'string' || typeof expected !== 'string' || !expected) return false;
    const a = Buffer.from(input, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    let diff = a.length ^ b.length;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) diff |= (a[i] || 0) ^ (b[i] || 0);
    return diff === 0;
}

/** 读库里的口令 hash,没有则 null */
export function getStoredHash() {
    try {
        const row = getDb().select().from(appSettings).where(eq(appSettings.key, PASSWORD_KEY)).all()[0];
        return row?.value || null;
    } catch {
        return null; // 库还没建好(首次启动)时按「没设过」处理,回落 env
    }
}

/** 库里是否已经设过口令(设置页用来提示当前口令来自哪) */
export function hasStoredPassword() {
    return !!getStoredHash();
}

/**
 * 校验管理员口令 —— 登录与改口令共用这一个入口
 * @param {string} input 明文
 * @returns {boolean}
 */
export function checkAdminPassword(input) {
    if (typeof input !== 'string' || !input) return false;
    const stored = getStoredHash();
    if (stored) return verifyHash(input, stored);
    return constantTimeEqual(input, process.env.ADMIN_PASSWORD || '');
}

/**
 * 写入新口令(覆盖旧的)
 * @param {string} plain 新明文口令
 */
export function setAdminPassword(plain) {
    const value = hashPassword(plain);
    getSqlite()
        .prepare('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        .run(PASSWORD_KEY, value);
}
