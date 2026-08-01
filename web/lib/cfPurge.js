/**
 * 清 Cloudflare 边缘缓存。
 *
 * 边缘 TTL 一旦拉长（超过几分钟），后台发文/改文就不再"即时可见"——
 * 源站是新的，边缘还在发旧的。所以内容一变就定点清掉对应的几个 URL。
 *
 * 没配 CF_ZONE_ID / CF_PURGE_TOKEN 时静默跳过（与 backup-offsite.py 同样的约定），
 * 这样没配凭据的环境（本地开发、别人 clone）也能正常跑。
 *
 * 这里用原生 fetch 而不是 lib/proxyFetch：目标是写死的 Cloudflare API 端点，
 * 不含任何用户可控成分，不需要 SSRF 防护那一层。
 */
import { SITE_URL } from './site.js';

const CF_API = 'https://api.cloudflare.com/client/v4';

/**
 * 按 URL 清缓存。
 * @param {string[]} paths 站内路径（如 ['/blog', '/post/xxx']）或完整 URL
 * @returns {Promise<{ok:boolean, skipped?:boolean, error?:string}>}
 */
export async function purgeUrls(paths) {
    const zone = process.env.CF_ZONE_ID;
    const token = process.env.CF_PURGE_TOKEN;
    if (!zone || !token) return { ok: true, skipped: true };

    const files = [...new Set(paths)].map((p) => (p.startsWith('http') ? p : `${SITE_URL}${p}`));

    try {
        const res = await fetch(`${CF_API}/zones/${zone}/purge_cache`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ files }),
            // 清缓存失败不该拖垮后台保存操作,给个短超时
            signal: AbortSignal.timeout(5000),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            const msg = data?.errors?.[0]?.message || `HTTP ${res.status}`;
            console.warn('[cfPurge] 清缓存失败:', msg);
            return { ok: false, error: msg };
        }
        return { ok: true };
    } catch (e) {
        console.warn('[cfPurge] 清缓存异常:', e.message);
        return { ok: false, error: e.message };
    }
}

/**
 * 一篇文章增删改后要清的 URL：文章本身 + 会列出它的页面。
 * @param {string} file 文章文件名（含 .md）
 */
export function postPurgeTargets(file) {
    const slug = String(file || '').replace(/\.md$/, '');
    return ['/', '/blog', `/post/${encodeURIComponent(slug)}`, '/sitemap.xml'];
}
