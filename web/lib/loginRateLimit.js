/**
 * 登录限流 —— 按客户端 IP 计失败次数,连续失败就锁一段时间。
 *
 * 存在内存里:线上只有 shadowsky-v2 一个容器、一个 Node 进程,不需要 Redis;
 * 重启会清空,这是可接受的(重启需要 ssh,能 ssh 的人本来就不用爆破口令)。
 *
 * 只锁单个 IP、不设全局锁:全局锁会被人拿来主动把管理员关在门外(自伤式 DoS)。
 */

// 热重载(dev)时不要把计数清掉,挂在 globalThis 上
const store = (globalThis.__loginAttempts ??= new Map());

/** 失败次数 → 锁定时长(毫秒),取第一个满足的档 */
const TIERS = [
    { fails: 12, lockMs: 30 * 60 * 1000 },
    { fails: 8, lockMs: 5 * 60 * 1000 },
    { fails: 5, lockMs: 60 * 1000 },
];

const WINDOW_MS = 30 * 60 * 1000; // 距上次失败超过这个时间就重新计数
const MAX_ENTRIES = 1000; // 超过就清一次过期条目,防止被大量随机 IP 撑爆内存

/**
 * 取客户端真实 IP —— 链路是 CF → 美国中转 nginx → 杭州 nginx → 容器,
 * 所以优先信 cf-connecting-ip,其次 XFF 的第一段
 * @param {Headers} headers 请求头
 * @returns {string} 取不到时返回 'unknown'(所有取不到的请求共用一个桶)
 */
export function clientIp(headers) {
    return (
        headers.get('cf-connecting-ip') ||
        (headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
        headers.get('x-real-ip') ||
        'unknown'
    );
}

/** 清掉已过窗口的条目 */
function sweep(now) {
    for (const [key, rec] of store) {
        if (now - rec.lastAt > WINDOW_MS && (!rec.lockUntil || rec.lockUntil < now)) store.delete(key);
    }
}

/**
 * 登录前检查:这个 IP 现在能不能试
 * @param {string} ip
 * @returns {{allowed: boolean, retryAfter: number}} retryAfter 单位秒
 */
export function checkLoginRateLimit(ip) {
    const rec = store.get(ip);
    const now = Date.now();
    if (rec?.lockUntil && rec.lockUntil > now) {
        return { allowed: false, retryAfter: Math.ceil((rec.lockUntil - now) / 1000) };
    }
    return { allowed: true, retryAfter: 0 };
}

/**
 * 记一次失败,必要时上锁
 * @param {string} ip
 * @returns {{locked: boolean, retryAfter: number, remaining: number}} remaining 是离下一档锁定还差几次
 */
export function recordLoginFailure(ip) {
    const now = Date.now();
    if (store.size > MAX_ENTRIES) sweep(now);

    let rec = store.get(ip);
    // 上一次失败已经在窗口外 → 从头计
    if (!rec || now - rec.lastAt > WINDOW_MS) rec = { fails: 0, lastAt: now, lockUntil: 0 };
    rec.fails += 1;
    rec.lastAt = now;

    const tier = TIERS.find((t) => rec.fails >= t.fails);
    if (tier) rec.lockUntil = now + tier.lockMs;
    store.set(ip, rec);

    const nextTier = [...TIERS].reverse().find((t) => t.fails > rec.fails);
    return {
        locked: !!tier,
        retryAfter: tier ? Math.ceil(tier.lockMs / 1000) : 0,
        remaining: nextTier ? nextTier.fails - rec.fails : 0,
    };
}

/** 登录成功 → 清掉该 IP 的失败记录 */
export function resetLoginAttempts(ip) {
    store.delete(ip);
}
