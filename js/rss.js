/**
 * RSS/OPML Module
 * Provides RSS feed reading and OPML import/export functionality
 * 
 * @module rss
 */

// ===========================================
// State & Configuration
// ===========================================
// API_BASE is now provided by api.js
// const API_BASE = 'http://47.118.28.27'; // Aliyun Backend

let currentFeeds = [];
let currentArticles = [];
let activeFeedUrl = null;
let _rssInitialized = false;
let _rssInitializing = false;
let _rssInitialFeedHandled = false;

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
        window._rssInitialFeedUrl = feedUrl;
        _rssInitialFeedHandled = false;
    } else {
        // Default to All Articles if no specific feed
        window._rssInitialFeedUrl = null;
        _rssInitialFeedHandled = false;
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
    container.innerHTML = '<div class="rs-empty-loading"><i data-lucide="loader-2"></i><p>正在加载订阅源…</p></div>';
    lucide.createIcons();
    
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
            <div class="rs-empty-state">
                <div class="rs-empty-icon">
                    <i data-lucide="alert-circle"></i>
                </div>
                <h3>加载失败</h3>
                <button onclick="location.reload()" class="rs-btn rs-btn--primary" style="margin-top:8px">重试</button>
            </div>
        `;
        lucide.createIcons();
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

    container.innerHTML = '<div class="rs-empty-loading"><i data-lucide="loader-2"></i><p>正在加载订阅源…</p></div>';
    lucide.createIcons();

    try {
        let feeds = [];
        try {
            // Use API_CONFIG if available, otherwise relative path
            const baseUrl = (typeof window.API_CONFIG !== 'undefined' && window.API_CONFIG.baseUrl) 
                ? window.API_CONFIG.baseUrl 
                : '/api';
                
            const response = await fetch(baseUrl + '/feeds.php'); // Fixed extension and base
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
                <div class="rs-empty-state">
                    <div class="rs-empty-icon">
                        <i data-lucide="alert-circle"></i>
                    </div>
                    <h3>加载失败</h3>
                    <button onclick="location.reload()" class="rs-btn rs-btn--primary" style="margin-top:8px">重试</button>
                </div>
            `;
            lucide.createIcons();
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
            <div class="rs-empty-state">
                <div class="rs-empty-icon">
                    <i data-lucide="rss"></i>
                </div>
                <h3>暂无订阅</h3>
                <p>请联系管理员添加订阅源</p>
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

        const header = document.createElement('div');
        header.className = 'rs-feed-cat-header';
        header.textContent = cat;
        groupEl.appendChild(header);

        categories[cat].forEach(feed => {
            const item = document.createElement('button');
            const isActive = activeFeedUrl === feed.xmlUrl;

            item.className = 'rs-feed-item' + (isActive ? ' rs-feed-item--active' : '');
            item.onclick = () => loadFeedArticles(feed);

            // Icon based on title first letter
            const letter = (feed.title || '?')[0].toUpperCase();

            item.innerHTML = `
                <div class="rs-feed-icon">${letter}</div>
                <div class="rs-feed-info">
                    <div class="rs-feed-title">${feed.title}</div>
                    <div class="rs-feed-url">${feed.xmlUrl}</div>
                </div>
                <div class="rs-feed-dot"></div>
            `;
            groupEl.appendChild(item);
        });

        container.appendChild(groupEl);
    });

    const initialFeedUrl = window._rssInitialFeedUrl;
    if (initialFeedUrl && !_rssInitialFeedHandled) {
        _rssInitialFeedHandled = true;
        let normalized = initialFeedUrl;
        try {
            normalized = decodeURIComponent(initialFeedUrl);
        } catch (e) {}
        normalized = normalized.trim();

        if (normalized === 'all') {
            loadAllFeedsArticles();
            return;
        }

        const targetFeed = feeds.find(feed => (feed.xmlUrl || feed.url) === normalized);
        if (targetFeed) {
            loadFeedArticles(targetFeed);
        } else {
            loadAllFeedsArticles();
        }
    }
}

function updateStats() {
    const countEl = document.getElementById('sub-count');
    if (countEl) countEl.textContent = currentFeeds.length;

    // Update category count
    const catCountEl = document.getElementById('cat-count');
    if (catCountEl) {
        const categories = new Set(currentFeeds.map(f => f.category || '未分类'));
        catCountEl.textContent = categories.size;
    }

    // Update last refreshed time
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        lastUpdatedEl.textContent = timeStr;
    }
}

// ===========================================
// Article Fetching & Parsing
// ===========================================
async function loadFeedArticles(feed) {
    activeFeedUrl = feed.xmlUrl;
    renderFeedList(currentFeeds); // Re-render to highlight active

    const container = document.getElementById('article-list');
    const contentArea = document.getElementById('article-content');
    
    // Mobile: auto-switch to inbox panel
    if (window.innerWidth <= 768 && window.rssMobile) {
        window.rssMobile.showPanel('rss-inbox');
    }

    if (container) {
        container.innerHTML = `
            <div class="rs-empty-loading">
                <i data-lucide="loader-2"></i>
                <p>正在获取文章…</p>
            </div>
        `;
        lucide.createIcons();
    }

    if (contentArea) {
        contentArea.innerHTML = `
            <div class="rs-empty-state">
                <div class="rs-empty-icon">
                    <i data-lucide="book-open"></i>
                </div>
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
                <div class="rs-empty-state">
                    <div class="rs-empty-icon">
                        <i data-lucide="alert-circle"></i>
                    </div>
                    <h3>无法加载内容</h3>
                    <p>${e.message}</p>
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

    // Also update feed title in inbox header
    const feedTitleEl = document.getElementById('feed-title');
    if (feedTitleEl) feedTitleEl.textContent = feedTitle;

    // Update article count badge
    const countEl = document.getElementById('article-count');
    if (countEl) {
        countEl.textContent = articles.length + ' 篇';
        countEl.style.display = 'inline-block';
    }

    articles.forEach((article, index) => {
        const item = document.createElement('article');
        item.className = 'rs-card';
        item.onclick = () => openArticle(index);

        const dateStr = article.pubDate.toLocaleDateString();
        const timeStr = article.pubDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const sourceLabel = article.feedTitle || feedTitle;

        item.innerHTML = `
            <span class="rs-card-source">${sourceLabel}</span>
            <h3 class="rs-card-title">${article.title}</h3>
            <p class="rs-card-desc">${article.description ? article.description.substring(0, 120) + '…' : '暂无描述'}</p>
            <div class="rs-card-meta">
                <span class="rs-card-date">
                    <i data-lucide="calendar" style="width:12px;height:12px"></i>
                    ${dateStr} ${timeStr}
                </span>
                ${article.author ? `<span class="rs-card-author">${article.author}</span>` : ''}
            </div>
        `;
        container.appendChild(item);
    });

    lucide.createIcons();
}

function openArticle(index) {
    const article = currentArticles[index];
    if (!article) return;

    const container = document.getElementById('article-content');
    if (!container) return;

    // Mobile: auto-switch to reader panel
    if (window.innerWidth <= 768 && window.rssMobile) {
        window.rssMobile.showReader();
    }

    // Mark active card in list
    const cards = document.querySelectorAll('.rs-card');
    cards.forEach((c, i) => c.classList.toggle('rs-card--active', i === index));

    // Sanitize content if DOMPurify is available
    const safeContent = window.DOMPurify ? DOMPurify.sanitize(article.content) : article.content;
    const dateStr = article.pubDate.toLocaleString();

    container.innerHTML = `
        <article class="rs-article">
            <header class="rs-article-header">
                <h1>${article.title}</h1>

                <div class="rs-article-meta">
                    <span class="rs-meta-pill">
                        <i data-lucide="calendar"></i>
                        ${dateStr}
                    </span>

                    ${article.author ? `
                    <span class="rs-meta-pill">
                        <i data-lucide="user"></i>
                        ${article.author}
                    </span>` : ''}

                    <a href="${article.link}" target="_blank" rel="noopener" class="rs-meta-pill rs-meta-pill--link">
                        <i data-lucide="external-link"></i>
                        原文
                    </a>

                    <button id="translate-btn" class="rs-meta-pill rs-meta-pill--action">
                        <i data-lucide="languages"></i>
                        AI 翻译
                    </button>
                </div>
            </header>

            <div class="rs-article-body">
                ${safeContent}
            </div>

            <div class="rs-article-end">
                <p>— 完 —</p>
            </div>
        </article>
    `;

    lucide.createIcons();

    // Translate button
    const translateBtn = document.getElementById('translate-btn');
    if (translateBtn) {
        translateBtn.addEventListener('click', async () => {
            try {
                const translated = await translateArticle(article.content);
                if (translated) {
                    const body = container.querySelector('.rs-article-body');
                    if (body) body.innerHTML = translated;
                }
            } catch (e) {
                alert('翻译失败: ' + e.message);
            }
        });
    }

    // Reading progress bar
    const progressBar = document.getElementById('reading-progress');
    if (progressBar) {
        // Remove old listener by cloning
        const newContainer = container;
        newContainer._scrollHandler = () => {
            const scrollTop = newContainer.scrollTop;
            const scrollHeight = newContainer.scrollHeight - newContainer.clientHeight;
            const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            progressBar.style.width = progress + '%';
        };
        newContainer.addEventListener('scroll', newContainer._scrollHandler, { passive: true });
        // Reset progress
        progressBar.style.width = '0%';
    }

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

// OPML Import/Export functionality removed per admin-only policy


// ===========================================
// Module Exports
// ===========================================

async function loadAllFeedsArticles() {
    activeFeedUrl = 'all';
    renderFeedList(currentFeeds); // Re-render to highlight active

    // Mobile: auto-switch to inbox panel
    if (window.innerWidth <= 768 && window.rssMobile) {
        window.rssMobile.showPanel('rss-inbox');
    }

    const container = document.getElementById('article-list');
    const contentArea = document.getElementById('article-content');

    // UI Setup (Loading state)
    if (container) {
        container.innerHTML = `
            <div class="rs-empty-loading">
                <i data-lucide="loader-2"></i>
                <p>正在聚合所有文章…</p>
                <p class="rs-loading-text" id="loading-progress">0/${currentFeeds.length}</p>
            </div>
        `;
        lucide.createIcons();
    }

    if (contentArea) {
         contentArea.innerHTML = `
            <div class="rs-empty-state">
                <div class="rs-empty-icon">
                    <i data-lucide="book-open"></i>
                </div>
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
    window.escapeXml = escapeXml;
}
