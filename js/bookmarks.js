/**
 * Bookmarks Module
 * Provides import/export and filtering functionality
 * 
 * @module bookmarks
 */

/**
 * Export bookmarks to JSON string
 * @param {Array<{id: string, url: string, title: string, tags: string[], createdAt: string}>} bookmarks
 * @returns {string} - JSON string
 */
function exportBookmarks(bookmarks) {
    if (!Array.isArray(bookmarks)) return '[]';
    
    const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        bookmarks: bookmarks.map(b => ({
            id: b.id,
            url: b.url,
            title: b.title,
            tags: Array.isArray(b.tags) ? b.tags : [],
            createdAt: b.createdAt,
            description: b.description || ''
        }))
    };
    
    return JSON.stringify(exportData, null, 2);
}

/**
 * Import bookmarks from JSON string
 * @param {string} json - JSON string
 * @returns {Array} - Array of bookmarks
 */
function importBookmarks(json) {
    if (!json || typeof json !== 'string') return [];
    
    try {
        const data = JSON.parse(json);
        
        // Handle both wrapped and unwrapped formats
        const bookmarks = data.bookmarks || (Array.isArray(data) ? data : []);
        
        return bookmarks.map(b => ({
            id: b.id || generateId(),
            url: b.url || '',
            title: b.title || '',
            tags: Array.isArray(b.tags) ? b.tags : [],
            createdAt: b.createdAt || new Date().toISOString(),
            description: b.description || ''
        })).filter(b => b.url); // Filter out bookmarks without URL
    } catch (e) {
        console.error('[Bookmarks] Import error:', e);
        return [];
    }
}

/**
 * Generate a simple unique ID
 * @returns {string}
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Filter bookmarks by criteria
 * @param {Array} bookmarks - Array of bookmarks
 * @param {{tags?: string[], dateRange?: [Date, Date], search?: string}} filters
 * @returns {Array} - Filtered bookmarks
 */
function filterBookmarks(bookmarks, filters = {}) {
    if (!Array.isArray(bookmarks)) return [];
    if (!filters || Object.keys(filters).length === 0) return bookmarks;

    // If there's search query, we'll score and sort results
    if (filters.search && filters.search.trim()) {
        const scoredBookmarks = bookmarks.map(bookmark => {
            let score = 0;

            // Check if bookmark passes other filters first
            if (filters.tags && filters.tags.length > 0) {
                const bookmarkTags = bookmark.tags || [];
                const hasAllTags = filters.tags.every(tag =>
                    bookmarkTags.some(bt => bt.toLowerCase() === tag.toLowerCase())
                );
                if (!hasAllTags) return { bookmark, score: -1 };
            }

            // Filter by date range
            if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange.length === 2) {
                const [startDate, endDate] = filters.dateRange;
                const bookmarkDate = new Date(bookmark.createdAt);

                if (startDate && bookmarkDate < new Date(startDate)) return { bookmark, score: -1 };
                if (endDate && bookmarkDate > new Date(endDate)) return { bookmark, score: -1 };
            }

            const searchLower = filters.search.toLowerCase().trim();
            const title = (bookmark.title || '').toLowerCase();
            const description = (bookmark.description || '').toLowerCase();
            const url = (bookmark.url || '').toLowerCase();
            const tags = (bookmark.tags || []).map(t => t.toLowerCase());

            // Title matching (highest priority)
            if (title.includes(searchLower)) {
                score += 10;
                // Exact match at beginning gets bonus
                if (title.startsWith(searchLower)) score += 5;
                // Exact match gets bonus
                if (title === searchLower) score += 20;
            }

            // Tag matching (high priority)
            const tagMatches = tags.filter(tag => tag.includes(searchLower));
            if (tagMatches.length > 0) {
                score += 7;
                // Exact tag match gets bonus
                if (tags.includes(searchLower)) score += 5;
            }

            // Description matching (medium priority)
            if (description.includes(searchLower)) {
                score += 5;
            }

            // URL matching (lower priority)
            if (url.includes(searchLower)) {
                score += 2;
                // Domain name match gets bonus
                const domain = getDomainFromUrl(bookmark.url);
                if (domain && domain.toLowerCase().includes(searchLower)) {
                    score += 3;
                }
            }

            // Partial/fuzzy matching for longer queries
            if (searchLower.length > 2) {
                // Check for partial matches in title (for Chinese/Japanese characters)
                for (let i = 0; i < title.length - searchLower.length + 1; i++) {
                    if (title.substring(i, i + searchLower.length) === searchLower) {
                        score += 4;
                        break;
                    }
                }

                // Check word boundaries
                const words = searchLower.split(/\s+/).filter(w => w.length > 1);
                if (words.length > 1) {
                    words.forEach(word => {
                        if (word.length >= 2) {
                            if (title.includes(word)) score += 2;
                            if (description.includes(word)) score += 1;
                            if (tags.some(tag => tag.includes(word))) score += 3;
                        }
                    });
                }
            }

            // Boost score for bookmarks with tags if searching without #
            if (!searchLower.startsWith('#') && tags.length > 0) {
                score += 1;
            }

            return { bookmark, score };
        });

        // Filter out items with negative score (failed other filters)
        const validResults = scoredBookmarks.filter(item => item.score >= 0);

        // Sort by score descending, then by title
        validResults.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.bookmark.title || '').localeCompare(b.bookmark.title || '');
        });

        return validResults.map(item => item.bookmark);
    }

    // No search query, just filter
    return bookmarks.filter(bookmark => {
        // Filter by tags (AND logic - must have all specified tags)
        if (filters.tags && filters.tags.length > 0) {
            const bookmarkTags = bookmark.tags || [];
            const hasAllTags = filters.tags.every(tag =>
                bookmarkTags.some(bt => bt.toLowerCase() === tag.toLowerCase())
            );
            if (!hasAllTags) return false;
        }

        // Filter by date range
        if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange.length === 2) {
            const [startDate, endDate] = filters.dateRange;
            const bookmarkDate = new Date(bookmark.createdAt);

            if (startDate && bookmarkDate < new Date(startDate)) return false;
            if (endDate && bookmarkDate > new Date(endDate)) return false;
        }

        // No search text to filter by
        if (filters.search && filters.search.trim()) {
            const searchLower = filters.search.toLowerCase();
            const titleMatch = (bookmark.title || '').toLowerCase().includes(searchLower);
            const urlMatch = (bookmark.url || '').toLowerCase().includes(searchLower);
            const descMatch = (bookmark.description || '').toLowerCase().includes(searchLower);
            const tagMatch = (bookmark.tags || []).some(t => t.toLowerCase().includes(searchLower));

            if (!titleMatch && !urlMatch && !descMatch && !tagMatch) return false;
        }

        return true;
    });
}

/**
 * Merge imported bookmarks with existing ones
 * @param {Array} existing - Existing bookmarks
 * @param {Array} imported - Imported bookmarks
 * @returns {Array} - Merged bookmarks (no duplicates by URL)
 */
function mergeBookmarks(existing, imported) {
    if (!Array.isArray(existing)) existing = [];
    if (!Array.isArray(imported)) imported = [];
    
    const urlMap = new Map();
    
    // Add existing bookmarks
    existing.forEach(b => {
        if (b.url) urlMap.set(b.url, b);
    });
    
    // Add/update with imported bookmarks
    imported.forEach(b => {
        if (b.url && !urlMap.has(b.url)) {
            urlMap.set(b.url, b);
        }
    });
    
    return Array.from(urlMap.values());
}

/**
 * Download bookmarks as JSON file
 * @param {Array} bookmarks - Bookmarks to export
 * @param {string} filename - Download filename
 */
function downloadBookmarksFile(bookmarks, filename = 'bookmarks.json') {
    const json = exportBookmarks(bookmarks);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Get all unique tags from bookmarks
 * @param {Array} bookmarks
 * @returns {string[]}
 */
function getAllTags(bookmarks) {
    if (!Array.isArray(bookmarks)) return [];
    
    const tagSet = new Set();
    bookmarks.forEach(b => {
        (b.tags || []).forEach(tag => tagSet.add(tag));
    });
    
    return Array.from(tagSet).sort();
}

// Export for ES modules and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportBookmarks,
        importBookmarks,
        filterBookmarks,
        mergeBookmarks,
        downloadBookmarksFile,
        getAllTags,
        generateId
    };
}

// Global exports for browser
if (typeof window !== 'undefined') {
    window.exportBookmarks = exportBookmarks;
    window.importBookmarks = importBookmarks;
    window.filterBookmarks = filterBookmarks;
    window.mergeBookmarks = mergeBookmarks;
    window.downloadBookmarksFile = downloadBookmarksFile;
    window.getAllTags = getAllTags;
}

// ==========================================
// Page Rendering Logic
// ==========================================

let allBookmarks = [];
let allCategories = {};
let activeCategory = 'all';
let activeTag = null; // New state for tag filtering
let _bookmarksInitialized = false;
let _bookmarksInitializing = false;

// Cache keys
const BOOKMARKS_CACHE_KEY = 'bookmarks_data';
const CATEGORIES_CACHE_KEY = 'categories_data';

// Only add event listener in browser environment
if (typeof document !== 'undefined') {
    // Expose filterByTag globally
    window.filterByTag = function(tag) {
        activeTag = tag === activeTag ? null : tag; // Toggle
        // Clear search when clicking a tag for better UX? Or keep both?
        // Let's keep search if it exists, they can work together
        
        // Scroll to top of list
        const listContainer = document.getElementById('category-list');
        if (listContainer) {
            const offset = 180;
            const top = listContainer.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
        
        renderPage(document.getElementById('bookmark-search')?.value || '');
    };

    window.copyBookmarkLink = function(url, event) {
        event.preventDefault();
        event.stopPropagation();
        
        navigator.clipboard.writeText(url).then(() => {
            // Show toast or tooltip? For now just console/simple feedback
            const btn = event.currentTarget;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;color:#22c55e"></i>';
            if (window.lucide) window.lucide.createIcons();
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                if (window.lucide) window.lucide.createIcons();
            }, 2000);
        }).catch(err => console.error('Failed to copy:', err));
    };

    window.clearAllFilters = function() {
        activeTag = null;
        const searchInput = document.getElementById('bookmark-search');
        if (searchInput) searchInput.value = '';
        renderPage('');
    };

    // Use multiple strategies to ensure initialization
    
    const isBookmarksPage = () => !!document.getElementById('category-list');

    // Strategy 1: DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!isBookmarksPage()) return;
            console.log('[Bookmarks] DOMContentLoaded fired');
            initBookmarksPage();
        });
    } else {
        // DOM is already ready, run immediately
        if (isBookmarksPage()) {
            console.log('[Bookmarks] DOM already ready, init immediately');
            initBookmarksPage();
        }
    }
    
    // Strategy 2: window.onload as backup
    window.addEventListener('load', () => {
        if (!isBookmarksPage()) return;
        // console.log('[Bookmarks] window.load fired, checking init status...');
        if (!_bookmarksInitialized && !_bookmarksInitializing) {
            console.log('[Bookmarks] Not initialized yet, trying again...');
            initBookmarksPage();
        }
    });
    
    // Handle bfcache (Back-Forward Cache) - re-init when page is restored from cache
    window.addEventListener('pageshow', (event) => {
        if (event.persisted && isBookmarksPage()) {
            console.log('[Bookmarks] Page restored from bfcache, re-initializing...');
            _bookmarksInitialized = false;
            initBookmarksPage();
        }
    });
}

/**
 * Fetch bookmarks data (used by SWR cache)
 */
async function fetchBookmarksData() {
    const response = await fetch(`public/data/bookmarks.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(`Failed to load bookmarks (HTTP ${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data.bookmarks || []);
}

/**
 * Fetch categories data (used by SWR cache)
 */
async function fetchCategoriesData() {
    const response = await fetch(`public/data/categories.json?t=${Date.now()}`);
    if (!response.ok) return {};
    return response.json();
}

/**
 * Update hero stats with loaded data
 */
function updateHeroStats() {
    const totalEl = document.getElementById('bm-total-count');
    const catEl = document.getElementById('bm-cat-count');

    if (totalEl) {
        totalEl.textContent = allBookmarks.length;
    }
    if (catEl) {
        const uniqueCats = new Set(allBookmarks.map(b => b.category).filter(Boolean));
        catEl.textContent = uniqueCats.size;
    }
}

async function initBookmarksPage() {
    console.log('[Bookmarks] initBookmarksPage called, readyState:', document.readyState);
    
    // Prevent double initialization
    if (_bookmarksInitialized) {
        console.log('[Bookmarks] Already initialized, skipping');
        return;
    }
    
    if (_bookmarksInitializing) {
        console.log('[Bookmarks] Already initializing, skipping');
        return;
    }
    
    const navContainer = document.getElementById('category-nav');
    const listContainer = document.getElementById('category-list');
    
    console.log('[Bookmarks] Elements found:', { navContainer: !!navContainer, listContainer: !!listContainer });
    
    // Only run if we are on the bookmarks page
    if (!navContainer || !listContainer) {
        // console.debug('[Bookmarks] Not on bookmarks page, skipping init');
        return;
    }
    
    // Mark as initializing
    _bookmarksInitializing = true;
    
    // Show skeleton loading
    listContainer.innerHTML = `
        <div class="bm-cat-section">
            <div class="bm-cat-header">
                <div class="bm-skeleton-line bm-skeleton-line--title"></div>
            </div>
            <div class="bm-card-grid">
                ${Array(8).fill(0).map((_, i) => `
                    <div class="bm-card bm-skeleton">
                        <div class="bm-card-link" style="padding-bottom:12px">
                            <div class="bm-card-top">
                                <div class="bm-skeleton-avatar"></div>
                            </div>
                            <div class="bm-skeleton-line bm-skeleton-line--lg"></div>
                            <div class="bm-skeleton-line bm-skeleton-line--md"></div>
                            <div class="bm-skeleton-line bm-skeleton-line--sm"></div>
                        </div>
                        <div class="bm-skeleton-tags">
                            <div class="bm-skeleton-tag"></div>
                            <div class="bm-skeleton-tag"></div>
                            <div class="bm-skeleton-tag bm-skeleton-tag--short"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    console.log('[Bookmarks] Loading state shown');
    
    // Check if swrCache is available (from cache.js)
    const swr = window.swrCache;
    
    try {
        // Load categories first (with or without SWR)
        try {
            if (swr) {
                const catResult = await swr.load(CATEGORIES_CACHE_KEY, fetchCategoriesData, {
                    onUpdate: (newData) => {
                        allCategories = newData;
                        if (allBookmarks.length > 0) renderPage();
                    }
                });
                allCategories = catResult.data || {};
            } else {
                const catResponse = await fetch(`public/data/categories.json?t=${Date.now()}`);
                if (catResponse.ok) {
                    allCategories = await catResponse.json();
                }
            }
        } catch (e) {
            console.warn('[Bookmarks] Failed to load categories:', e);
            allCategories = {};
        }
        
        // Load bookmarks
        if (swr) {
            const bmResult = await swr.load(BOOKMARKS_CACHE_KEY, fetchBookmarksData, {
                onUpdate: (newData) => {
                    allBookmarks = newData;
                    renderPage();
                }
            });
            allBookmarks = bmResult.data || [];
        } else {
            allBookmarks = await fetchBookmarksData();
        }
        
        // Always render after loading (regardless of source)
        if (allBookmarks.length === 0) {
            listContainer.innerHTML = `
                <div class="bm-no-results">
                    <div class="bm-no-results-icon">
                        <i data-lucide="bookmark"></i>
                    </div>
                    <h3>暂无书签</h3>
                    <p>收藏的网站和资源将在这里展示。</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        } else {
            renderPage();
        }

        // Update hero stats
        updateHeroStats();

        // Setup Search
        const searchInput = document.getElementById('bookmark-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                renderPage(query);
            });
        }
        
        // Mark as initialized
        _bookmarksInitialized = true;
        _bookmarksInitializing = false;
        console.log('[Bookmarks] Initialization complete');
        
    } catch (e) {
        console.error('Bookmarks init error:', e);
        _bookmarksInitializing = false;
        listContainer.innerHTML = `
            <div class="bm-no-results">
                <div class="bm-no-results-icon">
                    <i data-lucide="alert-circle"></i>
                </div>
                <h3>加载失败</h3>
                <p style="color:#ef4444;margin-bottom:12px">${e.message}</p>
                <button onclick="_bookmarksInitialized=false;initBookmarksPage()" class="bm-clear-btn">重试</button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }
}

function renderPage(searchQuery = null) {
    const navContainer = document.getElementById('category-nav');
    const listContainer = document.getElementById('category-list');
    const noResults = document.getElementById('no-results');
    
    // Resolve search query
    if (searchQuery === null) {
        const searchInput = document.getElementById('bookmark-search');
        searchQuery = searchInput ? searchInput.value : '';
    }
    
    if (!navContainer || !listContainer) return;
    
    // Filter
    let displayBookmarks = allBookmarks;
    const filters = {};
    if (searchQuery) filters.search = searchQuery;
    if (activeTag) filters.tags = [activeTag];
    
    displayBookmarks = filterBookmarks(allBookmarks, filters);
    
    if (noResults) {
        if (displayBookmarks.length === 0) {
            noResults.classList.remove('hidden');
            // Check if we can offer to clear filters
            const p = noResults.querySelector('p');
            if (p) {
                if (activeTag || searchQuery) {
                    p.innerHTML = `
                        没有找到与 "${searchQuery || '#' + activeTag}" 相关的书签。<br>
                        <button onclick="clearAllFilters()" class="bm-clear-btn">
                            清除所有筛选
                        </button>
                    `;
                } else {
                    p.textContent = '尝试更换关键词，或者浏览分类寻找灵感。';
                }
            }
        } else {
            noResults.classList.add('hidden');
        }
    }
    
    // Group by Category
    const grouped = {};
    const otherCat = 'others';
    
    displayBookmarks.forEach(bm => {
        const cat = bm.category || otherCat;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(bm);
    });
    
    // Determine Categories to Show
    const catKeys = Object.keys(grouped);
    
    // Sort categories based on 'order' field in categories.json
    const sortedCats = catKeys.sort((a, b) => {
        const catA = allCategories[a];
        const catB = allCategories[b];
        const orderA = catA && catA.order !== undefined ? catA.order : 999;
        const orderB = catB && catB.order !== undefined ? catB.order : 999;
        return orderA - orderB;
    });
    
    // Render Nav
    navContainer.innerHTML = '';
    
    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = `bm-cat-pill${activeCategory === 'all' && !searchQuery ? ' bm-cat-pill--active' : ''}`;
    allBtn.textContent = '全部';
    allBtn.onclick = () => {
        activeCategory = 'all';
        const searchInput = document.getElementById('bookmark-search');
        if (searchInput) {
            searchInput.value = ''; // Clear search
            renderPage(''); // Reset
        } else {
            renderPage('');
        }
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    navContainer.appendChild(allBtn);

    sortedCats.forEach(catKey => {
        const catName = allCategories[catKey] ? allCategories[catKey].name : catKey;
        const btn = document.createElement('button');
        btn.className = `bm-cat-pill${activeCategory === catKey && !searchQuery ? ' bm-cat-pill--active' : ''}`;
        btn.textContent = catName;
        btn.onclick = () => {
            activeCategory = catKey;
            const section = document.getElementById(`cat-${catKey}`);
            if (section) {
                const offset = 140; // sticky header offset
                const top = section.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        };
        navContainer.appendChild(btn);
    });
    
    // Render List
    listContainer.innerHTML = '';

    // Tag Filter Indicator
    if (activeTag) {
        const indicator = document.createElement('div');
        indicator.className = 'bm-tag-filter-indicator animate-fade-in-up';
        indicator.innerHTML = `
            <div class="bm-tag-filter-pill">
                <span>当前标签: <span class="bm-tag-filter-name">#${activeTag}</span></span>
                <button onclick="filterByTag('${activeTag}')" title="清除筛选">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(indicator);
    }
    
    sortedCats.forEach(catKey => {
        const items = grouped[catKey];
        if (!items || items.length === 0) return;
        
        const catConfig = allCategories[catKey];
        const catName = catConfig ? catConfig.name : catKey;
        
        const section = document.createElement('div');
        section.id = `cat-${catKey}`;
        section.className = 'bm-cat-section';
        
        // Primary Header
        let sectionHTML = `
            <div class="bm-cat-header">
                <div class="bm-cat-accent-bar"></div>
                <h2 class="bm-cat-name">${catName}</h2>
                <span class="bm-cat-count">${items.length}</span>
            </div>
        `;

        // Group by Subcategory
        const subGrouped = {};
        const noSubItems = [];

        items.forEach(item => {
            if (item.subcategory) {
                if (!subGrouped[item.subcategory]) subGrouped[item.subcategory] = [];
                subGrouped[item.subcategory].push(item);
            } else {
                noSubItems.push(item);
            }
        });

        // Helper to render grid (Masonry Layout)
        const renderGrid = (cardItems) => `
            <div class="bm-card-grid">
                ${cardItems.map(renderCard).join('')}
            </div>
        `;

        // 1. Render items without subcategory
        if (noSubItems.length > 0) {
            sectionHTML += renderGrid(noSubItems);
        }

        // 2. Render items with subcategory (sorted by definition order)
        const childrenConfig = catConfig && catConfig.children ? catConfig.children : [];
        const definedSubIds = childrenConfig.map(c => c.id);
        const usedSubIds = Object.keys(subGrouped);

        // Sort: defined first, then alphabetical for unknown ones
        const sortedSubIds = usedSubIds.sort((a, b) => {
            const idxA = definedSubIds.indexOf(a);
            const idxB = definedSubIds.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        sortedSubIds.forEach(subId => {
            const subItems = subGrouped[subId];
            const subConfig = childrenConfig.find(c => c.id === subId);
            const subName = subConfig ? subConfig.name : subId;

            sectionHTML += `
                <div class="bm-subcat-header">
                    <span class="bm-subcat-dot"></span>
                    <h3 class="bm-subcat-name">${subName}</h3>
                </div>
                ${renderGrid(subItems)}
            `;
        });
        
        section.innerHTML = sectionHTML;
        listContainer.appendChild(section);
    });
    
    // Re-initialize icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Generate favicon URL with minimum 64px size
 * @param {string} domain - Domain name
 * @param {number} size - Icon size (minimum 64)
 * @returns {string} - Favicon URL
 */
function getFaviconUrl(domain, size = 64) {
    // DuckDuckGo is more reliable for obscure domains and returns fewer 404s
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

/**
 * Handle favicon load error with fallback chain
 * @param {HTMLImageElement} img - Image element
 * @param {string} domain - Domain for fallback attempts
 */
function handleFaviconError(img, domain) {
    // Prevent infinite loop if domain is invalid
    if (!domain || domain === 'example.com') {
        img.onerror = null;
        img.src = 'public/img/favicon64.png';
        return;
    }

    const fallbacks = [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        'public/img/favicon64.png'
    ];
    
    // Store attempts on the element to track progress
    let attempt = parseInt(img.getAttribute('data-favicon-attempt') || '0');
    
    if (attempt < fallbacks.length) {
        img.setAttribute('data-favicon-attempt', attempt + 1);
        img.src = fallbacks[attempt];
    } else {
        // Final fallback
        img.onerror = null;
        img.src = 'public/img/favicon64.png';
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ...module.exports,
        getFaviconUrl,
        handleFaviconError
    };
}

function renderCard(bookmark) {
    const domain = getDomain(bookmark.url);
    const favicon = getFaviconUrl(domain, 64);
    const desc = bookmark.desc || bookmark.description || '暂无描述';
    const hasActiveTag = activeTag && (bookmark.tags || []).includes(activeTag);

    return `
        <div class="bm-card${hasActiveTag ? ' bm-card--highlight' : ''}">
            <a href="${bookmark.url}" target="_blank" rel="noopener" class="bm-card-link" title="${bookmark.title}">
                <div class="bm-card-top">
                    <div class="bm-card-favicon">
                        <img src="${favicon}" loading="lazy" alt=""
                             onerror="handleFaviconError(this, '${domain}')" />
                    </div>
                    <span class="bm-card-domain">${domain}</span>
                    <div class="bm-card-actions">
                        <button class="bm-card-copy" onclick="copyBookmarkLink('${bookmark.url}', event)" title="复制链接" aria-label="复制链接">
                            <i data-lucide="copy"></i>
                        </button>
                        <span class="bm-card-ext">
                            <i data-lucide="external-link"></i>
                        </span>
                    </div>
                </div>
                <h3 class="bm-card-title">${bookmark.title}</h3>
                <p class="bm-card-desc" title="${desc}">${desc}</p>
            </a>
            <div class="bm-card-tags">
                ${(bookmark.tags || []).slice(0, 4).map(tag => {
                    const isActive = tag === activeTag;
                    return `<button class="bm-tag${isActive ? ' bm-tag--active' : ''}"
                        onclick="filterByTag('${tag}')" aria-label="按标签 #${tag} 筛选">
                        #${tag}
                    </button>`;
                }).join('')}
            </div>
        </div>
    `;
}

function getDomain(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return 'example.com';
    }
}

/**
 * Extract domain from URL (no try-catch, simpler version)
 * @param {string} url - The URL
 * @returns {string} - Domain name or empty string
 */
function getDomainFromUrl(url) {
    if (!url) return '';
    try {
        const domain = new URL(url).hostname;
        return domain.replace(/^www\./i, ''); // Remove www. prefix
    } catch (e) {
        // Try to extract domain manually for malformed URLs
        const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/i);
        return match ? match[1] : '';
    }
}
