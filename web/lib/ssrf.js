/**
 * SSRF 防护 —— 移植自旧 Express 的 assertPublicAddress / isPrivateIp。
 * 校验协议 + 解析主机 DNS,拒绝内网/环回/链路本地地址,防止代理端点被用来打内网。
 */
import net from 'node:net';
import dns from 'node:dns/promises';

export function isPrivateIp(ip) {
    const v = net.isIP(ip);
    if (v === 4) {
        if (ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
        const parts = ip.split('.');
        const a = parseInt(parts[0], 10);
        const b = parseInt(parts[1], 10);
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
        if (a === 0) return true;
        return false;
    }
    if (v === 6) {
        const n = ip.toLowerCase();
        return n === '::1' || n === '::' || n.startsWith('fe80:') || n.startsWith('fc') || n.startsWith('fd');
    }
    return true; // 非法 IP,保守拒绝
}

/** 校验 url 可安全代理;不合法则抛错。 */
export async function assertPublicUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string' || !/^https?:\/\//i.test(urlStr)) {
        throw new Error('Invalid protocol');
    }
    let host;
    try { host = new URL(urlStr).hostname; } catch { throw new Error('Invalid URL'); }
    const lh = host.toLowerCase();
    if (lh === 'localhost' || lh === '127.0.0.1' || lh === '::1') throw new Error('Invalid host');
    const addrs = await dns.lookup(host, { all: true });
    for (const a of addrs) {
        if (isPrivateIp(a.address)) throw new Error('Private address blocked');
    }
}
