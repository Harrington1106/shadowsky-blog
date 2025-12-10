/**
 * RSS Manager for Summer Tech Exploration
 * Handles fetching, parsing, and rendering RSS feeds.
 */

class RSSManager {
    constructor() {
        // We will load feeds in init()
        this.feeds = [];
        this.currentFeedId = 'all';
        this.articles = []; // { ...articleData, feedId, timestamp }
        this.loading = false;
        this.feedStatus = new Map(); // feedId -> 'ok' | 'error' | 'loading'
        this.aiConfig = {
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            systemPrompt: ''
        };
        
        // DOM Elements
        this.feedListContainer = document.getElementById('feed-list-items');
        this.articleListContainer = document.getElementById('article-list');
        this.articleContentContainer = document.getElementById('article-content');
        this.feedTitleElement = document.getElementById('feed-title');
        
        this.init();
    }

    async init() {
        this.loadSettings();
        await this.loadFeeds();
        this.renderSidebar();
        this.fetchAllFeeds(); // Don't await, let it load in background
        
        // Setup event listeners
        // Check if elements exist before adding listeners to avoid errors
        const allFeedsBtn = document.getElementById('all-feeds-btn');
        if (allFeedsBtn) {
            allFeedsBtn.addEventListener('click', () => this.selectFeed('all'));
        }

        this.setupSettingsModal();
        this.setupAddFeedModal();
        this.setupRefreshButton();
    }

    setupSettingsModal() {
        const settingsModal = document.getElementById('ai-settings-modal');
        const providerSelect = document.getElementById('ai-provider');
        const baseUrlInput = document.getElementById('ai-base-url');
        const apiKeyInput = document.getElementById('ai-api-key');
        const modelInput = document.getElementById('ai-model');
        const modelList = document.getElementById('model-presets');
        const modelHelp = document.getElementById('model-help');
        const systemPromptInput = document.getElementById('ai-system-prompt');
        const testBtn = document.getElementById('test-connection-btn');

        // Provider Definitions
        const providers = {
            openai: {
                url: 'https://api.openai.com/v1',
                models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo'],
                help: 'OpenAI 官方 API',
                placeholder: 'sk-...'
            },
            deepseek: {
                url: 'https://api.deepseek.com',
                models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
                help: 'DeepSeek 深度求索 (兼容 OpenAI)',
                placeholder: 'sk-...'
            },
            gemini: {
                url: 'https://generativelanguage.googleapis.com/v1beta/openai/',
                models: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'],
                help: 'Google Gemini (OpenAI 兼容接口)',
                placeholder: 'AIzaSy...'
            },
            doubao: {
                url: 'https://ark.cn-beijing.volces.com/api/v3',
                models: ['ep-20250209-xxxx'], 
                help: '火山引擎 (Volcengine) - 请在模型名称处填写 Endpoint ID',
                placeholder: '您的 API Key / Access Key'
            },
            custom: {
                url: '',
                models: [],
                help: '自定义 OpenAI 格式接口',
                placeholder: 'Bearer Token (sk-...)'
            }
        };

        const updateProviderUI = (provider) => {
            const config = providers[provider];
            if (!config) return;

            if (provider !== 'custom') {
                baseUrlInput.value = config.url;
                if (config.models.length > 0 && !config.models.includes(modelInput.value)) {
                     modelInput.value = config.models[0];
                }
            }

            modelList.innerHTML = '';
            config.models.forEach(m => {
                const option = document.createElement('option');
                option.value = m;
                modelList.appendChild(option);
            });

            modelHelp.textContent = config.help;
            apiKeyInput.placeholder = config.placeholder || 'sk-...';
            
            const keyHelp = document.getElementById('api-key-help');
            if (provider === 'doubao') {
                modelInput.placeholder = '请输入 Endpoint ID (ep-...)';
                if (keyHelp) keyHelp.classList.remove('hidden');
            } else {
                modelInput.placeholder = '选择或输入模型名称';
                if (keyHelp) keyHelp.classList.add('hidden');
            }
        };

        providerSelect.addEventListener('change', (e) => updateProviderUI(e.target.value));

        document.getElementById('settings-btn').addEventListener('click', () => {
            providerSelect.value = this.aiConfig.provider || 'openai';
            baseUrlInput.value = this.aiConfig.baseUrl || providers[providerSelect.value].url;
            apiKeyInput.value = this.aiConfig.apiKey || '';
            modelInput.value = this.aiConfig.model || '';
            if (systemPromptInput) {
                systemPromptInput.value = this.aiConfig.systemPrompt || '';
            }
            
            updateProviderUI(providerSelect.value);
            settingsModal.classList.remove('hidden');
        });

        document.getElementById('close-settings-btn').addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        document.getElementById('save-settings-btn').addEventListener('click', () => {
            if (!apiKeyInput.value.trim()) {
                alert('请输入 API Key');
                return;
            }
            if (!modelInput.value.trim()) {
                alert('请输入模型名称');
                return;
            }

            this.aiConfig = {
                provider: providerSelect.value,
                baseUrl: baseUrlInput.value.trim(),
                apiKey: apiKeyInput.value.trim(),
                model: modelInput.value.trim(),
                systemPrompt: systemPromptInput ? systemPromptInput.value.trim() : ''
            };
            this.saveSettings();
            settingsModal.classList.add('hidden');
            alert('设置已保存');
        });

        // Test Connection Logic
        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                const originalText = testBtn.innerHTML;
                testBtn.disabled = true;
                testBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-1.5 animate-spin"></i> 连接中...';
                if (window.lucide) lucide.createIcons();

                const baseUrl = baseUrlInput.value.trim();
                const apiKey = apiKeyInput.value.trim();
                const model = modelInput.value.trim();

                try {
                    // Try a simple chat completion with max_tokens 1
                    const response = await fetch(`${baseUrl}/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [{ role: 'user', content: 'Hi' }],
                            max_tokens: 1
                        })
                    });

                    if (!response.ok) {
                        const err = await response.json().catch(() => ({}));
                        throw new Error(err.error?.message || `Status: ${response.status}`);
                    }

                    testBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 mr-1.5"></i> 连接成功';
                    testBtn.classList.add('text-green-600', 'dark:text-green-400');
                    setTimeout(() => {
                        testBtn.innerHTML = originalText;
                        testBtn.classList.remove('text-green-600', 'dark:text-green-400');
                        testBtn.disabled = false;
                        if (window.lucide) lucide.createIcons();
                    }, 3000);

                } catch (error) {
                    alert(`连接失败: ${error.message}`);
                    testBtn.innerHTML = '<i data-lucide="x" class="w-4 h-4 mr-1.5"></i> 连接失败';
                    testBtn.classList.add('text-red-600', 'dark:text-red-400');
                    setTimeout(() => {
                        testBtn.innerHTML = originalText;
                        testBtn.classList.remove('text-red-600', 'dark:text-red-400');
                        testBtn.disabled = false;
                        if (window.lucide) lucide.createIcons();
                    }, 3000);
                }
            });
        }
    }

    setupAddFeedModal() {
        document.getElementById('add-feed-btn').addEventListener('click', () => {
            document.getElementById('add-feed-modal').classList.remove('hidden');
        });
        
        document.getElementById('close-modal-btn').addEventListener('click', () => {
            document.getElementById('add-feed-modal').classList.add('hidden');
        });

        document.getElementById('confirm-add-feed-btn').addEventListener('click', () => {
            const input = document.getElementById('feed-url-input');
            if (input.value) {
                this.addFeed(input.value);
                input.value = '';
                document.getElementById('add-feed-modal').classList.add('hidden');
            }
        });
    }

    setupRefreshButton() {
        const refreshBtn = document.getElementById('refresh-feeds-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.classList.add('animate-spin');
                await this.fetchAllFeeds(true);
                refreshBtn.classList.remove('animate-spin');
            });
        }
    }

    async loadFeeds() {
        // Load Defaults first to have them ready for merging
        let defaultFeeds = [];
        try {
            const response = await fetch('public/data/feeds.json');
            if (response.ok) {
                defaultFeeds = await response.json();
            }
        } catch (e) { console.warn('Failed to load default feeds', e); }

        // Try server then local
        try {
            // Only fetch if not file protocol and looks like we have a backend
            if (window.location.protocol.startsWith('http')) {
                const response = await fetch('api/feeds.php');
                if (response.ok) {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const feeds = await response.json();
                        if (Array.isArray(feeds)) {
                            this.feeds = feeds;
                            this.saveFeedsToLocal();
                            return;
                        }
                    } else {
                        // Check if response text starts with <?php or is not JSON
                        const text = await response.text();
                        if (text.trim().startsWith('<?php') || text.trim().startsWith('<')) {
                             console.warn('Backend PHP not executing, falling back to local storage.');
                             throw new Error('PHP not executing');
                        }
                        try {
                             const feeds = JSON.parse(text);
                             if (Array.isArray(feeds)) {
                                this.feeds = feeds;
                                this.saveFeedsToLocal();
                                return;
                            }
                        } catch(e) { /* Not JSON */ }
                    }
                }
            }
        } catch (e) { console.warn('Server fetch failed, using local/default', e); }

        const savedFeeds = localStorage.getItem('rss_feeds');
        
        if (savedFeeds) {
            const localFeeds = JSON.parse(savedFeeds);
            // Merge defaults into local if not present (using URL as key)
            const existingUrls = new Set(localFeeds.map(f => f.url));
            let hasChanges = false;
            
            defaultFeeds.forEach(df => {
                if (!existingUrls.has(df.url)) {
                    localFeeds.push(df);
                    existingUrls.add(df.url);
                    hasChanges = true;
                }
            });
            
            this.feeds = localFeeds;
            if (hasChanges) {
                this.saveFeedsToLocal();
            }
        } else {
            this.feeds = defaultFeeds;
            if (this.feeds.length > 0) {
                this.saveFeeds();
            }
        }
    }

    saveFeeds() {
        this.saveFeedsToLocal();
        this.saveFeedsToServer();
    }

    saveFeedsToLocal() {
        localStorage.setItem('rss_feeds', JSON.stringify(this.feeds));
    }

    async saveFeedsToServer() {
        if (window.location.protocol === 'file:') return;
        try {
            await fetch('api/feeds.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.feeds)
            });
        } catch (e) {}
    }

    async fetchAllFeeds(forceRefresh = false) {
        this.loading = true;
        this.updateLoadingState(true);
        this.articles = [];
        this.feedStatus.clear();
        this.renderSidebar();

        const promises = this.feeds.map(async (feed) => {
            this.feedStatus.set(feed.id, 'loading');
            this.renderSidebar();
            try {
                const articles = await this.fetchAndParseFeed(feed, forceRefresh);
                this.articles.push(...articles);
                this.feedStatus.set(feed.id, 'ok');
            } catch (e) {
                console.error(e);
                this.feedStatus.set(feed.id, 'error');
            }
            this.sortArticles();
            this.renderArticleList();
            this.renderSidebar();
        });

        await Promise.allSettled(promises);
        this.loading = false;
        this.updateLoadingState(false);
    }

    loadSettings() {
        const saved = localStorage.getItem('ai_config');
        if (saved) {
            this.aiConfig = { ...this.aiConfig, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('ai_config', JSON.stringify(this.aiConfig));
    }

    async addFeed(url) {
        if (!url.startsWith('http')) url = 'https://' + url;
        try {
            const feedData = await this.fetchFeedData(url);
            if (!feedData) throw new Error('Invalid Feed');

            const domain = new URL(url).hostname;
            const newFeed = {
                id: Date.now().toString(),
                title: feedData.title || domain,
                url: url,
                icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
            };

            this.feeds.push(newFeed);
            this.saveFeeds();
            this.renderSidebar();
            this.fetchAndParseFeed(newFeed).then(articles => {
                this.articles.push(...articles);
                this.sortArticles();
                this.renderArticleList();
            });
        } catch (error) {
            alert('添加订阅失败: ' + error.message);
        }
    }

    async fetchFeedData(url) {
        const proxies = [
            (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
            (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
            (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
            (u) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}`
        ];

        for (const proxy of proxies) {
            try {
                const proxyUrl = proxy(url);
                const response = await fetch(proxyUrl);
                if (!response.ok) continue;

                // Handle rss2json specifically
                if (proxyUrl.includes('rss2json')) {
                    const data = await response.json();
                    if (data.status === 'ok' && data.feed) {
                        return { title: data.feed.title };
                    }
                    continue;
                }

                const data = await response.json().catch(() => null);
                // AllOrigins wraps in contents, others might return raw
                let content = '';
                if (data && data.contents) content = data.contents;
                else if (typeof data === 'string') content = data; // Some might return text if not json
                else {
                    // Try text if json failed or structure unknown
                     const text = await response.text();
                     content = text;
                }
                
                if (!content) throw new Error('No content');
                
                const parser = new DOMParser();
                const xml = parser.parseFromString(content, "text/xml");
                if (xml.querySelector("parsererror")) continue; // Invalid XML

                const title = xml.querySelector("channel > title, feed > title")?.textContent || "Unknown Feed";
                return { title };
            } catch (e) {
                console.debug(`Proxy failed for ${url}:`, e);
            }
        }
        return null;
    }

    async fetchAndParseFeed(feed, forceRefresh = false) {
        // Cache Check
        const cacheKey = `rss_cache_${feed.id}`;
        if (!forceRefresh) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { timestamp, data } = JSON.parse(cached);
                    // Cache valid for 1 hour (3600000 ms)
                    if (Date.now() - timestamp < 3600000) {
                        console.debug(`Using cache for feed: ${feed.title}`);
                        return data;
                    }
                } catch (e) {
                    localStorage.removeItem(cacheKey);
                }
            }
        }

        const proxies = [
            (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
            (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
            (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
            (u) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}`
        ];

        let lastError = null;

        for (const proxy of proxies) {
            try {
                const proxyUrl = proxy(feed.url);
                const response = await fetch(proxyUrl);
                if (!response.ok) continue;
                
                let articles = [];

                // Handle rss2json specifically
                if (proxyUrl.includes('rss2json')) {
                    const data = await response.json();
                    if (data.status !== 'ok') throw new Error(data.message || 'rss2json failed');
                    
                    articles = data.items.map(item => ({
                        feedId: feed.id,
                        feedTitle: feed.title,
                        feedIcon: feed.icon,
                        title: item.title,
                        link: item.link,
                        description: item.description,
                        content: item.content || item.description,
                        timestamp: new Date(item.pubDate).getTime()
                    }));
                } else {
                    let content = '';
                    // Handle different proxy response formats
                    const contentType = response.headers.get('content-type');
                    
                    if (proxyUrl.includes('allorigins')) {
                        const data = await response.json();
                        content = data.contents;
                    } else {
                        content = await response.text();
                    }

                    if (!content || content.includes('Oops... Request')) throw new Error('Empty or Error Content');

                    const parser = new DOMParser();
                    const xml = parser.parseFromString(content, "text/xml");
                    if (xml.querySelector("parsererror")) throw new Error('Invalid XML');

                    const items = Array.from(xml.querySelectorAll("item, entry"));
                    if (items.length === 0) throw new Error('No items found');

                    articles = items.map(item => {
                        const title = item.querySelector("title")?.textContent || "No Title";
                        const link = item.querySelector("link")?.textContent || item.querySelector("link")?.getAttribute("href");
                        const description = item.querySelector("description, summary, content")?.textContent || "";
                        const contentEncoded = item.querySelector("content\\:encoded, content")?.textContent || description;
                        const pubDate = item.querySelector("pubDate, published, updated")?.textContent;

                        return {
                            feedId: feed.id,
                            feedTitle: feed.title,
                            feedIcon: feed.icon,
                            title,
                            link,
                            description,
                            content: contentEncoded,
                            timestamp: pubDate ? new Date(pubDate).getTime() : Date.now()
                        };
                    });
                }
                
                // Save to cache
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: articles
                    }));
                } catch (e) {
                    console.warn('Cache storage failed:', e);
                }

                return articles;

            } catch (e) {
                lastError = e;
                console.debug(`Proxy attempt failed for ${feed.url} (${proxy.name || 'proxy'}):`, e);
            }
        }
        
        throw lastError || new Error('All proxies failed');
    }

    sortArticles() {
        this.articles.sort((a, b) => b.timestamp - a.timestamp);
    }

    deleteFeed(feedId) {
        if (!confirm('确定要删除这个订阅源吗？')) return;
        
        this.feeds = this.feeds.filter(f => f.id !== feedId);
        this.saveFeeds();
        
        // Remove articles from this feed
        this.articles = this.articles.filter(a => a.feedId !== feedId);
        
        if (this.currentFeedId === feedId) {
            this.selectFeed('all');
        } else {
            this.renderSidebar();
            this.renderArticleList();
        }
    }

    renderSidebar() {
        if (!this.feedListContainer) return;
        this.feedListContainer.innerHTML = '';
        
        this.feeds.forEach(feed => {
            const el = document.createElement('div');
            const isActive = this.currentFeedId === feed.id;
            const status = this.feedStatus.get(feed.id);
            
            let statusIcon = '';
            if (status === 'loading') statusIcon = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin text-slate-400"></i>';
            else if (status === 'error') statusIcon = '<i data-lucide="alert-circle" class="w-3 h-3 text-red-400"></i>';
            
            el.className = `feed-item flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium ${
                isActive 
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`;
            el.dataset.id = feed.id;
            
            el.innerHTML = `
                <img src="${feed.icon}" class="w-4 h-4 mr-3 rounded-sm opacity-70" onerror="this.style.display='none'">
                <span class="truncate flex-1 pointer-events-none">${feed.title}</span>
                ${statusIcon}
            `;
            
            el.onclick = () => this.selectFeed(feed.id);
            this.feedListContainer.appendChild(el);
        });

        // Update All Feeds Button State
        const allBtn = document.getElementById('all-feeds-btn');
        if (allBtn) {
            if (this.currentFeedId === 'all') {
                allBtn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-blue-600', 'dark:text-blue-400');
                allBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
            } else {
                allBtn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-blue-600', 'dark:text-blue-400');
                allBtn.classList.add('text-slate-600', 'dark:text-slate-400');
            }
        }
        
        if (window.lucide) lucide.createIcons();
    }

    selectFeed(feedId) {
        this.currentFeedId = feedId;
        this.renderSidebar();
        this.renderArticleList();
        
        // Update title
        if (feedId === 'all') {
            this.feedTitleElement.textContent = '全部文章';
        } else {
            const feed = this.feeds.find(f => f.id === feedId);
            this.feedTitleElement.textContent = feed ? feed.title : '未知订阅';
        }
        
        // Mobile: Show list if hidden
        if (window.innerWidth < 1024) {
            this.articleContentContainer.classList.add('hidden');
            this.articleListContainer.parentElement.classList.remove('hidden');
        }
    }

    renderArticleList() {
        this.articleListContainer.innerHTML = '';
        const filtered = this.currentFeedId === 'all' 
            ? this.articles 
            : this.articles.filter(a => a.feedId === this.currentFeedId);

        if (filtered.length === 0) {
            this.articleListContainer.innerHTML = `
                <div class="p-12 text-center text-slate-400">
                    <p>暂时没有文章</p>
                    <p class="text-xs mt-2 opacity-70">${this.loading ? '加载中...' : ''}</p>
                </div>
            `;
            return;
        }

        filtered.forEach(article => {
            const el = document.createElement('div');
            el.className = "p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all group";
            const dateStr = this.formatDate(article.timestamp);
            
            el.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                        <img src="${article.feedIcon}" class="w-3 h-3 mr-2 rounded-sm opacity-50" loading="lazy" onerror="this.style.display='none'">
                        <span class="text-xs font-bold text-slate-500 truncate max-w-[100px]">${article.feedTitle}</span>
                    </div>
                    <span class="text-[10px] text-slate-400">${dateStr}</span>
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">${article.title}</h3>
                <p class="text-xs text-slate-500 line-clamp-2">${this.stripHtml(article.description)}</p>
            `;
            el.onclick = () => this.renderArticle(article);
            this.articleListContainer.appendChild(el);
        });
    }

    renderArticle(article) {
        const container = this.articleContentContainer;
        
        // Mobile handling
        if (window.innerWidth < 1024) {
            this.articleListContainer.parentElement.classList.add('hidden');
            container.classList.remove('hidden');
            container.classList.add('block', 'w-full', 'absolute', 'inset-0', 'z-40', 'bg-slate-50', 'dark:bg-slate-950');
            container.style.paddingTop = '64px';
        }
        container.scrollTop = 0;

        const dateStr = new Date(article.timestamp).toLocaleString('zh-CN');
        let safeContent = DOMPurify.sanitize(article.content);
        
        // Optimize: Add lazy loading to images
        safeContent = safeContent.replace(/<img /g, '<img loading="lazy" ');

        container.innerHTML = `
            <div class="max-w-3xl mx-auto p-8 lg:p-12 relative">
                <button id="back-to-list-btn" class="lg:hidden mb-4 flex items-center text-slate-500">
                    <i data-lucide="arrow-left" class="w-5 h-5 mr-1"></i> 返回列表
                </button>

                <div class="mb-8">
                    <h1 class="text-3xl font-black text-slate-900 dark:text-white mb-4">${article.title}</h1>
                    <div class="flex items-center gap-2 text-sm text-slate-500">
                        <span>${article.feedTitle}</span>
                        <span>&bull;</span>
                        <span>${dateStr}</span>
                        <span>&bull;</span>
                        <a href="${article.link}" target="_blank" class="text-blue-600 hover:underline">原文</a>
                    </div>
                </div>

                <!-- Translation Section -->
                <div class="mb-6 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-bold text-purple-900 dark:text-purple-300 flex items-center">
                            <i data-lucide="languages" class="w-4 h-4 mr-2"></i>
                            AI 智能翻译
                        </h3>
                        <button id="translate-article-btn" class="px-3 py-1.5 bg-white dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-xs font-bold rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors flex items-center">
                            <i data-lucide="sparkles" class="w-3 h-3 mr-1.5"></i>
                            开始翻译
                        </button>
                    </div>
                    <div id="translation-container" class="hidden mt-3 pt-3 border-t border-purple-200 dark:border-purple-800/50">
                        <div id="translation-content" class="prose prose-sm prose-purple dark:prose-invert max-w-none text-slate-700 dark:text-slate-300"></div>
                    </div>
                </div>
                
                <div class="prose prose-slate dark:prose-invert max-w-none">
                    ${safeContent}
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();

        document.getElementById('back-to-list-btn')?.addEventListener('click', () => {
            this.closeArticle();
        });

        document.getElementById('translate-article-btn')?.addEventListener('click', () => {
            this.translateArticle(article, article.content);
        });
    }

    closeArticle() {
        if (window.innerWidth < 1024) {
            this.articleListContainer.parentElement.classList.remove('hidden');
            this.articleContentContainer.classList.add('hidden');
            this.articleContentContainer.classList.remove('block', 'w-full', 'absolute', 'inset-0', 'z-40');
            this.articleContentContainer.style.paddingTop = '';
        }
    }

    async translateArticle(article, contentHtml) {
        if (!this.aiConfig.apiKey) {
            alert('请先配置 AI API Key');
            return;
        }

        const btn = document.getElementById('translate-article-btn');
        const container = document.getElementById('translation-container');
        const contentDiv = document.getElementById('translation-content');
        
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 mr-1.5 animate-spin"></i> 翻译中...';
        if (window.lucide) lucide.createIcons();

        container.classList.remove('hidden');
        contentDiv.innerHTML = '<p class="animate-pulse">正在思考并翻译中...</p>';

        const textContent = this.stripHtml(contentHtml).substring(0, 4000); // Limit context
        const systemPrompt = this.aiConfig.systemPrompt || "你是一个专业的科技文章翻译助手。请将以下内容翻译成流畅的中文。保持专业术语的准确性。请直接输出翻译后的内容，可以使用 Markdown 格式优化排版。";

        try {
            const response = await fetch(`${this.aiConfig.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.aiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: this.aiConfig.model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Title: ${article.title}\n\nContent:\n${textContent}` }
                    ],
                    stream: true
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            contentDiv.innerHTML = '';
            let fullText = '';
            
            const mdParse = (text) => {
                return text
                    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
                    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                    .replace(/\n/g, '<br>');
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim() === '' || line.includes('[DONE]')) continue;
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const content = data.choices[0]?.delta?.content || '';
                            fullText += content;
                            contentDiv.innerHTML = mdParse(fullText);
                        } catch (e) {}
                    }
                }
            }

            btn.innerHTML = '<i data-lucide="check" class="w-3 h-3 mr-1.5"></i> 完成';
            btn.classList.replace('text-purple-600', 'text-green-600');
            btn.classList.replace('dark:text-purple-300', 'dark:text-green-400');

        } catch (error) {
            contentDiv.innerHTML = `<p class="text-red-500">翻译失败: ${error.message}</p>`;
            btn.disabled = false;
            btn.innerHTML = '重试';
        }
        if (window.lucide) lucide.createIcons();
    }

    formatDate(timestamp) {
        const diff = Date.now() - timestamp;
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    stripHtml(html) {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    updateLoadingState(isLoading) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = isLoading ? 'flex' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.rssManager = new RSSManager();
});