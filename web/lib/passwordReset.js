/**
 * 忘记口令 —— 往管理员邮箱发一个**临时口令**,15 分钟内可登录一次。
 *
 * 关键设计:临时口令是**并存**的第二把钥匙,不覆盖现有口令。
 *   如果它替换掉现有口令,那么任何人反复点「忘记口令」就能把站主锁在门外
 *   —— 一个公开接口不应该有这种杀伤力。现在最坏情况只是收几封没用的邮件。
 *
 * 存哪:app_settings 的一行 JSON,和口令 hash 同一张表,所以
 *   - 同时只可能存在一个有效临时口令(再申请一次就把旧的挤掉,正是想要的语义)
 *   - 不用新建表、不用写迁移
 *   - 必须加进 PROTECTED_SETTING_KEYS,否则 /api/settings 那个万能读写接口能看见它
 *
 * 存的是 scrypt hash 不是明文 —— 库会进备份、备份会进私有 git 仓库(见 CLAUDE.md
 * 「备份与回滚」),明文临时口令躺在那里等于给每一份历史备份都配了一把钥匙。
 */
import crypto from 'node:crypto';
import { getDb, getSqlite } from './db.js';
import { appSettings } from './schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyHash, RESET_KEY } from './adminPassword.js';

export { RESET_KEY };

/** 有效期 —— 够你切到邮箱把它抄过来,又不至于长期挂着一把备用钥匙 */
const TTL_MS = 15 * 60 * 1000;

/** 同一个临时口令最多试几次(防止照着格式暴力猜) */
const MAX_ATTEMPTS = 5;

/**
 * 去掉容易看错的字符:0/O、1/I/L 全部不用。
 * 临时口令是要从邮件里用眼睛抄进输入框的,少一个 O/0 之争就少一次白白的失败尝试。
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LEN = 12; // 31^12 ≈ 2^59,配上 IP 限流远不可能被猜中

/** 生成临时口令,分三组显示成 XXXX-XXXX-XXXX(比一长串好抄) */
function generateCode() {
    // 用 randomInt 而不是 randomBytes%N —— 后者对 256 不整除的字母表有模偏置
    let raw = '';
    for (let i = 0; i < CODE_LEN; i++) raw += ALPHABET[crypto.randomInt(ALPHABET.length)];
    return raw.match(/.{1,4}/g).join('-');
}

/**
 * 归一化用户输入:去掉分隔符、转大写。
 * 邮件里带着连字符,有人会连着抄、有人会漏掉,两种都应该能登进来。
 */
function normalize(input) {
    return String(input || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/**
 * 输入看起来像不像一个临时口令。
 *
 * ⚠ 这个判断是有用途的,不是装饰:失败计数只对「形状对得上」的输入累加。
 *   否则随便一个人拿错口令乱试几次,就能把站主刚收到的临时口令废掉 ——
 *   那等于给了外人一个持续阻断找回流程的开关。
 */
export function looksLikeResetCode(input) {
    const s = normalize(input);
    return s.length === CODE_LEN && [...s].every((c) => ALPHABET.includes(c));
}

/** 读出当前这条记录(解析失败/不存在都返回 null) */
function readRecord() {
    try {
        const row = getDb().select().from(appSettings).where(eq(appSettings.key, RESET_KEY)).all()[0];
        return row?.value ? JSON.parse(row.value) : null;
    } catch {
        return null;
    }
}

function writeRecord(rec) {
    getSqlite()
        .prepare('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        .run(RESET_KEY, JSON.stringify(rec));
}

/** 作废当前临时口令(用掉了、过期了、或者用真口令正常登录了) */
export function clearResetCode() {
    try {
        getSqlite().prepare('DELETE FROM app_settings WHERE key=?').run(RESET_KEY);
    } catch { /* 库还没就绪时无所谓,本来也没有待清理的记录 */ }
}

/**
 * 签发一个新的临时口令(旧的立刻作废)。
 * @returns {{code: string, expiresAt: number}} code 是明文,**只在这一刻存在**,发完就只剩 hash
 */
export function issueResetCode() {
    const code = generateCode();
    writeRecord({
        hash: hashPassword(normalize(code)),
        expiresAt: Date.now() + TTL_MS,
        attempts: 0,
    });
    return { code, expiresAt: Date.now() + TTL_MS };
}

/**
 * 校验并消费临时口令。成功即删除(单次有效)。
 * @param {string} input 用户在登录框里输入的内容
 * @returns {boolean} 是否放行
 */
export function consumeResetCode(input) {
    const rec = readRecord();
    if (!rec?.hash) return false;

    // 过期或试太多次 → 直接清掉,免得留着一条永远失败的记录
    if (Date.now() > rec.expiresAt || (rec.attempts || 0) >= MAX_ATTEMPTS) {
        clearResetCode();
        return false;
    }

    if (!verifyHash(normalize(input), rec.hash)) {
        writeRecord({ ...rec, attempts: (rec.attempts || 0) + 1 });
        return false;
    }

    clearResetCode();
    return true;
}

/** 当前是否有一个还没用掉的临时口令(设置页用来显示状态) */
export function hasPendingResetCode() {
    const rec = readRecord();
    return Boolean(rec?.hash && Date.now() <= rec.expiresAt && (rec.attempts || 0) < MAX_ATTEMPTS);
}

/* ------------------------------------------------------------------ *
 * 发信频率控制
 *
 * 放内存里,和 lib/loginRateLimit.js 同一个取舍:线上只有一个容器一个进程,
 * 重启会清零,而重启需要 ssh —— 能 ssh 的人根本不需要走找回流程。
 * ------------------------------------------------------------------ */

const sendLog = (globalThis.__resetMailLog ??= { last: 0, day: [] });

const COOLDOWN_MS = 5 * 60 * 1000;      // 两封之间至少隔 5 分钟
const DAILY_LIMIT = 5;                   // 24 小时内最多 5 封
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 能不能再发一封。
 *
 * ⚠ 这里是**全局**配额,不按 IP —— 收件人只有一个,按 IP 限流挡不住换 IP 刷邮件,
 *   station 主的收件箱会被淹。代价是别人可以用光当天配额、让你收不到找回邮件;
 *   但那只是退回到「ssh 上去删 hash」这条原有的救援路径,不会更糟。
 * @returns {{allowed: boolean, retryAfter: number, reason?: string}}
 */
export function checkSendQuota() {
    const now = Date.now();
    sendLog.day = sendLog.day.filter((t) => now - t < DAY_MS);

    if (sendLog.last && now - sendLog.last < COOLDOWN_MS) {
        return { allowed: false, retryAfter: Math.ceil((COOLDOWN_MS - (now - sendLog.last)) / 1000), reason: 'cooldown' };
    }
    if (sendLog.day.length >= DAILY_LIMIT) {
        const oldest = sendLog.day[0];
        return { allowed: false, retryAfter: Math.ceil((DAY_MS - (now - oldest)) / 1000), reason: 'daily' };
    }
    return { allowed: true, retryAfter: 0 };
}

/** 记一次成功发送 */
export function recordSend() {
    const now = Date.now();
    sendLog.last = now;
    sendLog.day.push(now);
}

export const RESET_TTL_MINUTES = TTL_MS / 60000;
