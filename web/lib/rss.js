/**
 * RSS/AI 翻译数据层 —— 移植自 ../../js/rss.js
 * 全部走客户端 fetch/DOMParser，保持原版三级代理链路（CF Worker → PHP → 直连）
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

/** 抓取订阅源 XML：CF Worker → PHP 代理 → 直连兜底 */
export async function fetchFeedXml(url) {
    try {
        const cfUrl = `https://bangumi.shadowquake.top/fetch?url=${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const cfResp = await fetch(cfUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (cfResp.ok) return await cfResp.text();
    } catch (e) { /* 尝试下一级 */ }

    try {
        const proxyUrl = `/api/rss-proxy?url=${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (response.ok) {
            const text = await response.text();
            if (!text.includes('<?php') && !text.trim().startsWith('<?=')) return text;
        }
    } catch (e) { /* 尝试直连 */ }

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const directResp = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!directResp.ok) throw new Error(`HTTP ${directResp.status}`);
        return await directResp.text();
    } catch (e) {
        throw new Error(`加载失败: ${e.message}`);
    }
}

function getTagHtml(node, tagName) {
    if (tagName.includes(':')) {
        const [, localName] = tagName.split(':');
        let els = node.getElementsByTagName(tagName);
        if (els.length > 0) return els[0].innerHTML || els[0].textContent || '';
        els = node.getElementsByTagNameNS('*', localName);
        if (els.length > 0) return els[0].innerHTML || els[0].textContent || '';
        els = node.getElementsByTagName(localName);
        if (els.length > 0) return els[0].innerHTML || els[0].textContent || '';
        try {
            const el = node.querySelector(tagName.replace(':', '\\:'));
            if (el) return el.innerHTML || el.textContent || '';
        } catch (e) { /* ignore */ }
    } else {
        const el = node.querySelector(tagName);
        return el ? (el.innerHTML || el.textContent || '') : '';
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
        const title = getTagValue(item, 'title');
        const link = getTagValue(item, 'link');
        const pubDate = getTagValue(item, 'pubDate') || getTagValue(item, 'updated') || getTagValue(item, 'dc:date');
        const descriptionHtml = getTagHtml(item, 'description') || getTagHtml(item, 'content') || getTagHtml(item, 'summary');

        let fullContent = getTagHtml(item, 'content:encoded');
        if (!fullContent) fullContent = getTagHtml(item, 'content');
        if (!fullContent) fullContent = descriptionHtml;

        const author = getTagValue(item, 'author') || getTagValue(item, 'dc:creator');

        return {
            title,
            link,
            pubDate: pubDate ? new Date(pubDate) : new Date(),
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

    allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    return allArticles;
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
