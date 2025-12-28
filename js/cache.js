/**
 * Cache Management Module
 * Provides localStorage wrapper with TTL support and cache invalidation
 * 
 * @module cache
 */

// Storage Keys
const STORAGE_KEYS = {
    THEME: 'theme',
    READING_POSITIONS: 'reading_positions',
    BLOG_CACHE: 'blog_cache',
    WATCH_HISTORY: 'watch_history',
    BOOKMARKS_CACHE: 'bookmarks_cache',
    OFFLINE_ARTICLES: 'offline_articles'
};

// Default TTL: 1 hour
const DEFAULT_TTL = 60 * 60 * 1000;

/**
 * Check if localStorage is available
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Cache entry wrapper with metadata
 * @typedef {Object} CacheEntry
 * @property {any} value - The cached value
 * @property {number} timestamp - When the entry was created
 * @property {number|null} ttl - Time to live in milliseconds
 */

/**
 * Create a cache entry with metadata
 * @param {any} value - Value to cache
 * @param {number|null} ttl - Time to live in milliseconds
 * @returns {CacheEntry}
 */
function createCacheEntry(value, ttl = null) {
    return {
        value,
        timestamp: Date.now(),
        ttl
    };
}

/**
 * Check if a cache entry is expired
 * @param {CacheEntry} entry - Cache entry to check
 * @returns {boolean}
 */
function isExpired(entry) {
    if (!entry || !entry.timestamp) return true;
    if (entry.ttl === null) return false; // No TTL means never expires
    return Date.now() - entry.timestamp > entry.ttl;
}

/**
 * CacheManager class for managing cached data
 */
class CacheManager {
    constructor(options = {}) {
        this.prefix = options.prefix || 'cache_';
        this.defaultTTL = options.defaultTTL || DEFAULT_TTL;
        this.available = isLocalStorageAvailable();
        
        if (!this.available) {
            console.warn('[CacheManager] localStorage is not available, using in-memory fallback');
            this.memoryCache = new Map();
        }
    }
    
    /**
     * Get the full storage key with prefix
     * @private
     */
    _getKey(key) {
        return `${this.prefix}${key}`;
    }
    
    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} - Cached value or null if not found/expired
     */
    get(key) {
        const fullKey = this._getKey(key);
        
        try {
            let raw;
            if (this.available) {
                raw = localStorage.getItem(fullKey);
            } else {
                raw = this.memoryCache.get(fullKey);
            }
            
            if (!raw) return null;
            
            const entry = typeof raw === 'string' ? JSON.parse(raw) : raw;
            
            if (isExpired(entry)) {
                this.invalidate(key);
                return null;
            }
            
            return entry.value;
        } catch (e) {
            console.error(`[CacheManager] Error reading key "${key}":`, e);
            return null;
        }
    }
    
    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {Object} options - Cache options
     * @param {number} [options.ttl] - Time to live in milliseconds
     */
    set(key, value, options = {}) {
        const fullKey = this._getKey(key);
        const ttl = options.ttl !== undefined ? options.ttl : this.defaultTTL;
        
        try {
            const entry = createCacheEntry(value, ttl);
            
            if (this.available) {
                localStorage.setItem(fullKey, JSON.stringify(entry));
            } else {
                this.memoryCache.set(fullKey, entry);
            }
        } catch (e) {
            console.error(`[CacheManager] Error setting key "${key}":`, e);
            
            // If quota exceeded, try to clear old entries
            if (e.name === 'QuotaExceededError') {
                this.clearExpired();
                try {
                    const entry = createCacheEntry(value, ttl);
                    localStorage.setItem(fullKey, JSON.stringify(entry));
                } catch (e2) {
                    console.error('[CacheManager] Still unable to save after clearing expired entries');
                }
            }
        }
    }
    
    /**
     * Invalidate (remove) a cache entry
     * @param {string} key - Cache key
     */
    invalidate(key) {
        const fullKey = this._getKey(key);
        
        try {
            if (this.available) {
                localStorage.removeItem(fullKey);
            } else {
                this.memoryCache.delete(fullKey);
            }
        } catch (e) {
            console.error(`[CacheManager] Error invalidating key "${key}":`, e);
        }
    }
    
    /**
     * Check if a key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }
    
    /**
     * Clear all cache entries with this manager's prefix
     */
    clear() {
        try {
            if (this.available) {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
            } else {
                this.memoryCache.clear();
            }
        } catch (e) {
            console.error('[CacheManager] Error clearing cache:', e);
        }
    }
    
    /**
     * Clear all expired entries
     */
    clearExpired() {
        try {
            if (this.available) {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        try {
                            const raw = localStorage.getItem(key);
                            const entry = JSON.parse(raw);
                            if (isExpired(entry)) {
                                keysToRemove.push(key);
                            }
                        } catch (e) {
                            // Invalid entry, remove it
                            keysToRemove.push(key);
                        }
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                console.log(`[CacheManager] Cleared ${keysToRemove.length} expired entries`);
            } else {
                for (const [key, entry] of this.memoryCache.entries()) {
                    if (isExpired(entry)) {
                        this.memoryCache.delete(key);
                    }
                }
            }
        } catch (e) {
            console.error('[CacheManager] Error clearing expired entries:', e);
        }
    }
    
    /**
     * Get cache statistics
     * @returns {{count: number, size: number}}
     */
    getStats() {
        let count = 0;
        let size = 0;
        
        try {
            if (this.available) {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        count++;
                        const value = localStorage.getItem(key);
                        size += (key.length + (value ? value.length : 0)) * 2; // UTF-16
                    }
                }
            } else {
                count = this.memoryCache.size;
                for (const [key, value] of this.memoryCache.entries()) {
                    size += JSON.stringify({ key, value }).length * 2;
                }
            }
        } catch (e) {
            console.error('[CacheManager] Error getting stats:', e);
        }
        
        return { count, size };
    }
}

/**
 * StaleWhileRevalidate - Implements stale-while-revalidate caching strategy
 * Returns cached data immediately while fetching fresh data in background
 */
class StaleWhileRevalidate {
    constructor(cacheManager, options = {}) {
        this.cache = cacheManager;
        this.defaultTTL = options.defaultTTL || DEFAULT_TTL;
        this.onUpdate = options.onUpdate || null; // Callback when fresh data differs
    }
    
    /**
     * Load data with stale-while-revalidate strategy
     * @param {string} key - Cache key
     * @param {Function} fetcher - Async function to fetch fresh data
     * @param {Object} options - Options
     * @param {Function} [options.onUpdate] - Callback when data is updated
     * @param {number} [options.ttl] - Cache TTL
     * @returns {Promise<{data: any, source: 'cache'|'network', stale: boolean}>}
     */
    async load(key, fetcher, options = {}) {
        const cachedData = this.cache.get(key);
        const onUpdate = options.onUpdate || this.onUpdate;
        const ttl = options.ttl || this.defaultTTL;
        
        // If we have cached data, return it immediately and revalidate in background
        if (cachedData !== null) {
            // Start background revalidation
            this._revalidate(key, fetcher, cachedData, onUpdate, ttl);
            
            return {
                data: cachedData,
                source: 'cache',
                stale: true
            };
        }
        
        // No cached data, must fetch from network
        try {
            const freshData = await fetcher();
            this.cache.set(key, freshData, { ttl });
            
            return {
                data: freshData,
                source: 'network',
                stale: false
            };
        } catch (error) {
            console.error(`[SWR] Network fetch failed for "${key}":`, error);
            throw error;
        }
    }
    
    /**
     * Background revalidation
     * @private
     */
    async _revalidate(key, fetcher, cachedData, onUpdate, ttl) {
        try {
            const freshData = await fetcher();
            
            // Check if data has changed
            const hasChanged = !this._deepEqual(cachedData, freshData);
            
            if (hasChanged) {
                // Update cache
                this.cache.set(key, freshData, { ttl });
                
                // Notify listener
                if (onUpdate && typeof onUpdate === 'function') {
                    onUpdate(freshData, cachedData);
                }
            }
        } catch (error) {
            console.warn(`[SWR] Background revalidation failed for "${key}":`, error);
            // Don't throw - we already returned cached data
        }
    }
    
    /**
     * Deep equality check for objects/arrays
     * @private
     */
    _deepEqual(a, b) {
        if (a === b) return true;
        if (a === null || b === null) return false;
        if (typeof a !== typeof b) return false;
        
        if (typeof a === 'object') {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            
            if (keysA.length !== keysB.length) return false;
            
            for (const key of keysA) {
                if (!this._deepEqual(a[key], b[key])) return false;
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * Get cached data without triggering revalidation
     * @param {string} key - Cache key
     * @returns {any|null}
     */
    getCached(key) {
        return this.cache.get(key);
    }
    
    /**
     * Invalidate cache entry
     * @param {string} key - Cache key
     */
    invalidate(key) {
        this.cache.invalidate(key);
    }
    
    /**
     * Force refresh - bypass cache and fetch fresh data
     * @param {string} key - Cache key
     * @param {Function} fetcher - Async function to fetch fresh data
     * @param {Object} options - Options
     * @returns {Promise<{data: any, source: 'network', stale: false}>}
     */
    async forceRefresh(key, fetcher, options = {}) {
        const ttl = options.ttl || this.defaultTTL;
        const freshData = await fetcher();
        this.cache.set(key, freshData, { ttl });
        
        return {
            data: freshData,
            source: 'network',
            stale: false
        };
    }
}

// Default cache manager instance
const cacheManager = new CacheManager();

// Default SWR instance
const swrCache = new StaleWhileRevalidate(cacheManager);

// Export for ES modules and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CacheManager,
        StaleWhileRevalidate,
        cacheManager,
        swrCache,
        createCacheEntry,
        isExpired,
        isLocalStorageAvailable,
        STORAGE_KEYS,
        DEFAULT_TTL
    };
}

// Global exports for browser
if (typeof window !== 'undefined') {
    window.CacheManager = CacheManager;
    window.StaleWhileRevalidate = StaleWhileRevalidate;
    window.cacheManager = cacheManager;
    window.swrCache = swrCache;
    window.STORAGE_KEYS = STORAGE_KEYS;
}
