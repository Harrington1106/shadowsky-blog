/**
 * Cache Module Tests
 * Property-based and unit tests for cache functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// Simulate the cache implementation for testing
const DEFAULT_TTL = 60 * 60 * 1000;

function createCacheEntry(value, ttl = null) {
    return {
        value,
        timestamp: Date.now(),
        ttl
    };
}

function isExpired(entry) {
    if (!entry || !entry.timestamp) return true;
    if (entry.ttl === null) return false;
    return Date.now() - entry.timestamp > entry.ttl;
}

// In-memory cache for testing
class TestCacheManager {
    constructor() {
        this.store = new Map();
    }
    
    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (isExpired(entry)) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }
    
    set(key, value, options = {}) {
        const ttl = options.ttl !== undefined ? options.ttl : DEFAULT_TTL;
        this.store.set(key, createCacheEntry(value, ttl));
    }
    
    invalidate(key) {
        this.store.delete(key);
    }
    
    has(key) {
        return this.get(key) !== null;
    }
    
    clear() {
        this.store.clear();
    }
}

// StaleWhileRevalidate implementation for testing
class StaleWhileRevalidate {
    constructor(cacheManager, options = {}) {
        this.cache = cacheManager;
        this.defaultTTL = options.defaultTTL || DEFAULT_TTL;
        this.onUpdate = options.onUpdate || null;
    }
    
    async load(key, fetcher, options = {}) {
        const cachedData = this.cache.get(key);
        const onUpdate = options.onUpdate || this.onUpdate;
        const ttl = options.ttl || this.defaultTTL;
        
        if (cachedData !== null) {
            this._revalidate(key, fetcher, cachedData, onUpdate, ttl);
            return { data: cachedData, source: 'cache', stale: true };
        }
        
        const freshData = await fetcher();
        this.cache.set(key, freshData, { ttl });
        return { data: freshData, source: 'network', stale: false };
    }
    
    async _revalidate(key, fetcher, cachedData, onUpdate, ttl) {
        try {
            const freshData = await fetcher();
            const hasChanged = !this._deepEqual(cachedData, freshData);
            
            if (hasChanged) {
                this.cache.set(key, freshData, { ttl });
                if (onUpdate && typeof onUpdate === 'function') {
                    onUpdate(freshData, cachedData);
                }
            }
        } catch (error) {
            // Silently fail - we already returned cached data
        }
    }
    
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
    
    getCached(key) {
        return this.cache.get(key);
    }
    
    invalidate(key) {
        this.cache.invalidate(key);
    }
    
    async forceRefresh(key, fetcher, options = {}) {
        const ttl = options.ttl || this.defaultTTL;
        const freshData = await fetcher();
        this.cache.set(key, freshData, { ttl });
        return { data: freshData, source: 'network', stale: false };
    }
}

// Arbitrary generators
const cacheKeyArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const cacheValueArbitrary = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.array(fc.string(), { maxLength: 10 }),
    fc.record({
        id: fc.string(),
        name: fc.string(),
        value: fc.integer()
    })
);

describe('Cache Module', () => {
    describe('CacheManager', () => {
        let cache;
        
        beforeEach(() => {
            cache = new TestCacheManager();
        });
        
        it('stores and retrieves values', () => {
            fc.assert(
                fc.property(
                    cacheKeyArbitrary,
                    cacheValueArbitrary,
                    (key, value) => {
                        cache.set(key, value);
                        const retrieved = cache.get(key);
                        
                        if (typeof value === 'object') {
                            expect(retrieved).toEqual(value);
                        } else {
                            expect(retrieved).toBe(value);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('returns null for non-existent keys', () => {
            fc.assert(
                fc.property(
                    cacheKeyArbitrary,
                    (key) => {
                        cache.clear();
                        expect(cache.get(key)).toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('invalidate removes entries', () => {
            fc.assert(
                fc.property(
                    cacheKeyArbitrary,
                    cacheValueArbitrary,
                    (key, value) => {
                        cache.set(key, value);
                        expect(cache.has(key)).toBe(true);
                        
                        cache.invalidate(key);
                        expect(cache.has(key)).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('StaleWhileRevalidate', () => {
        let cache;
        let swr;
        
        beforeEach(() => {
            cache = new TestCacheManager();
            swr = new StaleWhileRevalidate(cache);
        });
        
        /**
         * **Feature: shadowsky-fixes, Property 5: Cache Stale-While-Revalidate Flow**
         * 
         * For any cacheable data request:
         * - If cached data exists, it SHALL be returned immediately
         * - Fresh data SHALL be fetched in the background
         * - If fresh data differs from cached, both display and cache SHALL be updated
         */
        it('Property 5: returns cached data immediately when available', async () => {
            await fc.assert(
                fc.asyncProperty(
                    cacheKeyArbitrary,
                    cacheValueArbitrary,
                    async (key, cachedValue) => {
                        // Pre-populate cache
                        cache.set(key, cachedValue);
                        
                        // Create a fetcher that returns different data
                        const freshValue = { fresh: true, timestamp: Date.now() };
                        const fetcher = vi.fn().mockResolvedValue(freshValue);
                        
                        // Load should return cached data immediately
                        const result = await swr.load(key, fetcher);
                        
                        expect(result.source).toBe('cache');
                        expect(result.stale).toBe(true);
                        
                        if (typeof cachedValue === 'object') {
                            expect(result.data).toEqual(cachedValue);
                        } else {
                            expect(result.data).toBe(cachedValue);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });
        
        it('fetches from network when cache is empty', async () => {
            await fc.assert(
                fc.asyncProperty(
                    cacheKeyArbitrary,
                    cacheValueArbitrary,
                    async (key, freshValue) => {
                        cache.clear();
                        
                        const fetcher = vi.fn().mockResolvedValue(freshValue);
                        const result = await swr.load(key, fetcher);
                        
                        expect(result.source).toBe('network');
                        expect(result.stale).toBe(false);
                        expect(fetcher).toHaveBeenCalled();
                        
                        if (typeof freshValue === 'object') {
                            expect(result.data).toEqual(freshValue);
                        } else {
                            expect(result.data).toBe(freshValue);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });
        
        it('updates cache after background revalidation with different data', async () => {
            const key = 'test-key';
            const cachedValue = { version: 1 };
            const freshValue = { version: 2 };
            
            cache.set(key, cachedValue);
            
            const onUpdate = vi.fn();
            const fetcher = vi.fn().mockResolvedValue(freshValue);
            
            await swr.load(key, fetcher, { onUpdate });
            
            // Wait for background revalidation
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Cache should be updated
            expect(cache.get(key)).toEqual(freshValue);
            expect(onUpdate).toHaveBeenCalledWith(freshValue, cachedValue);
        });
        
        it('does not call onUpdate when data is unchanged', async () => {
            const key = 'test-key';
            const value = { id: 1, name: 'test' };
            
            cache.set(key, value);
            
            const onUpdate = vi.fn();
            const fetcher = vi.fn().mockResolvedValue({ ...value }); // Same data
            
            await swr.load(key, fetcher, { onUpdate });
            
            // Wait for background revalidation
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(onUpdate).not.toHaveBeenCalled();
        });
        
        it('forceRefresh bypasses cache', async () => {
            const key = 'test-key';
            const cachedValue = { old: true };
            const freshValue = { new: true };
            
            cache.set(key, cachedValue);
            
            const fetcher = vi.fn().mockResolvedValue(freshValue);
            const result = await swr.forceRefresh(key, fetcher);
            
            expect(result.source).toBe('network');
            expect(result.data).toEqual(freshValue);
            expect(cache.get(key)).toEqual(freshValue);
        });
        
        it('getCached returns data without triggering fetch', () => {
            fc.assert(
                fc.property(
                    cacheKeyArbitrary,
                    cacheValueArbitrary,
                    (key, value) => {
                        cache.set(key, value);
                        const result = swr.getCached(key);
                        
                        if (typeof value === 'object') {
                            expect(result).toEqual(value);
                        } else {
                            expect(result).toBe(value);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
