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
        
        // Filter by search text
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
            btn.innerHTML = '<i data-lucide="check" class="w-4 h-4 text-green-500"></i>';
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
        <div class="space-y-12">
            <div>
                <div class="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg mb-8 animate-pulse"></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    ${Array(8).fill(0).map(() => `
                        <div class="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse">
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                            </div>
                            <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
                            <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full mb-2"></div>
                            <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3 mb-4"></div>
                            <div class="flex gap-2 mt-auto">
                                <div class="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                <div class="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
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
                <div class="text-center py-12 text-slate-400">
                    <p>暂无书签数据</p>
                </div>
            `;
        } else {
            renderPage();
        }
        
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
            <div class="text-center py-12 text-red-500">
                <p>加载失败: ${e.message}</p>
                <button onclick="_bookmarksInitialized=false;initBookmarksPage()" class="text-blue-600 underline text-sm mt-2">重试</button>
            </div>
        `;
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
                        <button onclick="clearAllFilters()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
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
    allBtn.className = `px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === 'all' && !searchQuery ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`;
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
        btn.className = `px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === catKey && !searchQuery ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`;
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
        indicator.className = 'flex justify-center mb-8 animate-fade-in-up';
        indicator.innerHTML = `
            <div class="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 shadow-sm">
                <span class="mr-2 text-sm">当前标签: <span class="font-bold">#${activeTag}</span></span>
                <button onclick="filterByTag('${activeTag}')" class="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full transition-colors" title="清除筛选">
                    <i data-lucide="x" class="w-4 h-4"></i>
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
        section.className = 'scroll-mt-32 mb-12'; // Added spacing
        
        // Primary Header
        let sectionHTML = `
            <div class="flex items-center mb-6">
                <div class="h-8 w-1 bg-blue-600 rounded-full mr-4"></div>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white">${catName}</h2>
                <span class="ml-3 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500">${items.length}</span>
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
            <div class="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 mb-8">
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
                <div class="mb-4 mt-2 ml-1">
                    <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>
                        ${subName}
                    </h3>
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
    // Use 64px minimum size for clarity
    const favicon = getFaviconUrl(domain, 64);
    
    // Check if tags match active tag to highlight
    const highlightClass = activeTag && (bookmark.tags || []).includes(activeTag) ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : '';
    const desc = bookmark.desc || bookmark.description;
    
    return `
        <div class="break-inside-avoid mb-6 group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${highlightClass}">
            <div class="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            
            <a href="${bookmark.url}" target="_blank" rel="noopener" class="flex-grow p-6 pb-2 flex flex-col z-10" title="${bookmark.title}">
                <div class="relative flex items-center justify-between mb-4">
                    <div class="relative w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 p-2 border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-300">
                        <img src="${favicon}" loading="lazy" alt="" class="w-full h-full object-contain" onerror="handleFaviconError(this, '${domain}')"/>
                    </div>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-2 group-hover:translate-x-0">
                        <button onclick="copyBookmarkLink('${bookmark.url}', event)" class="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white/80 dark:bg-slate-800/80 rounded-lg backdrop-blur-sm transition-colors" title="复制链接">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                        </button>
                        <div class="p-2 text-slate-400">
                            <i data-lucide="external-link" class="w-4 h-4"></i>
                        </div>
                    </div>
                </div>
                
                <h3 class="relative text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    ${bookmark.title}
                </h3>
                
                <p class="relative text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 flex-grow" title="${bookmark.desc || bookmark.description || ''}">
                    ${bookmark.desc || bookmark.description || '暂无描述'}
                </p>
            </a>
            
            <div class="relative px-6 pb-6 pt-0 mt-auto z-10 flex flex-wrap gap-2">
                ${(bookmark.tags || []).slice(0, 3).map(tag => {
                    const isActive = tag === activeTag;
                    const activeClass = isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400';
                    return `
                    <button onclick="filterByTag('${tag}')" class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${activeClass}">
                        #${tag}
                    </button>
                `}).join('')}
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
