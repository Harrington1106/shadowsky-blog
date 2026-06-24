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

// ===========================================
// Helper Utilities
// ===========================================

/**
 * 估算阅读时间（中文约 400 字/分钟，英文约 200 词/分钟）
 * @param {string} htmlContent - HTML 内容
 * @returns {string} 格式化的阅读时间，如 "3 分钟"
 */
function getReadingTime(htmlContent) {
    if (!htmlContent) return '1 分钟';
    // 去除 HTML 标签
    const text = htmlContent.replace(/<[^>]*>/g, '');
    // 中文字符计数
    const chineseChars = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
    // 英文单词计数
    const words = text.replace(/[一-鿿㐀-䶿]/g, '').match(/\b\w+\b/g) || [];
    // 中文 400 字/分钟，英文 200 词/分钟
    const minutes = Math.ceil(chineseChars / 400 + words.length / 200);
    return minutes > 0 ? minutes + ' 分钟' : '1 分钟';
}

/**
 * 相对时间格式化
 * @param {Date|string} date - 日期
 * @returns {string} 如 "3小时前"、"昨天"、"6月15日"
 */
function getRelativeTime(date) {
    const now = new Date();
    const d = date instanceof Date ? date : new Date(date);
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
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
    if (d.getFullYear() === now.getFullYear()) {
        return month + '月' + day + '日';
    }
    return d.getFullYear() + '年' + month + '月' + day + '日';
}

/**
 * 获取/设置阅读器字号偏好
 */
function getFontSizePreference() {
    return localStorage.getItem('rs-font-size') || 'md';
}

function setFontSizePreference(size) {
    localStorage.setItem('rs-font-size', size);
}

// ===========================================
// Event Listeners
// ===========================================

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

    // Provider card selection
    document.querySelectorAll('.rs-provider-card').forEach(card => {
        card.addEventListener('click', () => {
            const provider = card.dataset.provider;
            if (!provider) return;
            document.querySelectorAll('.rs-provider-card').forEach(c => c.classList.remove('rs-provider-card--active'));
            card.classList.add('rs-provider-card--active');
            if (aiProviderSelect) {
                aiProviderSelect.value = provider;
                aiProviderSelect.dispatchEvent(new Event('change'));
            }
        });
    });

    // API Key eye toggle
    const toggleKeyBtn = document.getElementById('toggle-key-vis');
    const apiKeyInput = document.getElementById('ai-api-key');
    if (toggleKeyBtn && apiKeyInput) {
        toggleKeyBtn.addEventListener('click', () => {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            const icon = toggleKeyBtn.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', isPassword ? 'eye' : 'eye-off');
            lucide.createIcons();
        });
    }

    // System prompt character count
    const promptInput = document.getElementById('ai-system-prompt');
    const charCount = document.getElementById('prompt-char-count');
    if (promptInput && charCount) {
        const updateCount = () => { charCount.textContent = promptInput.value.length; };
        promptInput.addEventListener('input', updateCount);
        updateCount();
    }

    // Prompt preset pills
    document.querySelectorAll('.rs-preset-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const prompt = pill.dataset.prompt;
            if (prompt && promptInput) {
                promptInput.value = prompt;
                promptInput.dispatchEvent(new Event('input'));
            }
        });
    });
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

        const relativeTime = getRelativeTime(article.pubDate);
        const readingTime = getReadingTime(article.content || article.description || '');
        const sourceLabel = article.feedTitle || feedTitle;
        const desc = article.description ? article.description.substring(0, 120).trim() + '…' : '暂无描述';

        item.innerHTML = `
            <span class="rs-card-source">${sourceLabel}</span>
            <h3 class="rs-card-title">${article.title}</h3>
            <p class="rs-card-desc">${desc}</p>
            <div class="rs-card-meta">
                <span class="rs-card-date">
                    <i data-lucide="clock" style="width:11px;height:11px"></i>
                    ${relativeTime}
                </span>
                <span class="rs-card-read-time">
                    <i data-lucide="book-open" style="width:10px;height:10px"></i>
                    ${readingTime}
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
    const relativeTime = getRelativeTime(article.pubDate);
    const readingTime = getReadingTime(article.content || article.description || '');
    const fontSize = getFontSizePreference();

    container.innerHTML = `
        <article class="rs-article">
            <header class="rs-article-header">
                <h1>${article.title}</h1>

                <div class="rs-article-meta">
                    <span class="rs-meta-pill">
                        <i data-lucide="calendar"></i>
                        <span title="${dateStr}">${relativeTime}</span>
                    </span>

                    <span class="rs-meta-pill rs-meta-pill--read-time">
                        <i data-lucide="clock"></i>
                        ${readingTime}
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

                    <button id="full-article-btn" class="rs-meta-pill rs-meta-pill--action" title="通过服务器加载完整文章">
                        <i data-lucide="scroll-text"></i>
                        加载全文
                    </button>

                    <button id="share-btn" class="rs-meta-pill rs-meta-pill--action" title="分享这篇文章">
                        <i data-lucide="share-2"></i>
                        分享
                    </button>

                    <button id="translate-btn" class="rs-meta-pill rs-meta-pill--action">
                        <i data-lucide="languages"></i>
                        翻译
                    </button>

                    <span class="rs-reader-toolbar">
                        <span style="font-size:0.7rem;color:var(--rs-text-dim);margin-right:2px">字号</span>
                        <button class="rs-font-btn${fontSize === 'sm' ? ' rs-font-btn--active' : ''}" data-font="sm" title="小号字体" aria-label="小号字体">A</button>
                        <button class="rs-font-btn${fontSize === 'md' ? ' rs-font-btn--active' : ''}" data-font="md" title="默认字体" aria-label="默认字体" style="font-size:0.85rem">A</button>
                        <button class="rs-font-btn${fontSize === 'lg' ? ' rs-font-btn--active' : ''}" data-font="lg" title="大号字体" aria-label="大号字体" style="font-size:0.95rem">A</button>
                        <span style="width:6px"></span>
                        <button id="focus-toggle" class="rs-focus-toggle" title="专注模式" aria-label="切换专注模式">
                            <i data-lucide="scan-eye"></i>
                            <span>专注</span>
                        </button>
                    </span>
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

    // Apply saved font size preference
    const readerEl = document.getElementById('rss-reader');
    if (readerEl) {
        readerEl.classList.remove('rs-reader--font-sm', 'rs-reader--font-md', 'rs-reader--font-lg');
        readerEl.classList.add('rs-reader--font-' + fontSize);
    }

    lucide.createIcons();

    // --- Full article loader ---
    const fullArticleBtn = document.getElementById('full-article-btn');
    if (fullArticleBtn) {
        fullArticleBtn.addEventListener('click', async () => {
            const origHTML = fullArticleBtn.innerHTML;
            fullArticleBtn.innerHTML = '<i data-lucide="loader-2"></i> 加载中…';
            fullArticleBtn.disabled = true;
            lucide.createIcons();
            try {
                const resp = await fetch('/api/article-content?url=' + encodeURIComponent(article.link));
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const data = await resp.json();
                if (data.success && data.content) {
                    const body = container.querySelector('.rs-article-body');
                    if (body) {
                        body.innerHTML = data.content;
                        // Re-render lucide icons in loaded content
                        lucide.createIcons();
                    }
                } else {
                    alert('未能提取完整文章，请尝试打开原文阅读。');
                }
            } catch (e) {
                alert('加载失败: ' + e.message + '\n请尝试直接打开原文。');
            } finally {
                fullArticleBtn.innerHTML = origHTML;
                fullArticleBtn.disabled = false;
                lucide.createIcons();
            }
        });
    }

    // --- Share button ---
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const shareData = {
                title: article.title,
                text: article.title,
                url: article.link
            };
            // Try Web Share API first
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                    return;
                } catch (e) {
                    // User cancelled or API failed, fall through to clipboard
                    if (e.name === 'AbortError') return;
                }
            }
            // Fallback: copy link to clipboard
            try {
                await navigator.clipboard.writeText(article.link);
                // Visual feedback
                shareBtn.innerHTML = '<i data-lucide="check"></i> 已复制';
                shareBtn.style.color = 'var(--rs-accent)';
                lucide.createIcons();
                setTimeout(() => {
                    shareBtn.innerHTML = '<i data-lucide="share-2"></i> 分享';
                    shareBtn.style.color = '';
                    lucide.createIcons();
                }, 2000);
            } catch (e) {
                alert('无法分享: ' + e.message);
            }
        });
    }

    // --- Font size buttons ---
    container.querySelectorAll('.rs-font-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const size = btn.dataset.font;
            setFontSizePreference(size);
            readerEl.classList.remove('rs-reader--font-sm', 'rs-reader--font-md', 'rs-reader--font-lg');
            readerEl.classList.add('rs-reader--font-' + size);
            container.querySelectorAll('.rs-font-btn').forEach(b => {
                b.classList.toggle('rs-font-btn--active', b.dataset.font === size);
            });
        });
    });

    // --- Focus mode toggle ---
    const focusToggle = document.getElementById('focus-toggle');
    const focusExitBtn = document.getElementById('focus-exit-btn');
    const workbench = document.getElementById('rss-workbench');

    function setFocusMode(on) {
        if (!workbench) return;
        if (on) {
            workbench.classList.add('rs-workbench--focus');
        } else {
            workbench.classList.remove('rs-workbench--focus');
        }
        // 浮动退出按钮 — 直接用 class 控制
        if (focusExitBtn) {
            focusExitBtn.classList.toggle('rs-focus-exit--visible', on);
        }
        if (focusToggle) {
            focusToggle.querySelector('span').textContent = on ? '退出' : '专注';
        }
        lucide.createIcons();
    }

    if (focusToggle) {
        focusToggle.addEventListener('click', () => {
            const isFocus = !workbench.classList.contains('rs-workbench--focus');
            setFocusMode(isFocus);
        });
    }

    // Floating exit button
    if (focusExitBtn) {
        focusExitBtn.addEventListener('click', () => setFocusMode(false));
    }

    // --- Translate button ---
    const translateBtn = document.getElementById('translate-btn');
    if (translateBtn) {
        translateBtn.addEventListener('click', async () => {
            try {
                translateBtn.innerHTML = '<i data-lucide="loader-2"></i> 翻译中…';
                translateBtn.disabled = true;
                lucide.createIcons();
                const translated = await translateArticle(article.content);
                if (translated) {
                    const body = container.querySelector('.rs-article-body');
                    if (body) body.innerHTML = translated;
                }
            } catch (e) {
                alert('翻译失败: ' + e.message);
            } finally {
                translateBtn.innerHTML = '<i data-lucide="languages"></i> 翻译';
                translateBtn.disabled = false;
                lucide.createIcons();
            }
        });
    }

    // --- Reading progress bar + reader BTT button ---
    const progressBar = document.getElementById('reading-progress');
    const readerBtt = document.getElementById('reader-btt');
    if (progressBar) {
        if (container._scrollHandler) {
            container.removeEventListener('scroll', container._scrollHandler);
        }
        container._scrollHandler = () => {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight - container.clientHeight;
            const progress = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0;
            progressBar.style.width = progress + '%';

            // Toggle reader back-to-top button visibility
            if (readerBtt) {
                readerBtt.classList.toggle('rs-reader-btt--visible', scrollTop > 100);
            }
        };
        container.addEventListener('scroll', container._scrollHandler, { passive: true });
        progressBar.style.width = '0%';
    }

    // --- Reader back-to-top button ---
    if (readerBtt) {
        readerBtt.onclick = () => {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }

    // Scroll to top
    container.scrollTop = 0;
}

// ===========================================
// AI Translation Functions
// ===========================================

async function translateArticle(content) {
    const settings = JSON.parse(localStorage.getItem('ai_settings') || '{}');
    const provider = settings.provider || 'openai';
    const baseUrl = settings.baseUrl || AI_PROVIDERS[provider]?.baseUrl || '';
    const apiKey = settings.apiKey;
    const model = settings.model || (AI_PROVIDERS[provider]?.models[0]) || '';
    const systemPrompt = settings.systemPrompt || '你是一个专业的翻译助手，请将以下内容翻译成简体中文，保持原文格式和语气。';

    if (!apiKey) {
        throw new Error('API Key 未设置，请在 AI 设置中填写');
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

    // 代理链路：CF Worker → PHP → 直连（CF 优先，破 GFW 最快）
    let needProxy = true;

    // 1. Cloudflare Worker（最快，能破 GFW）
    try {
        const cfUrl = `https://bangumi.shadowquake.top/fetch?url=${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const cfResp = await fetch(cfUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (cfResp.ok) {
            xmlText = await cfResp.text();
            needProxy = false;
        }
    } catch (_) {}

    // 2. PHP 代理
    if (needProxy) {
        try {
            const proxyUrl = `/api/rss-proxy.php?url=${encodeURIComponent(url)}`;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timer);
            if (response.ok) {
                const text = await response.text();
                if (!text.includes('<?php') && !text.trim().startsWith('<?=')) {
                    xmlText = text;
                    needProxy = false;
                }
            }
        } catch (_) {}
    }

    // 3. 直连兜底
    if (needProxy) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const directResp = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            if (!directResp.ok) throw new Error(`HTTP ${directResp.status}`);
            xmlText = await directResp.text();
        } catch (e) {
            throw new Error(`加载失败: ${e.message}`);
        }
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
        models: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o4-mini'],
        help: '行业标杆，翻译质量最高',
        apiKeyUrl: 'https://platform.openai.com/api-keys'
    },
    anthropic: {
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
        help: '需 OpenAI 兼容端点，长文翻译细腻',
        apiKeyUrl: 'https://console.anthropic.com/keys'
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        help: '国产最强，百万上下文，性价比王',
        apiKeyUrl: 'https://platform.deepseek.com/api_keys'
    },
    gemini: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
        help: '每月免费额度充裕，多语言顶尖',
        apiKeyUrl: 'https://aistudio.google.com/apikey'
    },
    grok: {
        name: 'Grok',
        baseUrl: 'https://api.x.ai/v1',
        models: ['grok-4', 'grok-4-mini'],
        help: 'xAI 模型，价格实惠',
        apiKeyUrl: 'https://console.x.ai/api-keys'
    },
    qwen: {
        name: '通义千问',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
        help: '阿里云，中文语感最佳',
        apiKeyUrl: 'https://bailian.console.aliyun.com/#/api-key'
    },
    doubao: {
        name: '豆包',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        models: ['doubao-1.5-pro-32k', 'doubao-1.5-lite-32k'],
        help: '字节跳动，性价比优秀',
        apiKeyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey'
    },
    custom: {
        name: '自定义',
        baseUrl: '',
        models: [],
        help: '兼容 OpenAI API 格式的任意服务地址',
        apiKeyUrl: ''
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
    if (modelInput) modelInput.value = settings.model || 'gpt-4.1';
    if (systemPromptInput) systemPromptInput.value = settings.systemPrompt || '你是一个专业的翻译助手，请将以下内容翻译成简体中文，保持原文格式和语气。';

    // Update char count
    const charCount = document.getElementById('prompt-char-count');
    if (charCount && systemPromptInput) charCount.textContent = systemPromptInput.value.length;

    updateProviderDefaults();
}

function updateProviderDefaults() {
    const providerSelect = document.getElementById('ai-provider');
    const baseUrlInput = document.getElementById('ai-base-url');
    const modelInput = document.getElementById('ai-model');
    const modelPresets = document.getElementById('model-presets');
    const modelPills = document.getElementById('model-pills');
    const modelHelp = document.getElementById('model-help');
    const apiKeyHelp = document.getElementById('api-key-help');

    if (!providerSelect) return;

    const provider = AI_PROVIDERS[providerSelect.value];
    if (!provider) return;

    // Highlight correct provider card
    document.querySelectorAll('.rs-provider-card').forEach(card => {
        card.classList.toggle('rs-provider-card--active', card.dataset.provider === providerSelect.value);
    });

    // Update base URL if not custom
    if (providerSelect.value !== 'custom' && baseUrlInput) {
        baseUrlInput.value = provider.baseUrl;
    }

    // Update model datalist + pills
    if (modelPresets) {
        modelPresets.innerHTML = provider.models.map(m => `<option value="${m}">`).join('');
    }
    if (modelPills) {
        modelPills.innerHTML = provider.models.map(m =>
            `<button class="rs-model-pill" type="button" data-model="${m}">${m}</button>`
        ).join('');
        // Pill click → fill model input
        modelPills.querySelectorAll('.rs-model-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                if (modelInput) modelInput.value = pill.dataset.model;
            });
        });
    }

    // Update help text
    if (modelHelp) {
        modelHelp.textContent = provider.help;
    }

    // Update API Key获取链接
    const apiKeyUrl = document.getElementById('api-key-url');
    if (apiKeyUrl && provider.apiKeyUrl) {
        apiKeyUrl.href = provider.apiKeyUrl;
        apiKeyUrl.style.display = '';
    } else if (apiKeyUrl) {
        apiKeyUrl.style.display = 'none';
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
