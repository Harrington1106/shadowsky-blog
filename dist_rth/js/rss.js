/**
 * RSS/OPML Module
 * Provides RSS feed reading and OPML import/export functionality
 * 
 * @module rss
 */

// ===========================================
// State & Configuration
// ===========================================
const API_BASE = 'http://47.118.28.27'; // Aliyun Backend

let currentFeeds = [];
let currentArticles = [];
let activeFeedUrl = null;
let _rssInitialized = false;
let _rssInitializing = false;

// Cache key for feeds
const RSS_FEEDS_CACHE_KEY = 'rss_feeds_data';

// ===========================================
// Initialization
// ===========================================
// Only add event listener in browser environment
if (typeof document !== 'undefined') {
    // Strategy 1: DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[RSS] DOMContentLoaded fired');
            initRSS();
        });
    } else {
        // DOM is already ready, run immediately
        console.log('[RSS] DOM already ready, init immediately');
        initRSS();
    }
    
    // Strategy 2: window.onload as backup
    window.addEventListener('load', () => {
        console.log('[RSS] window.load fired, checking init status...');
        if (!_rssInitialized && !_rssInitializing) {
            console.log('[RSS] Not initialized yet, trying again...');
            initRSS();
        }
    });
    
    // Handle bfcache (Back-Forward Cache) - re-init when page is restored from cache
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            console.log('[RSS] Page restored from bfcache, re-initializing...');
            _rssInitialized = false;
            initRSS();
        }
    });
}

function initRSS() {
    console.log('[RSS] initRSS called, readyState:', document.readyState);
    
    // Prevent double initialization
    if (_rssInitialized) {
        console.log('[RSS] Already initialized, skipping');
        return;
    }
    
    if (_rssInitializing) {
        console.log('[RSS] Already initializing, skipping');
        return;
    }
    
    const feedListItems = document.getElementById('feed-list-items');
    console.log('[RSS] feed-list-items exists:', !!feedListItems);
    
    // Only run if we are on the RSS page
    if (!feedListItems) {
        console.log('[RSS] Not on RSS page, skipping init');
        return;
    }
    
    // Mark as initializing
    _rssInitializing = true;
    
    // Initial load of feeds with SWR caching
    loadFeedsWithCache().then(() => {
        _rssInitialized = true;
        _rssInitializing = false;
        console.log('[RSS] Initialization complete');
    }).catch((e) => {
        console.error('[RSS] Initialization failed:', e);
        _rssInitializing = false;
    });

    // Event Listeners
    setupEventListeners();
    
    // Check URL parameters for feed
    const params = new URLSearchParams(window.location.search);
    const feedUrl = params.get('feed');
    if (feedUrl) {
        // If feed param exists, try to load it after feeds are loaded
        // We'll handle this in renderFeedList
    } else {
        // Default to All Articles if no specific feed
        loadAllFeedsArticles();
    }
}

/**
 * Load feeds with stale-while-revalidate caching
 */
async function loadFeedsWithCache() {
    const container = document.getElementById('feed-list-items');
    if (!container) return;
    
    // Show loading immediately
    container.innerHTML = '<div class="px-4 py-8 text-center text-slate-400 text-sm">正在加载订阅源...</div>';
    
    const swr = window.swrCache;
    
    try {
        if (swr) {
            // Load with SWR
            const result = await swr.load(RSS_FEEDS_CACHE_KEY, fetchFeedsData, {
                onUpdate: (newData) => {
                    currentFeeds = newData;
                    renderFeedList(currentFeeds);
                    updateStats();
                }
            });
            
            currentFeeds = result.data || [];
        } else {
            // Fallback: direct fetch
            currentFeeds = await fetchFeedsData();
        }
        
        // Always render after loading (regardless of source)
        renderFeedList(currentFeeds);
        updateStats();
        
    } catch (e) {
        console.error('[RSS] Failed to load feeds:', e);
        container.innerHTML = `
            <div class="px-4 py-8 text-center">
                <p class="text-red-500 text-sm mb-2">加载失败</p>
                <button onclick="location.reload()" class="text-xs text-blue-600 underline">重试</button>
            </div>
        `;
    }
}

/**
 * Fetch feeds data (used by SWR cache)
 */
async function fetchFeedsData() {
    let feeds = [];
    
    try {
        // Determine API URL based on environment
        // Use full path with .php extension to avoid 404 if rewrite rules are missing
        const apiUrl = '/api/feeds.php';
            
        const response = await fetch(apiUrl);
        // Check if response is OK and content type is JSON (or text that looks like JSON)
        if (response.ok) {
            const text = await response.text();
            // If it starts with < (HTML/PHP source) or is empty, it's invalid
            if (text && !text.trim().startsWith('<')) {
                feeds = JSON.parse(text);
            }
        }
    } catch (e) {
        console.warn('[RSS] API fetch failed, trying static file:', e);
    }
    
    // If API failed or returned empty/invalid, try static file
    if (!Array.isArray(feeds) || feeds.length === 0) {
        console.log('[RSS] Falling back to static data');
        const staticResponse = await fetch('/public/data/feeds.json');
        if (!staticResponse.ok) throw new Error('Failed to load feeds data');
        feeds = await staticResponse.json();
    }
    
    return Array.isArray(feeds) ? feeds : [];
}

function setupEventListeners() {
    // All Articles button
    const allFeedsBtn = document.getElementById('all-feeds-btn');
    if (allFeedsBtn) {
        allFeedsBtn.addEventListener('click', loadAllFeedsArticles);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-feeds-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('animate-spin');
            loadFeeds().finally(() => {
                setTimeout(() => refreshBtn.classList.remove('animate-spin'), 500);
            });
        });
    }

    // Import/Export buttons
    const importBtn = document.getElementById('import-opml-btn');
    const exportBtn = document.getElementById('export-opml-btn');
    const fileInput = document.getElementById('opml-file-input');

    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleOPMLImport);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', handleOPMLExport);
    }
    
    // AI Settings Modal
    const settingsBtn = document.getElementById('settings-btn');
    const aiModal = document.getElementById('ai-settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const aiProviderSelect = document.getElementById('ai-provider');
    
    if (settingsBtn && aiModal) {
        settingsBtn.addEventListener('click', () => {
            aiModal.classList.remove('hidden');
            loadAISettings();
        });
    }
    
    if (closeSettingsBtn && aiModal) {
        closeSettingsBtn.addEventListener('click', () => {
            aiModal.classList.add('hidden');
        });
    }
    
    // Close modal on backdrop click
    if (aiModal) {
        aiModal.addEventListener('click', (e) => {
            if (e.target === aiModal) {
                aiModal.classList.add('hidden');
            }
        });
    }
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveAISettings);
    }
    
    // Provider change handler
    if (aiProviderSelect) {
        aiProviderSelect.addEventListener('change', updateProviderDefaults);
    }
    
    // Test connection button
    const testBtn = document.getElementById('test-connection-btn');
    if (testBtn) {
        testBtn.addEventListener('click', testAIConnection);
    }
}

// ===========================================
// Feed Management (API)
// ===========================================
async function loadFeeds() {
    const container = document.getElementById('feed-list-items');
    if (!container) return;

    container.innerHTML = '<div class="px-4 py-8 text-center text-slate-400 text-sm">正在加载订阅源...</div>';

    try {
        let feeds = [];
        try {
            const response = await fetch(API_BASE + '/api/feeds.php'); // Fixed extension and base
            // Check if response is OK and content type is JSON (or text that looks like JSON)
            if (response.ok) {
                const text = await response.text();
                // If it starts with < (HTML/PHP source) or is empty, it's invalid
                if (text && !text.trim().startsWith('<')) {
                    feeds = JSON.parse(text);
                }
            }
        } catch (e) {
            console.warn('[RSS] API fetch failed, trying static file:', e);
        }

        // If API failed or returned empty/invalid, try static file
        if (!Array.isArray(feeds) || feeds.length === 0) {
            console.log('[RSS] Falling back to static data');
            const staticResponse = await fetch('/public/data/feeds.json');
            if (!staticResponse.ok) throw new Error('Failed to load feeds data');
            feeds = await staticResponse.json();
        }

        currentFeeds = Array.isArray(feeds) ? feeds : [];
        
        renderFeedList(currentFeeds);
        
        // Update stats
        updateStats();

    } catch (e) {
        console.error('[RSS] Failed to load feeds:', e);
        container.innerHTML = `
            <div class="px-4 py-8 text-center">
                <p class="text-red-500 text-sm mb-2">加载失败</p>
                <button onclick="location.reload()" class="text-xs text-blue-600 underline">重试</button>
            </div>
        `;
    }
}

async function saveFeeds(feeds) {
    try {
        const adminToken = localStorage.getItem('admin_token') || '';
        const response = await fetch(API_BASE + '/api/feeds.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
            body: JSON.stringify(feeds)
        });
        
        if (!response.ok) throw new Error('Failed to save');
        return true;
    } catch (e) {
        console.error('[RSS] Save error:', e);
        alert('保存订阅失败: ' + e.message);
        return false;
    }
}

// ===========================================
// Feed Rendering
// ===========================================
function renderFeedList(feeds) {
    const container = document.getElementById('feed-list-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (feeds.length === 0) {
        container.innerHTML = `
            <div class="px-4 py-12 text-center text-slate-400">
                <i data-lucide="rss" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                <p class="text-sm">暂无订阅</p>
                <p class="text-xs mt-1">点击右上角导入 OPML</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Group by category
    const categories = {};
    feeds.forEach(feed => {
        // Normalize URL property (support both xmlUrl and url)
        feed.xmlUrl = feed.xmlUrl || feed.url;
        
        const cat = feed.category || '未分类';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(feed);
    });

    // Render groups
    Object.keys(categories).sort().forEach(cat => {
        const groupEl = document.createElement('div');
        groupEl.className = 'mb-2';
        
        const header = document.createElement('div');
        header.className = 'px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center';
        header.innerHTML = `<span>${cat}</span>`;
        groupEl.appendChild(header);

        const list = document.createElement('div');
        list.className = 'space-y-0.5';
        
        categories[cat].forEach(feed => {
            const item = document.createElement('button');
            item.className = `w-full text-left px-4 py-2 flex items-center space-x-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${activeFeedUrl === feed.xmlUrl ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`;
            item.onclick = () => loadFeedArticles(feed);
            
            // Icon based on title first letter
            const letter = (feed.title || '?')[0].toUpperCase();
            
            item.innerHTML = `
                <div class="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                    ${letter}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">${feed.title}</div>
                    <div class="text-xs text-slate-500 truncate opacity-0 group-hover:opacity-100 transition-opacity">${feed.xmlUrl}</div>
                </div>
            `;
            list.appendChild(item);
        });
        
        groupEl.appendChild(list);
        container.appendChild(groupEl);
    });
}

function updateStats() {
    const countEl = document.getElementById('sub-count');
    if (countEl) countEl.textContent = currentFeeds.length;
}

// ===========================================
// Article Fetching & Parsing
// ===========================================
async function loadFeedArticles(feed) {
    activeFeedUrl = feed.xmlUrl;
    renderFeedList(currentFeeds); // Re-render to highlight active

    const container = document.getElementById('article-list');
    const contentArea = document.getElementById('article-content');
    
    // Mobile view switch
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 1024) {
        sidebar.classList.add('-translate-x-full'); // Hide sidebar
    }

    if (container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-slate-400">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p>正在获取文章...</p>
            </div>
        `;
    }
    
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400">
                <i data-lucide="book-open" class="w-12 h-12 mb-4 opacity-20"></i>
                <p>选择文章开始阅读</p>
            </div>
        `;
        lucide.createIcons();
    }

    try {
        // Try proxy first to avoid CORS
        let xmlText = '';
        try {
            // Use public CORS proxy if PHP proxy fails or is unavailable
            // Strategy: 
            // 1. Try local PHP proxy (for best privacy/performance if available)
            // 2. Fallback to 'api.allorigins.win' (Public CORS proxy)
            
            const proxyUrl = `/api/rss-proxy.php?url=${encodeURIComponent(feed.xmlUrl)}`;
            const response = await fetch(proxyUrl);
            
            let usePublicProxy = false;
            
            if (response.ok) {
                const text = await response.text();
                // Check if it's PHP source code (server not executing PHP)
                if (text.includes('<?php') || text.trim().startsWith('<?=')) {
                    console.warn('[RSS] PHP not supported on this server. Switching to public CORS proxy.');
                    usePublicProxy = true;
                } else {
                    xmlText = text;
                }
            } else if (response.status === 503 || response.status === 429) {
                 // Server overloaded, try public proxy
                 usePublicProxy = true;
            } else {
                // Other errors (404, 500), try public proxy as backup
                usePublicProxy = true;
            }

            if (usePublicProxy) {
                // Public Proxy Fallback
                const publicProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.xmlUrl)}`;
                const ppResponse = await fetch(publicProxyUrl);
                if (!ppResponse.ok) throw new Error(`Public proxy HTTP ${ppResponse.status}`);
                xmlText = await ppResponse.text();
            }

        } catch (e) {
            console.warn('[RSS] Proxy fetch failed, attempting direct fetch (CORS might block):', e);
            // Fallback to direct fetch
            const directResponse = await fetch(feed.xmlUrl);
            if (!directResponse.ok) throw new Error(`Direct fetch HTTP ${directResponse.status}`);
            xmlText = await directResponse.text();
        }

        const articles = parseRSSContent(xmlText);
        
        currentArticles = articles;
        renderArticleList(articles, feed.title);
        
    } catch (e) {
        console.error('[RSS] Failed to load articles:', e);
        if (container) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-64 text-red-500">
                    <i data-lucide="alert-circle" class="w-8 h-8 mb-2"></i>
                    <p>无法加载内容</p>
                    <p class="text-xs text-slate-400 mt-1">${e.message}</p>
                </div>
            `;
            lucide.createIcons();
        }
    }
}

function parseRSSContent(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "text/xml");
    
    const items = Array.from(doc.querySelectorAll("item, entry"));
    
    return items.map(item => {
        const title = getTagValue(item, "title");
        const link = getTagValue(item, "link");
        const pubDate = getTagValue(item, "pubDate") || getTagValue(item, "updated") || getTagValue(item, "dc:date");
        const description = getTagValue(item, "description") || getTagValue(item, "content") || getTagValue(item, "summary");
        
        // Improved content extraction
        let fullContent = getTagValue(item, "content:encoded");
        if (!fullContent) fullContent = getTagValue(item, "content"); // Atom content
        if (!fullContent) fullContent = description;
        
        const author = getTagValue(item, "author") || getTagValue(item, "dc:creator");
        
        return {
            title,
            link,
            pubDate: pubDate ? new Date(pubDate) : new Date(),
            description: cleanHtml(description),
            content: fullContent, // Keep full content for reading
            author
        };
    });
}

function getTagValue(node, tagName) {
    // Handle namespaced tags (e.g. content:encoded)
    if (tagName.includes(':')) {
        const [prefix, localName] = tagName.split(':');
        
        // 1. Try standard getElementsByTagName (works if exact match)
        let els = node.getElementsByTagName(tagName);
        if (els.length > 0) return els[0].textContent;

        // 2. Try getElementsByTagNameNS with wildcard namespace
        els = node.getElementsByTagNameNS("*", localName);
        if (els.length > 0) return els[0].textContent;
        
        // 3. Try with just the local name (fallback for some parsers)
        els = node.getElementsByTagName(localName);
        if (els.length > 0) return els[0].textContent;
        
        // 4. Try querySelector with escaped colon
        try {
            const escaped = tagName.replace(':', '\\:');
            const el = node.querySelector(escaped);
            if (el) return el.textContent;
        } catch (e) {
            // ignore
        }
    } else {
        // Standard tags
        const el = node.querySelector(tagName);
        return el ? el.textContent : "";
    }
    return "";
}

function cleanHtml(html) {
    if (!html) return "";
    // Simple strip tags for preview
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

// ===========================================
// Article List Rendering
// ===========================================
function renderArticleList(articles, feedTitle) {
    const container = document.getElementById('article-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Header
    const header = document.createElement('div');
    header.className = 'sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 p-4';
    header.innerHTML = `
        <h2 class="text-lg font-bold text-slate-900 dark:text-white truncate">${feedTitle}</h2>
        <p class="text-xs text-slate-500">${articles.length} 篇文章</p>
    `;
    container.appendChild(header);

    const list = document.createElement('div');
    list.className = 'divide-y divide-slate-100 dark:divide-slate-800';
    
    articles.forEach((article, index) => {
        const item = document.createElement('article');
        item.className = 'p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group';
        item.onclick = () => openArticle(index);
        
        const dateStr = article.pubDate.toLocaleDateString() + ' ' + article.pubDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        item.innerHTML = `
            <h3 class="font-medium text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">${article.title}</h3>
            <div class="flex items-center text-xs text-slate-400 mb-2 space-x-2">
                <span>${dateStr}</span>
                ${article.author ? `<span>• ${article.author}</span>` : ''}
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">${article.description.substring(0, 100)}...</p>
        `;
        list.appendChild(item);
    });
    
    container.appendChild(list);
}

function openArticle(index) {
    const article = currentArticles[index];
    if (!article) return;
    
    const container = document.getElementById('article-content');
    if (!container) return;
    
    // For mobile: show content layer if needed (depends on layout)
    // Assuming simple layout for now
    
    // Sanitize content if DOMPurify is available
    const safeContent = window.DOMPurify ? DOMPurify.sanitize(article.content) : article.content;
    
    const dateStr = article.pubDate.toLocaleString();
    
    container.innerHTML = `
        <article class="max-w-3xl mx-auto px-4 py-8 sm:px-8">
            <header class="mb-8 border-b border-slate-200 dark:border-slate-800 pb-8">
                <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">${article.title}</h1>
                <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <div class="flex items-center">
                        <i data-lucide="calendar" class="w-4 h-4 mr-1.5"></i>
                        ${dateStr}
                    </div>
                    ${article.author ? `
                    <div class="flex items-center">
                        <i data-lucide="user" class="w-4 h-4 mr-1.5"></i>
                        ${article.author}
                    </div>` : ''}
                    <a href="${article.link}" target="_blank" rel="noopener" class="flex items-center text-blue-600 hover:text-blue-700 hover:underline">
                        <i data-lucide="external-link" class="w-4 h-4 mr-1.5"></i>
                        原文链接
                    </a>
                    <button id="translate-btn" class="flex items-center text-purple-600 hover:text-purple-700">
                        <i data-lucide="languages" class="w-4 h-4 mr-1.5"></i>
                        翻译文章
                    </button>
                </div>
            </header>
            
            <div class="prose prose-slate dark:prose-invert max-w-none">
                ${safeContent}
            </div>
        </article>
    `;
    
    lucide.createIcons();

    document.getElementById('translate-btn').addEventListener('click', async () => {
        try {
            const translated = await translateArticle(article.content);
            if (translated) {
                document.querySelector('.prose').innerHTML = translated;
            }
        } catch (e) {
            alert('翻译失败: ' + e.message);
        }
    });
    
    // Scroll to top
    container.scrollTop = 0;
}

// ===========================================
// AI Translation Functions
// ===========================================

async function translateArticle(content) {
    const provider = localStorage.getItem('ai-provider') || 'openai';
    const baseUrl = localStorage.getItem('ai-base-url') || getDefaultBaseUrl(provider);
    const apiKey = localStorage.getItem('ai-api-key');
    const model = localStorage.getItem('ai-model') || getDefaultModel(provider);
    const systemPrompt = localStorage.getItem('ai-system-prompt') || 'You are a helpful translator. Translate the following content to Simplified Chinese.';
    
    if (!apiKey) {
        throw new Error('API Key 未设置');
    }
    
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
    ];
    
    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.7
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (e) {
        throw new Error(e.message);
    }
}

function getDefaultBaseUrl(provider) {
    switch (provider) {
        case 'openai': return 'https://api.openai.com/v1';
        case 'deepseek': return 'https://api.deepseek.com/v1';
        case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta';
        case 'doubao': return 'https://ark.cn-beijing.volces.com/api/v3';
        case 'custom': return localStorage.getItem('ai-base-url') || '';
        default: return '';
    }
}

function getDefaultModel(provider) {
    switch (provider) {
        case 'openai': return 'gpt-3.5-turbo';
        case 'deepseek': return 'deepseek-chat';
        case 'gemini': return 'gemini-pro';
        case 'doubao': return 'doubao-pro-32k';
        case 'custom': return localStorage.getItem('ai-model') || '';
        default: return '';
    }
}

// ===========================================
// OPML Import/Export
// ===========================================

async function handleOPMLImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const newFeeds = parseOPML(text);
        
        if (newFeeds.length === 0) {
            alert('无法解析 OPML 文件');
            return;
        }
        
        if (confirm(`解析到 ${newFeeds.length} 个订阅源，确定要导入吗？这会覆盖现有订阅。`)) {
            const success = await saveFeeds(newFeeds);
            if (success) {
                currentFeeds = newFeeds;
                renderFeedList(currentFeeds);
                alert('导入成功！');
            }
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

function handleOPMLExport() {
    if (currentFeeds.length === 0) {
        alert('没有可导出的订阅');
        return;
    }
    
    const opml = generateOPML(currentFeeds);
    const blob = new Blob([opml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions_${new Date().toISOString().split('T')[0]}.opml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parse OPML string to feed array
 * @param {string} opmlString - OPML XML string
 * @returns {Array<{title: string, xmlUrl: string, htmlUrl?: string, category?: string}>}
 */
function parseOPML(opmlString) {
    if (!opmlString || typeof opmlString !== 'string') return [];
    
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(opmlString, 'text/xml');
        
        // Check for parse errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            console.error('[RSS] OPML parse error:', parseError.textContent);
            return [];
        }
        
        const feeds = [];
        const outlines = doc.querySelectorAll('outline[xmlUrl], outline[xmlurl]');
        
        outlines.forEach(outline => {
            const xmlUrl = outline.getAttribute('xmlUrl') || outline.getAttribute('xmlurl');
            if (!xmlUrl) return;
            
            // Get category from parent outline if exists
            let category = '';
            const parent = outline.parentElement;
            if (parent && parent.tagName === 'outline' && !parent.getAttribute('xmlUrl')) {
                category = parent.getAttribute('text') || parent.getAttribute('title') || '';
            }
            
            feeds.push({
                title: outline.getAttribute('text') || outline.getAttribute('title') || xmlUrl,
                xmlUrl: xmlUrl,
                htmlUrl: outline.getAttribute('htmlUrl') || outline.getAttribute('htmlurl') || '',
                category: category
            });
        });
        
        return feeds;
    } catch (e) {
        console.error('[RSS] OPML parse error:', e);
        return [];
    }
}

/**
 * Generate OPML string from feed array
 * @param {Array<{title: string, xmlUrl: string, htmlUrl?: string, category?: string}>} feeds
 * @returns {string} - OPML XML string
 */
function generateOPML(feeds) {
    if (!Array.isArray(feeds)) return '';
    
    const now = new Date().toUTCString();
    
    // Group feeds by category
    const categories = new Map();
    feeds.forEach(feed => {
        const cat = feed.category || '';
        if (!categories.has(cat)) {
            categories.set(cat, []);
        }
        categories.get(cat).push(feed);
    });
    
    let body = '';
    
    function escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }
    
    categories.forEach((categoryFeeds, category) => {
        if (category) {
            body += `    <outline text="${escapeXml(category)}">\n`;
            categoryFeeds.forEach(feed => {
                body += `      <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.xmlUrl)}"${feed.htmlUrl ? ` htmlUrl="${escapeXml(feed.htmlUrl)}"` : ''}/>\n`;
            });
            body += `    </outline>\n`;
        } else {
            categoryFeeds.forEach(feed => {
                body += `    <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.xmlUrl)}"${feed.htmlUrl ? ` htmlUrl="${escapeXml(feed.htmlUrl)}"` : ''}/>\n`;
            });
        }
    });
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RSS Subscriptions</title>
    <dateCreated>${now}</dateCreated>
  </head>
  <body>
${body}  </body>
</opml>`;
}

// ===========================================
// Module Exports
// ===========================================

async function loadAllFeedsArticles() {
    activeFeedUrl = 'all';
    renderFeedList(currentFeeds); // Re-render to highlight active

    const container = document.getElementById('article-list');
    const contentArea = document.getElementById('article-content');
    
    // UI Setup (Loading state)
    if (container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-slate-400">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p>正在聚合所有文章...</p>
                <p class="text-xs mt-2 text-slate-500" id="loading-progress">0/${currentFeeds.length}</p>
            </div>
        `;
    }

    if (contentArea) {
         contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400">
                <i data-lucide="book-open" class="w-12 h-12 mb-4 opacity-20"></i>
                <p>选择文章开始阅读</p>
            </div>
        `;
        lucide.createIcons();
    }

    let allArticles = [];
    let completed = 0;
    const progressEl = document.getElementById('loading-progress');

    // Limit concurrency
    const CONCURRENCY_LIMIT = 5;
    const queue = [...currentFeeds];
    
    const worker = async () => {
        while (queue.length > 0) {
            const feed = queue.shift();
            try {
                const xmlText = await fetchFeedXml(feed.xmlUrl);
                const articles = parseRSSContent(xmlText);
                
                // Add feed title to articles for display
                articles.forEach(a => a.feedTitle = feed.title);
                
                allArticles = allArticles.concat(articles);
            } catch (e) {
                console.warn(`Failed to load feed ${feed.title}:`, e);
            } finally {
                completed++;
                if (progressEl) progressEl.textContent = `${completed}/${currentFeeds.length}`;
            }
        }
    };

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, currentFeeds.length); i++) {
        workers.push(worker());
    }
    
    await Promise.all(workers);

    // Sort by date desc
    allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    currentArticles = allArticles;
    renderArticleList(allArticles, "全部文章");
}

async function fetchFeedXml(url) {
    let xmlText = '';
    try {
        const proxyUrl = `/api/rss-proxy.php?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        let usePublicProxy = false;
        
        if (response.ok) {
            const text = await response.text();
            if (text.includes('<?php') || text.trim().startsWith('<?=')) {
                usePublicProxy = true;
            } else {
                xmlText = text;
            }
        } else {
            usePublicProxy = true;
        }

        if (usePublicProxy) {
            const publicProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const ppResponse = await fetch(publicProxyUrl);
            if (!ppResponse.ok) throw new Error(`Public proxy HTTP ${ppResponse.status}`);
            xmlText = await ppResponse.text();
        }
    } catch (e) {
        // Direct fallback
        const directResponse = await fetch(url);
        if (!directResponse.ok) throw new Error(`Direct fetch HTTP ${directResponse.status}`);
        xmlText = await directResponse.text();
    }
    return xmlText;
}
// ===========================================

/**
 * Escape XML special characters
 * @param {string} unsafe - String to escape
 * @returns {string} - Escaped string
 */
function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

// Export for ES modules and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseOPML,
        generateOPML,
        escapeXml
    };
}

// ===========================================
// AI Settings Functions
// ===========================================

const AI_PROVIDERS = {
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        help: '使用 OpenAI 官方 API'
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-coder'],
        help: '国产大模型，性价比高'
    },
    gemini: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        models: ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        help: '使用 Google AI Studio API Key'
    },
    doubao: {
        name: '豆包',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        models: ['doubao-pro-32k', 'doubao-lite-32k'],
        help: '字节跳动豆包大模型'
    },
    custom: {
        name: '自定义',
        baseUrl: '',
        models: [],
        help: '填写兼容 OpenAI API 的服务地址'
    }
};

function loadAISettings() {
    const settings = JSON.parse(localStorage.getItem('ai_settings') || '{}');
    
    const providerSelect = document.getElementById('ai-provider');
    const baseUrlInput = document.getElementById('ai-base-url');
    const apiKeyInput = document.getElementById('ai-api-key');
    const modelInput = document.getElementById('ai-model');
    const systemPromptInput = document.getElementById('ai-system-prompt');
    
    if (providerSelect) providerSelect.value = settings.provider || 'openai';
    if (baseUrlInput) baseUrlInput.value = settings.baseUrl || AI_PROVIDERS.openai.baseUrl;
    if (apiKeyInput) apiKeyInput.value = settings.apiKey || '';
    if (modelInput) modelInput.value = settings.model || 'gpt-4o-mini';
    if (systemPromptInput) systemPromptInput.value = settings.systemPrompt || '你是一个专业的翻译助手，请将以下内容翻译成简体中文，保持原文格式和语气。';
    
    updateProviderDefaults();
}

function updateProviderDefaults() {
    const providerSelect = document.getElementById('ai-provider');
    const baseUrlInput = document.getElementById('ai-base-url');
    const modelInput = document.getElementById('ai-model');
    const modelPresets = document.getElementById('model-presets');
    const modelHelp = document.getElementById('model-help');
    const apiKeyHelp = document.getElementById('api-key-help');
    
    if (!providerSelect) return;
    
    const provider = AI_PROVIDERS[providerSelect.value];
    if (!provider) return;
    
    // Update base URL if not custom
    if (providerSelect.value !== 'custom' && baseUrlInput) {
        baseUrlInput.value = provider.baseUrl;
    }
    
    // Update model presets
    if (modelPresets) {
        modelPresets.innerHTML = provider.models.map(m => `<option value="${m}">`).join('');
    }
    
    // Update help text
    if (modelHelp) {
        modelHelp.textContent = provider.help;
    }
    
    // Show/hide doubao specific help
    if (apiKeyHelp) {
        apiKeyHelp.classList.toggle('hidden', providerSelect.value !== 'doubao');
    }
    
    // Set default model if empty
    if (modelInput && !modelInput.value && provider.models.length > 0) {
        modelInput.value = provider.models[0];
    }
}

function saveAISettings() {
    const settings = {
        provider: document.getElementById('ai-provider')?.value || 'openai',
        baseUrl: document.getElementById('ai-base-url')?.value || '',
        apiKey: document.getElementById('ai-api-key')?.value || '',
        model: document.getElementById('ai-model')?.value || '',
        systemPrompt: document.getElementById('ai-system-prompt')?.value || ''
    };
    
    localStorage.setItem('ai_settings', JSON.stringify(settings));
    
    const modal = document.getElementById('ai-settings-modal');
    if (modal) modal.classList.add('hidden');
    
    // Show success toast if available
    if (window.showToast) {
        window.showToast('AI 设置已保存', 'success');
    } else {
        alert('设置已保存');
    }
}

async function testAIConnection() {
    const testBtn = document.getElementById('test-connection-btn');
    if (!testBtn) return;
    
    const originalText = testBtn.innerHTML;
    testBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-1.5 animate-spin"></i>测试中...';
    testBtn.disabled = true;
    
    try {
        const baseUrl = document.getElementById('ai-base-url')?.value;
        const apiKey = document.getElementById('ai-api-key')?.value;
        const model = document.getElementById('ai-model')?.value;
        
        if (!baseUrl || !apiKey || !model) {
            throw new Error('请填写完整的配置信息');
        }
        
        // Simple test request
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API 错误: ${response.status} - ${error.substring(0, 100)}`);
        }
        
        alert('✅ 连接成功！API 配置正确。');
    } catch (e) {
        alert('❌ 连接失败: ' + e.message);
    } finally {
        testBtn.innerHTML = originalText;
        testBtn.disabled = false;
        if (window.lucide) lucide.createIcons();
    }
}

// Global exports for browser
if (typeof window !== 'undefined') {
    window.parseOPML = parseOPML;
    window.generateOPML = generateOPML;
    window.escapeXml = escapeXml;
}
