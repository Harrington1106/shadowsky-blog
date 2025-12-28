/**
 * Blog Module
 * Provides pagination, reading time calculation, and blog list caching
 * 
 * @module blog
 */

// Constants
const WORDS_PER_MINUTE = 200; // Average reading speed
const DEFAULT_PER_PAGE = 10;

/**
 * Calculate estimated reading time in minutes
 * @param {number} wordCount - Number of words in the article
 * @returns {number} - Reading time in minutes (minimum 1)
 */
function calculateReadingTime(wordCount) {
    if (typeof wordCount !== 'number' || wordCount < 0 || isNaN(wordCount)) {
        return 1;
    }
    const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
    return Math.max(1, minutes);
}

/**
 * Count words in text (supports Chinese and English)
 * @param {string} text - Text to count words in
 * @returns {number} - Word count
 */
function countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // Remove HTML tags
    const cleanText = text.replace(/<[^>]*>/g, '');
    
    // Count Chinese characters (each character = 1 word)
    const chineseChars = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length;
    
    // Count English words
    const englishWords = cleanText
        .replace(/[\u4e00-\u9fa5]/g, ' ') // Replace Chinese with spaces
        .split(/\s+/)
        .filter(word => word.length > 0).length;
    
    return chineseChars + englishWords;
}

/**
 * Format reading time for display
 * @param {number} minutes - Reading time in minutes
 * @returns {string} - Formatted string like "5 分钟阅读"
 */
function formatReadingTime(minutes) {
    if (minutes <= 1) return '1 分钟阅读';
    return `${minutes} 分钟阅读`;
}

/**
 * Paginate an array of items
 * @param {Array} items - Array of items to paginate
 * @param {number} page - Current page number (1-indexed)
 * @param {number} perPage - Items per page
 * @returns {{items: Array, totalPages: number, currentPage: number, totalItems: number, hasNext: boolean, hasPrev: boolean}}
 */
function paginate(items, page = 1, perPage = DEFAULT_PER_PAGE) {
    // Validate inputs
    if (!Array.isArray(items)) {
        return {
            items: [],
            totalPages: 0,
            currentPage: 1,
            totalItems: 0,
            hasNext: false,
            hasPrev: false
        };
    }
    
    // Ensure valid page and perPage values
    const validPerPage = Math.max(1, Math.floor(perPage) || DEFAULT_PER_PAGE);
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / validPerPage));
    const validPage = Math.max(1, Math.min(Math.floor(page) || 1, totalPages));
    
    // Calculate slice indices
    const startIndex = (validPage - 1) * validPerPage;
    const endIndex = Math.min(startIndex + validPerPage, totalItems);
    
    return {
        items: items.slice(startIndex, endIndex),
        totalPages,
        currentPage: validPage,
        totalItems,
        hasNext: validPage < totalPages,
        hasPrev: validPage > 1
    };
}

/**
 * Generate pagination UI HTML
 * @param {Object} paginationResult - Result from paginate()
 * @param {Function} onPageChange - Callback function for page changes
 * @returns {string} - HTML string for pagination controls
 */
function generatePaginationHTML(paginationResult, baseUrl = '') {
    const { currentPage, totalPages, hasNext, hasPrev } = paginationResult;
    
    if (totalPages <= 1) return '';
    
    let html = '<nav class="flex justify-center items-center gap-2 mt-8" aria-label="分页导航">';
    
    // Previous button
    if (hasPrev) {
        html += `<a href="${baseUrl}?page=${currentPage - 1}" class="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="上一页">
            <i data-lucide="chevron-left" class="w-4 h-4"></i>
        </a>`;
    } else {
        html += `<span class="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 cursor-not-allowed">
            <i data-lucide="chevron-left" class="w-4 h-4"></i>
        </span>`;
    }
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<a href="${baseUrl}?page=1" class="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">1</a>`;
        if (startPage > 2) {
            html += '<span class="px-2 text-gray-400">...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<span class="px-3 py-2 rounded-lg bg-blue-600 text-white font-medium">${i}</span>`;
        } else {
            html += `<a href="${baseUrl}?page=${i}" class="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">${i}</a>`;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span class="px-2 text-gray-400">...</span>';
        }
        html += `<a href="${baseUrl}?page=${totalPages}" class="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">${totalPages}</a>`;
    }
    
    // Next button
    if (hasNext) {
        html += `<a href="${baseUrl}?page=${currentPage + 1}" class="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="下一页">
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
        </a>`;
    } else {
        html += `<span class="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 cursor-not-allowed">
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
        </span>`;
    }
    
    html += '</nav>';
    return html;
}

/**
 * Get current page from URL query string
 * @returns {number} - Current page number
 */
function getCurrentPageFromURL() {
    const params = new URLSearchParams(window.location.search);
    const page = parseInt(params.get('page'), 10);
    return isNaN(page) || page < 1 ? 1 : page;
}

/**
 * Blog cache manager using the cache module
 */
const BlogCache = {
    CACHE_KEY: 'blog_posts',
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    
    /**
     * Get cached posts
     * @returns {Array|null}
     */
    get() {
        if (typeof window !== 'undefined' && window.cacheManager) {
            return window.cacheManager.get(this.CACHE_KEY);
        }
        return null;
    },
    
    /**
     * Set posts in cache
     * @param {Array} posts
     */
    set(posts) {
        if (typeof window !== 'undefined' && window.cacheManager) {
            window.cacheManager.set(this.CACHE_KEY, posts, { ttl: this.CACHE_TTL });
        }
    },
    
    /**
     * Invalidate cache
     */
    invalidate() {
        if (typeof window !== 'undefined' && window.cacheManager) {
            window.cacheManager.invalidate(this.CACHE_KEY);
        }
    }
};

// Export for ES modules and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateReadingTime,
        countWords,
        formatReadingTime,
        paginate,
        generatePaginationHTML,
        getCurrentPageFromURL,
        BlogCache,
        WORDS_PER_MINUTE,
        DEFAULT_PER_PAGE
    };
}

// Global exports for browser
if (typeof window !== 'undefined') {
    window.calculateReadingTime = calculateReadingTime;
    window.countWords = countWords;
    window.formatReadingTime = formatReadingTime;
    window.paginate = paginate;
    window.generatePaginationHTML = generatePaginationHTML;
    window.getCurrentPageFromURL = getCurrentPageFromURL;
    window.BlogCache = BlogCache;
}
