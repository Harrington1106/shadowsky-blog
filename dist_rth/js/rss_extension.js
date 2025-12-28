// ===========================================
// All Articles Aggregation
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
