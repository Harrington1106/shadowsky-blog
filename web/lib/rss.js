/**
 * RSS/AI 翻译数据层 —— 移植自 ../../js/rss.js
 * 全部走客户端 fetch/DOMParser，三级代理链路（CF Worker → /api/rss-proxy → 直连）
 */

export const AI_PROVIDERS = {
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o4-mini'],
        help: '行业标杆，翻译质量最高',
        apiKeyUrl: 'https://platform.openai.com/api-keys',
    },
    anthropic: {
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
        help: '需 OpenAI 兼容端点，长文翻译细腻',
        apiKeyUrl: 'https://console.anthropic.com/keys',
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        help: '国产最强，百万上下文，性价比王',
        apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    },
    gemini: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
        help: '每月免费额度充裕，多语言顶尖',
        apiKeyUrl: 'https://aistudio.google.com/apikey',
    },
    grok: {
        name: 'Grok',
        baseUrl: 'https://api.x.ai/v1',
        models: ['grok-4', 'grok-4-mini'],
        help: 'xAI 模型，价格实惠',
        apiKeyUrl: 'https://console.x.ai/api-keys',
    },
    qwen: {
        name: '通义千问',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
        help: '阿里云，中文语感最佳',
        apiKeyUrl: 'https://bailian.console.aliyun.com/#/api-key',
    },
    doubao: {
        name: '豆包',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        models: ['doubao-1.5-pro-32k', 'doubao-1.5-lite-32k'],
        help: '字节跳动，性价比优秀',
        apiKeyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    },
    custom: {
        name: '自定义',
        baseUrl: '',
        models: [],
        help: '兼容 OpenAI API 格式的任意服务地址',
        apiKeyUrl: '',
    },
};

/** 估算阅读时间（中文约 400 字/分钟，英文约 200 词/分钟） */
export function getReadingTime(htmlContent) {
    if (!htmlContent) return '1 分钟';
    const text = htmlContent.replace(/<[^>]*>/g, '');
    const chineseChars = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
    const words = text.replace(/[一-鿿㐀-䶿]/g, '').match(/\b\w+\b/g) || [];
    const minutes = Math.ceil(chineseChars / 400 + words.length / 200);
    return minutes > 0 ? minutes + ' 分钟' : '1 分钟';
}

/** 相对时间格式化，如 "3小时前"、"昨天"、"6月15日" */
export function getRelativeTime(date) {
    const now = new Date();
    const d = date instanceof Date ? date : new Date(date);
    const diffSec = Math.floor((now - d) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return '刚刚';
    if (diffMin < 60) return diffMin + '分钟前';
    if (diffHour < 24) return diffHour + '小时前';
    if (diffDay === 1) return '昨天';
    if (diffDay < 7) return diffDay + '天前';
    if (diffDay < 30) return Math.floor(diffDay / 7) + '周前';

    const month = d.getMonth() + 1;
    const day = d.getDate();
    if (d.getFullYear() === now.getFullYear()) return month + '月' + day + '日';
    return d.getFullYear() + '年' + month + '月' + day + '日';
}

/** 加载订阅源列表（v2：SQLite ← /api/feeds） */
export async function fetchFeeds() {
    const response = await fetch('/api/feeds', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Failed to load feeds data: HTTP ' + response.status);
    const feeds = await response.json();
    return (Array.isArray(feeds) ? feeds : []).map((f) => ({ ...f, xmlUrl: f.xmlUrl || f.url }));
}

/** 抓取订阅源 XML：CF Worker → 自家 /api/rss-proxy(带 SSRF 防护) → 直连兜底 */
export async function fetchFeedXml(url) {
    /*
      顺序是「同源代理 → CF Worker → 直连」,不能反过来。

      同源代理排第一是因为它**没有 CORS 问题**,而另外两级都有:
      CF Worker 要它自己发对 Access-Control-Allow-Origin,直连则取决于对方站点 ——
      绝大多数 RSS 源根本不发这个头,所以直连这一级基本注定失败,只能垫底。

      超时也放宽到 20s:知乎日报那个源有 405KB,原来同源代理只给 8s,
      走大陆 → LAX → 杭州这条链路根本传不完 —— 于是它掉到直连、撞 CORS、
      整个源加载失败(2026-08-04 线上控制台实录)。这条链路的账见 CLAUDE.md。
    */
    const attempts = [
        { url: `/api/rss-proxy?url=${encodeURIComponent(url)}`, timeout: 20000 },
        { url: `https://bangumi.shadowquake.top/fetch?url=${encodeURIComponent(url)}`, timeout: 20000 },
        { url, timeout: 10000 },
    ];

    let lastError = null;
    for (const attempt of attempts) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), attempt.timeout);
            const resp = await fetch(attempt.url, { signal: controller.signal });
            clearTimeout(timer);
            if (resp.ok) return await resp.text();
            lastError = new Error(`HTTP ${resp.status}`);
        } catch (e) {
            lastError = e;
        }
    }
    throw new Error(`加载失败: ${lastError ? lastError.message : '未知原因'}`);
}

/**
 * 取一个元素里的 HTML。
 *
 * ⚠ 不能直接用 innerHTML:在 **XML** 文档里 CDATA 节点会被原样序列化成
 * `<![CDATA[…]]>`,包装符跟着一起吐出来,后面剥标签时就剥出「]]>…」这种残渣
 * (Solidot 的 description 全是 CDATA,线上摘要一整列都是这个,2026-08-04 实测)。
 *
 * 正确做法看子节点:
 *   只有文本 / CDATA → textContent。两种情况它都给出正确结果 ——
 *     转义过的 HTML(`&lt;p&gt;`)会被还原成 `<p>`,CDATA 直接给里面的内容。
 *   有真正的元素子节点(Atom 的 type="xhtml" 会这样)→ 才用 innerHTML,
 *     否则 textContent 会把标签结构丢掉。
 */
function nodeHtml(el) {
    if (!el) return '';
    const hasElementChild = Array.from(el.childNodes).some((n) => n.nodeType === 1);
    if (hasElementChild) return el.innerHTML || el.textContent || '';
    return el.textContent || '';
}

function getTagHtml(node, tagName) {
    if (tagName.includes(':')) {
        const [, localName] = tagName.split(':');
        let els = node.getElementsByTagName(tagName);
        if (els.length > 0) return nodeHtml(els[0]);
        els = node.getElementsByTagNameNS('*', localName);
        if (els.length > 0) return nodeHtml(els[0]);
        els = node.getElementsByTagName(localName);
        if (els.length > 0) return nodeHtml(els[0]);
        try {
            const el = node.querySelector(tagName.replace(':', '\\:'));
            if (el) return nodeHtml(el);
        } catch (e) { /* ignore */ }
    } else {
        return nodeHtml(node.querySelector(tagName));
    }
    return '';
}

function getTagValue(node, tagName) {
    if (tagName.includes(':')) {
        const [, localName] = tagName.split(':');
        let els = node.getElementsByTagName(tagName);
        if (els.length > 0) return els[0].textContent;
        els = node.getElementsByTagNameNS('*', localName);
        if (els.length > 0) return els[0].textContent;
        els = node.getElementsByTagName(localName);
        if (els.length > 0) return els[0].textContent;
        try {
            const el = node.querySelector(tagName.replace(':', '\\:'));
            if (el) return el.textContent;
        } catch (e) { /* ignore */ }
    } else {
        const el = node.querySelector(tagName);
        return el ? el.textContent : '';
    }
    return '';
}

function cleanHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function decodeEntities(html) {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

/** 解析 RSS/Atom XML 为文章数组 */
export function parseRSSContent(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item, entry'));

    return items.map((item) => {
        /*
          标题也要解一次实体:很多源把标题**双重转义**(`&amp;apos;`),XML 解析器只还原
          外面那层,剩下的 `&apos;` 会原样显示成「ACL&apos;26 杰出论文」(美团实测)。
          description/content 一直有解,唯独标题漏了。
          React 里标题是当文本渲染的,解完不会引入 XSS。
        */
        const title = decodeEntities(getTagValue(item, 'title'));
        const link = getTagValue(item, 'link');
        // Atom 的 published 是「发表时间」,updated 是「最后修改」—— 优先前者,
        // 否则一篇老文章改个错别字就会跳到列表最前面
        const pubDate = getTagValue(item, 'pubDate') || getTagValue(item, 'published')
            || getTagValue(item, 'updated') || getTagValue(item, 'dc:date');
        const descriptionHtml = getTagHtml(item, 'description') || getTagHtml(item, 'content') || getTagHtml(item, 'summary');

        let fullContent = getTagHtml(item, 'content:encoded');
        if (!fullContent) fullContent = getTagHtml(item, 'content');
        if (!fullContent) fullContent = descriptionHtml;

        /*
          Atom 的 <author> 是个容器(<name>/<uri>/<email>),直接取 textContent 会把
          子元素**全部拼在一起** —— 列表里就会出现
          「joyjoke2001 https://www.v2ex.com/member/joyjoke2001」这种东西(V2EX 实测)。
          有 <name> 子元素就只取它;RSS 2.0 的 <author> 才是纯文本。
        */
        const authorEl = item.getElementsByTagName('author')[0];
        const authorName = authorEl && getTagValue(authorEl, 'name');
        const author = decodeEntities(authorName || getTagValue(item, 'author') || getTagValue(item, 'dc:creator') || '').trim();

        return {
            title,
            link,
            /*
              没有日期就是 null,**不能**回落到 new Date()。
              有的源(如 tech.meituan.com/feed)整个 item 里一个日期字段都没有,
              伪造成「现在」的后果是:每条都显示「刚刚」、而且页面开着越久这个假时间
              还会跟着漂(5 分钟后变成「5分钟前」);更糟的是聚合视图按时间倒序排，
              这个源会把全部位置占满,其他源一条都露不出来(2026-08-04 线上就是这样)。
              日期不合法(解析成 Invalid Date)同样按没有处理。
            */
            pubDate: (() => {
                if (!pubDate) return null;
                const d = new Date(pubDate);
                return isNaN(d.getTime()) ? null : d;
            })(),
            description: cleanHtml(decodeEntities(descriptionHtml)),
            content: decodeEntities(fullContent),
            author,
        };
    });
}

/** 并发聚合全部订阅源文章（限并发 5），按日期倒序 */
export async function fetchAllFeedsArticles(feeds, onProgress) {
    let allArticles = [];
    let completed = 0;
    const CONCURRENCY_LIMIT = 5;
    const queue = [...feeds];

    const worker = async () => {
        while (queue.length > 0) {
            const feed = queue.shift();
            try {
                const xmlText = await fetchFeedXml(feed.xmlUrl);
                const articles = parseRSSContent(xmlText);
                articles.forEach((a) => { a.feedTitle = feed.title; });
                allArticles = allArticles.concat(articles);
            } catch (e) {
                console.warn(`Failed to load feed ${feed.title}:`, e);
            } finally {
                completed++;
                if (onProgress) onProgress(completed, feeds.length);
            }
        }
    };

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, feeds.length); i++) workers.push(worker());
    await Promise.all(workers);

    /*
      有日期的按时间倒序在前;没日期的一律排在后面,并保持它在各自源里的原始顺序
      (RSS 惯例是源内自上而下即新到旧,这是我们对它们仅有的顺序信息)。
      不能把无日期的当成 0 或 now:当成 now 会让它霸占整个列表顶部,
      当成 0 则会让一个正常源因为缺字段被永久埋底 —— 现在是「未知时间」，
      排在已知时间之后，不假装知道。
    */
    const dated = allArticles.filter((a) => a.pubDate);
    const undated = allArticles.filter((a) => !a.pubDate);
    dated.sort((a, b) => b.pubDate - a.pubDate);
    return [...dated, ...undated];
}

const DEFAULT_SYSTEM_PROMPT = '你是一个专业的翻译助手，请将以下内容翻译成简体中文，保持原文格式和语气。';

export function loadAISettings() {
    try {
        return JSON.parse(localStorage.getItem('ai_settings') || '{}');
    } catch (e) {
        return {};
    }
}

export function saveAISettingsToStorage(settings) {
    localStorage.setItem('ai_settings', JSON.stringify(settings));
}

/** 调用 AI 服务翻译文章正文 */
export async function translateArticle(content) {
    const settings = loadAISettings();
    const provider = settings.provider || 'openai';
    const baseUrl = settings.baseUrl || AI_PROVIDERS[provider]?.baseUrl || '';
    const apiKey = settings.apiKey;
    const model = settings.model || AI_PROVIDERS[provider]?.models[0] || '';
    const systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    if (!apiKey) throw new Error('API Key 未设置，请在 AI 设置中填写');

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content },
            ],
            temperature: 0.7,
        }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
}

export async function testAIConnection({ baseUrl, apiKey, model }) {
    if (!baseUrl || !apiKey || !model) throw new Error('请填写完整的配置信息');
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hello' }], max_tokens: 10 }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API 错误: ${response.status} - ${error.substring(0, 100)}`);
    }
}

export const DEFAULT_AI_SETTINGS = {
    provider: 'openai',
    baseUrl: AI_PROVIDERS.openai.baseUrl,
    apiKey: '',
    model: AI_PROVIDERS.openai.models[0],
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
};
