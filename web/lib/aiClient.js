'use client';

/**
 * 客户端 AI 助手 —— 复用老后台的做法:浏览器直连 DeepSeek/OpenAI 兼容接口,
 * 用 localStorage 里的 ai_settings(apiKey/baseUrl/model),密钥不经过我们的服务器。
 * 在「设置 → AI 翻译」里配置。
 */
export function getAiSettings() {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('ai_settings') || '{}'); } catch { return {}; }
}
export function setAiSettings(s) {
    localStorage.setItem('ai_settings', JSON.stringify(s || {}));
}
export function hasAiKey() {
    return !!getAiSettings().apiKey;
}

async function chat(messages, { json = false, temperature = 0.3 } = {}) {
    const s = getAiSettings();
    if (!s.apiKey) throw new Error('请先在「设置 → AI 翻译」配置 API Key');
    const r = await fetch(`${s.baseUrl || 'https://api.deepseek.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: s.model || 'deepseek-chat',
            messages,
            temperature,
            ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
    });
    if (!r.ok) {
        let msg = `AI HTTP ${r.status}`;
        try { const e = await r.json(); if (e.error?.message) msg = e.error.message; } catch { /* noop */ }
        throw new Error(msg);
    }
    const data = await r.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
}

/** 按域名推测网站标题+简介 */
export async function aiGuessTitleDesc(url) {
    const domain = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
    const content = await chat([
        { role: 'system', content: '根据用户提供的网址/域名,推测网站名称和简介。直接返回 JSON:{"title":"网站名","desc":"一句话中文简介"}。不要任何其他内容。' },
        { role: 'user', content: domain },
    ], { json: true });
    const obj = JSON.parse(content || '{}');
    return { title: obj.title || '', desc: obj.desc || '' };
}

/** 把英文简介翻译成中文 */
export async function aiTranslate(text) {
    return chat([
        { role: 'system', content: '将以下英文网站描述翻译成简体中文简介。要求:简洁自然,不出现"您可以""欢迎来到"等套话,直接描述网站内容和特色。只返回译文。' },
        { role: 'user', content: text },
    ]);
}
