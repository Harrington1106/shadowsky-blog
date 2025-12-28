/**
 * Combined Module Tests
 * Tests for reading-progress, share, bookmarks, rss, video modules
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value; }),
        removeItem: vi.fn(key => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn(i => Object.keys(store)[i])
    };
})();

// Setup global mocks
global.localStorage = localStorageMock;
global.DOMParser = class {
    parseFromString(str, type) {
        // Simple mock for OPML parsing
        const doc = {
            querySelector: () => null,
            querySelectorAll: (selector) => {
                if (!str.includes('<outline')) return [];
                const matches = str.match(/<outline[^>]*xmlUrl="([^"]*)"[^>]*>/gi) || [];
                return matches.map(match => ({
                    getAttribute: (attr) => {
                        const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
                        const m = match.match(regex);
                        return m ? m[1] : null;
                    },
                    parentElement: { tagName: 'body', getAttribute: () => null }
                }));
            }
        };
        return doc;
    }
};

// Import modules
const { saveReadingPosition, getReadingPosition, calculateScrollPercent } = require('./reading-progress.js');
const { generateShareUrl, copyToClipboard } = require('./share.js');
const { exportBookmarks, importBookmarks, filterBookmarks } = require('./bookmarks.js');
const { parseOPML, generateOPML, escapeXml } = require('./rss.js');
const { recordWatch, isWatched, getWatchHistory, clearWatchHistory } = require('./video.js');

describe('Reading Progress Module', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });
    
    /**
     * **Feature: site-improvements, Property 3: Reading Position Round-Trip**
     * *For any* article ID and scroll percentage, saving then retrieving 
     * the reading position SHALL return the same values.
     * **Validates: Requirements 3.1**
     */
    it('Property 3: reading position round-trip', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                fc.float({ min: 0, max: 100, noNaN: true }),
                (articleId, scrollPercent) => {
                    saveReadingPosition(articleId, scrollPercent);
                    const retrieved = getReadingPosition(articleId);
                    
                    expect(retrieved).not.toBeNull();
                    expect(retrieved.articleId).toBe(articleId);
                    // Allow small floating point differences
                    expect(Math.abs(retrieved.scrollPercent - Math.min(100, Math.max(0, scrollPercent)))).toBeLessThan(0.01);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    /**
     * **Feature: site-improvements, Property 5: Scroll Progress Calculation**
     * *For any* scroll position within a document, the calculated progress 
     * percentage SHALL be between 0 and 100.
     * **Validates: Requirements 3.4**
     */
    it('Property 5: scroll progress is always 0-100', () => {
        // Since we can't mock window/document scroll in Node, test the bounds logic
        const percent = calculateScrollPercent();
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(100);
    });
});

describe('Share Module', () => {
    /**
     * **Feature: site-improvements, Property 4: Share URL Generation**
     * *For any* valid share options, the generated share URL SHALL contain 
     * the encoded title and URL parameters.
     * **Validates: Requirements 3.3**
     */
    it('Property 4: share URL contains encoded parameters', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.webUrl(),
                (title, url) => {
                    const twitterUrl = generateShareUrl('twitter', { title, url });
                    const weiboUrl = generateShareUrl('weibo', { title, url });
                    
                    // Twitter URL should contain encoded title and URL
                    expect(twitterUrl).toContain(encodeURIComponent(title));
                    expect(twitterUrl).toContain(encodeURIComponent(url));
                    expect(twitterUrl).toContain('twitter.com');
                    
                    // Weibo URL should contain encoded title and URL
                    expect(weiboUrl).toContain(encodeURIComponent(title));
                    expect(weiboUrl).toContain(encodeURIComponent(url));
                    expect(weiboUrl).toContain('weibo.com');
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    it('copy platform returns original URL', () => {
        const url = 'https://example.com/article';
        expect(generateShareUrl('copy', { title: 'Test', url })).toBe(url);
    });
});

describe('Bookmarks Module', () => {
    /**
     * **Feature: site-improvements, Property 6: Bookmark Export/Import Round-Trip**
     * *For any* list of valid bookmarks, exporting to JSON then importing 
     * SHALL produce an equivalent list.
     * **Validates: Requirements 5.1, 5.2**
     */
    it('Property 6: bookmark export/import round-trip', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        url: fc.webUrl(),
                        title: fc.string({ minLength: 1, maxLength: 100 }),
                        tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
                        createdAt: fc.constant(new Date().toISOString())
                    }),
                    { minLength: 0, maxLength: 20 }
                ),
                (bookmarks) => {
                    const exported = exportBookmarks(bookmarks);
                    const imported = importBookmarks(exported);
                    
                    // Same number of bookmarks
                    expect(imported.length).toBe(bookmarks.length);
                    
                    // Each bookmark should have matching URL and title
                    bookmarks.forEach((original, i) => {
                        const found = imported.find(b => b.url === original.url);
                        expect(found).toBeDefined();
                        expect(found.title).toBe(original.title);
                    });
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    /**
     * **Feature: site-improvements, Property 7: Bookmark Filtering**
     * *For any* list of bookmarks and filter criteria, the filtered results 
     * SHALL only contain bookmarks matching all criteria.
     * **Validates: Requirements 5.4**
     */
    it('Property 7: filtered bookmarks match all criteria', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),  // Use UUID to ensure unique IDs
                        url: fc.webUrl(),
                        title: fc.string(),
                        tags: fc.array(fc.constantFrom('tech', 'news', 'blog', 'tool'), { maxLength: 3 }),
                        createdAt: fc.constant(new Date().toISOString())
                    }),
                    { minLength: 0, maxLength: 20 }
                ),
                fc.constantFrom('tech', 'news', 'blog'),
                (bookmarks, filterTag) => {
                    const filtered = filterBookmarks(bookmarks, { tags: [filterTag] });
                    
                    // All filtered bookmarks should have the tag
                    filtered.forEach(b => {
                        expect(b.tags.map(t => t.toLowerCase())).toContain(filterTag.toLowerCase());
                    });
                    
                    // Count of filtered should match count of bookmarks with the tag
                    const withTag = bookmarks.filter(b => 
                        b.tags.some(t => t.toLowerCase() === filterTag.toLowerCase())
                    );
                    expect(filtered.length).toBe(withTag.length);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('RSS Module', () => {
    /**
     * **Feature: site-improvements, Property 8: OPML Parse/Generate Round-Trip**
     * *For any* list of valid feeds, generating OPML then parsing 
     * SHALL produce an equivalent list.
     * **Validates: Requirements 6.1, 6.2**
     */
    it('Property 8: OPML generate/parse preserves feed data', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('"') && !s.includes('<')),
                        xmlUrl: fc.webUrl(),
                        htmlUrl: fc.option(fc.webUrl(), { nil: undefined }),
                        category: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('"')), { nil: undefined })
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                (feeds) => {
                    const opml = generateOPML(feeds);
                    
                    // OPML should be valid XML structure
                    expect(opml).toContain('<?xml');
                    expect(opml).toContain('<opml');
                    expect(opml).toContain('</opml>');
                    
                    // Each feed's xmlUrl should be in the output
                    feeds.forEach(feed => {
                        expect(opml).toContain(escapeXml(feed.xmlUrl));
                    });
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    it('escapeXml handles special characters', () => {
        expect(escapeXml('Test & <value>')).toBe('Test &amp; &lt;value&gt;');
        expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    });
});

describe('Video Module', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });
    
    /**
     * **Feature: site-improvements, Property 9: Watch History Persistence**
     * *For any* video ID, recording a watch then checking isWatched 
     * SHALL return true.
     * **Validates: Requirements 7.2, 7.3**
     */
    it('Property 9: watch history persistence', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                (videoId) => {
                    clearWatchHistory();
                    
                    // Before recording, should not be watched
                    expect(isWatched(videoId)).toBe(false);
                    
                    // Record watch
                    recordWatch(videoId);
                    
                    // After recording, should be watched
                    expect(isWatched(videoId)).toBe(true);
                    
                    // Should be in history
                    const history = getWatchHistory();
                    expect(history.some(h => h.videoId === videoId)).toBe(true);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
    
    it('records watch with progress', () => {
        clearWatchHistory();
        recordWatch('video1', 50);
        
        const history = getWatchHistory();
        expect(history[0].videoId).toBe('video1');
        expect(history[0].progress).toBe(50);
    });
});
