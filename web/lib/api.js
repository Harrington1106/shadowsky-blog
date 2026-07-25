/**
 * 数据获取层 —— 移植自 ../../js/api.js，只保留博客试点页面需要的部分。
 * 全部走客户端 fetch，保持"发新文章即时可见、无需重新构建"的现状行为。
 */

const API_BASE = '/api';

/**
 * 拉取全部文章列表（与 js/blog.js 行为一致）
 */
export async function fetchPosts() {
    const res = await fetch(`${API_BASE}/posts`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const posts = (await res.json()) || [];
    posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return posts;
}

/**
 * 拉取单篇文章的原始 Markdown（含 front matter）
 */
export async function fetchPostMarkdown(file) {
    const name = file.endsWith('.md') ? file : file + '.md';
    const url = `${API_BASE}/posts/${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Article not found (${res.status}): ${name}`);
    const text = await res.text();
    return { text, finalPath: url };
}

/**
 * 拉取指定页面的访问计数
 * @param {string} pageId
 */
export async function fetchVisitCount(pageId) {
    try {
        // /api/visit-count 返回裸 {count}，不带 success 包装
        const url = `${API_BASE}/visit-count?page=${encodeURIComponent(pageId)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data.count === 'number') {
                return { count: data.count, total: data.total_visits || data.total || 0 };
            }
        }
    } catch (e) {
        // 忽略，走 fallback
    }
    return fetchVisitCountFallback(pageId);
}

async function fetchVisitCountFallback(pageId) {
    try {
        const res = await fetch(`${API_BASE}/stats.php`);
        const data = await res.json();
        if (data && data.success) {
            const d = data.data || {};
            const pages = d.pages || (d.stats && d.stats.pages) || {};
            const total = d.total_visits || d.total || (d.stats && d.stats.total) || 0;
            return { count: pages[pageId] || 0, total };
        }
    } catch (e) {
        // ignore
    }
    return { count: 0, total: 0 };
}

/**
 * AI 日报索引/单篇（供 blog 列表的"AI日报" tab 与 post 详情的 ?ai= 入口使用）
 */
export async function fetchAiDailyIndex() {
    const res = await fetch(`${API_BASE}/ai-daily`);
    if (!res.ok) return [];
    return (await res.json()) || [];
}

export async function fetchAiDailyMarkdown(date) {
    const res = await fetch(`${API_BASE}/ai-daily/${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error('日报不存在: ' + date);
    return res.text();
}

/**
 * 拉取随手拍数据（与 js/moments.js 行为一致）
 */
export async function fetchMoments() {
    const res = await fetch(`${API_BASE}/moments`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = (await res.json()) || [];
    if (!Array.isArray(data)) throw new Error('数据格式错误');
    return data.sort((a, b) => safeDate(b.date) - safeDate(a.date));
}

function safeDate(s) {
    if (!s) return new Date(0);
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    const d2 = new Date(String(s).replace(/-/g, '/'));
    return isNaN(d2.getTime()) ? new Date(0) : d2;
}

/**
 * 拉取收藏数据 + 分类元信息（与 js/bookmarks.js 行为一致）
 */
export async function fetchBookmarks() {
    const res = await fetch(`${API_BASE}/bookmarks`);
    if (!res.ok) throw new Error('数据加载失败');
    const data = await res.json();
    const bookmarks = data?.bookmarks;
    if (!bookmarks || !Array.isArray(bookmarks)) throw new Error('数据加载失败');
    return { categories: data.categories || {}, bookmarks };
}

/**
 * 拉取追番/追漫数据（与 js/media-data.js 的 MediaLoader 行为一致）
 */
export async function fetchMedia() {
    const res = await fetch(`${API_BASE}/media`);
    if (!res.ok) throw new Error('Failed to load media data');
    const data = await res.json();
    return { anime: data.anime || [], manga: data.manga || [] };
}

/**
 * 拉取视频/收藏视频数据（与 js/video-loader.js 行为一致）
 */
export async function fetchVideos() {
    const res = await fetch(`${API_BASE}/videos`);
    if (!res.ok) throw new Error('Failed to load video data');
    const data = await res.json();
    return { videos: data.videos || [], favorites: data.favorites || [] };
}
