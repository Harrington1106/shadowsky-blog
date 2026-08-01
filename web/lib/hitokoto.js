/**
 * 一言（hitokoto.cn）—— 首页打字机的句子来源。
 *
 * 为什么在服务端取而不是浏览器直连：
 *   实测大陆本机访问 v1.hitokoto.cn TTFB 1.65–3.3s，客户端直连意味着访客要盯着
 *   空白等好几秒；杭州源站访问只要 1.0s，加上边缘缓存(s-maxage=3600)，
 *   绝大多数访客拿到的是已经烤进 HTML 的句子。
 *
 * 为什么不阻塞渲染：
 *   缓存没命中时**先返回上一批（或内置兜底），同时在后台刷新** —— 首页任何时候
 *   都不会因为第三方接口慢而变慢。最坏情况只是这一次看到的是上一批句子。
 *
 * 接口挂了、超时、返回垃圾，一律退回内置句子，首页不受影响。
 */

/** 兜底句子：一言取不到时用这批（原本就是硬编码在首页的那几句） */
export const FALLBACK_PHRASES = [
    '星河欲转千帆舞',
    '心有猛虎，细嗅蔷薇',
    '且将新火试新茶，诗酒趁年华',
    '路漫漫其修远兮，吾将上下而求索',
    '星垂平野阔，月涌大江流',
];

// c=d 文学 / i 诗词 / k 哲学 —— 跟站点现在的调子一致；
// 想要「抖机灵」「动画」那类换成 c=l / c=a 即可。
// max_length 卡在 24 字：再长会在首页换行，把标题和标签往下顶。
const API = 'https://v1.hitokoto.cn/?c=d&c=i&c=k&encode=json&max_length=24';
const COUNT = 5;
const TTL_MS = 10 * 60 * 1000;
// 6s 而不是 2.5s:这是后台刷新,没有任何人在等它;而大陆到 hitokoto 实测
// 最慢能到 3.3s,卡太紧会一直刷不出来(本机实测就是被 2.5s 全超时挡住了)
const TIMEOUT_MS = 6000;

let cache = { phrases: null, at: 0 };
let refreshing = false;

async function fetchOne(i) {
    // ⚠ 必须加随机参数:hitokoto 前面的 CDN 按 URL 缓存,同一个 URL 并发请求 5 次
    //   拿回来的是**同一句话**(实测),去重后只剩 1 句,永远凑不够数。
    const url = `${API}&_=${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // 要的是"每次都随机",不能让 Next 的 fetch 缓存把同一句钉死
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = String(data?.hitokoto || '').trim();
    if (!text || text.length > 30) throw new Error('内容不合用');
    return text;
}

/** 后台刷新，不 await —— 调用方永远不等它 */
function refresh() {
    if (refreshing) return;
    refreshing = true;
    Promise.allSettled(Array.from({ length: COUNT }, (_, i) => fetchOne(i)))
        .then((results) => {
            const list = [...new Set(results.filter((r) => r.status === 'fulfilled').map((r) => r.value))];
            // 至少捞到 3 句才替换，免得偶发抖动让首页只剩一两句来回打
            if (list.length >= 3) cache = { phrases: list, at: Date.now() };
        })
        .catch(() => {})
        .finally(() => { refreshing = false; });
}

/**
 * 取打字机句子。同步返回，绝不等待网络。
 * @returns {string[]}
 */
export function getPhrases() {
    const fresh = cache.phrases && Date.now() - cache.at < TTL_MS;
    if (!fresh) refresh(); // 过期就后台刷，本次仍用旧的/兜底的
    return cache.phrases || FALLBACK_PHRASES;
}
