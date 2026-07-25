/**
 * 带 Cloudflare Worker 回退的抓取 —— 国内服务器直连境外资源常失败(C2),
 * 直连失败则改走 CF Worker 通用抓取代理 /fetch?url=。
 * Worker 域名可用 FETCH_PROXY_BASE 覆盖(默认 bangumi.shadowquake.top)。
 */
const PROXY_BASE = process.env.FETCH_PROXY_BASE || 'https://bangumi.shadowquake.top';

function timeoutSignal(ms) {
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
}

/**
 * 先直连,失败再走 Worker。返回 fetch Response。
 * @param {string} url 目标 URL
 * @param {{directTimeout?:number, proxyTimeout?:number, headers?:object, useProxyFallback?:boolean}} opts
 */
export async function proxyFetch(url, opts = {}) {
    const { directTimeout = 10000, proxyTimeout = 20000, headers = {}, useProxyFallback = true } = opts;
    const ua = { 'User-Agent': 'Mozilla/5.0 (ShadowQuake Proxy)', ...headers };
    try {
        const res = await fetch(url, { headers: ua, redirect: 'follow', signal: timeoutSignal(directTimeout) });
        if (res.ok) return res;
        if (!useProxyFallback) return res;
        throw new Error(`direct ${res.status}`);
    } catch (directErr) {
        if (!useProxyFallback) throw directErr;
        const proxyUrl = `${PROXY_BASE}/fetch?url=${encodeURIComponent(url)}`;
        return fetch(proxyUrl, { headers: ua, redirect: 'follow', signal: timeoutSignal(proxyTimeout) });
    }
}
