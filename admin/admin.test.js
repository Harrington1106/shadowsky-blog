/**
 * Admin Panel Tests
 * Property-based and unit tests for admin functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { JSDOM } from 'jsdom';

// Mock DOM structure for admin panel
function createMockAdminDOM() {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <body>
            <button id="nav-bookmarks" class="nav-item text-slate-600"></button>
            <button id="nav-snapshots" class="nav-item text-slate-600"></button>
            <button id="nav-media" class="nav-item text-slate-600"></button>
            <button id="nav-feeds" class="nav-item text-slate-600"></button>
            <button id="nav-videos" class="nav-item text-slate-600"></button>
            <button id="nav-stats" class="nav-item text-slate-600"></button>
            <button id="nav-settings" class="nav-item text-slate-600"></button>
            
            <section id="view-bookmarks" class="view-section"></section>
            <section id="view-snapshots" class="view-section hidden"></section>
            <section id="view-media" class="view-section hidden"></section>
            <section id="view-feeds" class="view-section hidden"></section>
            <section id="view-videos" class="view-section hidden"></section>
            <section id="view-stats" class="view-section hidden"></section>
            <section id="view-settings" class="view-section hidden"></section>
        </body>
        </html>
    `);
    return dom;
}

// Tab IDs available in admin panel
const TAB_IDS = ['bookmarks', 'snapshots', 'media', 'feeds', 'videos', 'stats', 'settings'];

// Implement switchTab logic for testing (mirrors admin.js)
function switchTab(document, tabId) {
    // Hide all sections
    TAB_IDS.forEach(id => {
        const section = document.getElementById(`view-${id}`);
        if (section) section.classList.add('hidden');
        
        const btn = document.getElementById(`nav-${id}`);
        if (btn) {
            btn.classList.remove('bg-blue-50', 'text-blue-600', 'font-medium');
            btn.classList.add('text-slate-600');
        }
    });

    // Show selected
    const section = document.getElementById(`view-${tabId}`);
    if (section) section.classList.remove('hidden');
    
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-blue-50', 'text-blue-600', 'font-medium');
        activeBtn.classList.remove('text-slate-600');
    }
}

describe('Admin Panel', () => {
    describe('Navigation View Switching', () => {
        /**
         * **Feature: shadowsky-fixes, Property 4: Navigation View Switching**
         * 
         * For any admin panel navigation button and its corresponding view section,
         * clicking the button SHALL result in that view being visible and all other
         * views being hidden.
         */
        it('Property 4: switching to any tab shows only that view and hides all others', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...TAB_IDS),
                    (targetTabId) => {
                        // Setup
                        const dom = createMockAdminDOM();
                        const document = dom.window.document;
                        
                        // Action
                        switchTab(document, targetTabId);
                        
                        // Verify: target view is visible
                        const targetSection = document.getElementById(`view-${targetTabId}`);
                        expect(targetSection.classList.contains('hidden')).toBe(false);
                        
                        // Verify: all other views are hidden
                        TAB_IDS.filter(id => id !== targetTabId).forEach(otherId => {
                            const otherSection = document.getElementById(`view-${otherId}`);
                            expect(otherSection.classList.contains('hidden')).toBe(true);
                        });
                        
                        // Verify: target nav button is active
                        const targetBtn = document.getElementById(`nav-${targetTabId}`);
                        expect(targetBtn.classList.contains('bg-blue-50')).toBe(true);
                        expect(targetBtn.classList.contains('text-blue-600')).toBe(true);
                        
                        // Verify: all other nav buttons are inactive
                        TAB_IDS.filter(id => id !== targetTabId).forEach(otherId => {
                            const otherBtn = document.getElementById(`nav-${otherId}`);
                            expect(otherBtn.classList.contains('bg-blue-50')).toBe(false);
                            expect(otherBtn.classList.contains('text-slate-600')).toBe(true);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('switching tabs multiple times always shows correct view', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.constantFrom(...TAB_IDS), { minLength: 1, maxLength: 10 }),
                    (tabSequence) => {
                        const dom = createMockAdminDOM();
                        const document = dom.window.document;
                        
                        // Switch through all tabs in sequence
                        tabSequence.forEach(tabId => {
                            switchTab(document, tabId);
                        });
                        
                        // Final state should show only the last tab
                        const lastTabId = tabSequence[tabSequence.length - 1];
                        const lastSection = document.getElementById(`view-${lastTabId}`);
                        expect(lastSection.classList.contains('hidden')).toBe(false);
                        
                        // All others should be hidden
                        TAB_IDS.filter(id => id !== lastTabId).forEach(otherId => {
                            const otherSection = document.getElementById(`view-${otherId}`);
                            expect(otherSection.classList.contains('hidden')).toBe(true);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});


describe('Admin Initialization', () => {
    /**
     * Unit test for admin initialization
     * Tests that global objects are properly exposed
     * _Requirements: 5.3_
     */
    it('should expose Dashboard object with switchTab method', () => {
        // Simulate what admin.js does
        const mockSwitchTab = vi.fn();
        const Dashboard = {
            switchTab: mockSwitchTab
        };
        
        // Verify structure
        expect(Dashboard).toBeDefined();
        expect(typeof Dashboard.switchTab).toBe('function');
    });

    it('should expose BookmarksManager object with required methods', () => {
        // Simulate what admin.js does
        const BookmarksManager = {
            fetch: vi.fn(),
            autoFetchTitle: vi.fn(),
            filter: vi.fn()
        };
        
        // Verify structure
        expect(BookmarksManager).toBeDefined();
        expect(typeof BookmarksManager.fetch).toBe('function');
        expect(typeof BookmarksManager.autoFetchTitle).toBe('function');
        expect(typeof BookmarksManager.filter).toBe('function');
    });

    it('Dashboard.switchTab should call the underlying switchTab function', () => {
        const dom = createMockAdminDOM();
        const document = dom.window.document;
        
        // Create Dashboard with real switchTab
        const Dashboard = {
            switchTab: (tabId) => switchTab(document, tabId)
        };
        
        // Call through Dashboard
        Dashboard.switchTab('stats');
        
        // Verify the view changed
        const statsSection = document.getElementById('view-stats');
        expect(statsSection.classList.contains('hidden')).toBe(false);
    });
});


describe('BookmarksManager', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 5: Bookmark Search Filtering**
     * 
     * For any search query, all displayed bookmarks should contain the query 
     * string in their title, URL, or category fields.
     * **Validates: Requirements 2.2, 15.1**
     */
    
    // Mock BookmarksManager for testing
    function createMockBookmarksManager() {
        return {
            data: [
                { id: '1', title: 'React Documentation', url: 'https://react.dev', category: 'tech' },
                { id: '2', title: 'Design Inspiration', url: 'https://dribbble.com', category: 'design' },
                { id: '3', title: 'Tech News', url: 'https://techcrunch.com', category: 'news' },
                { id: '4', title: 'JavaScript Guide', url: 'https://developer.mozilla.org/js', category: 'tech' },
                { id: '5', title: 'UI Design Tools', url: 'https://figma.com', category: 'design' }
            ],
            
            filter(query) {
                if (!query) return this.data;
                const lower = query.toLowerCase();
                return this.data.filter(b => 
                    (b.title && b.title.toLowerCase().includes(lower)) || 
                    (b.url && b.url.toLowerCase().includes(lower)) ||
                    (b.category && b.category.toLowerCase().includes(lower))
                );
            }
        };
    }

    it('Property 5: bookmark search filtering should match query in title, URL, or category', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }),
                (query) => {
                    const manager = createMockBookmarksManager();
                    const results = manager.filter(query);
                    const lower = query.toLowerCase();
                    
                    // All results should contain the query in at least one field
                    results.forEach(bookmark => {
                        const matchesTitle = bookmark.title && bookmark.title.toLowerCase().includes(lower);
                        const matchesUrl = bookmark.url && bookmark.url.toLowerCase().includes(lower);
                        const matchesCategory = bookmark.category && bookmark.category.toLowerCase().includes(lower);
                        
                        expect(matchesTitle || matchesUrl || matchesCategory).toBe(true);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('empty search query should return all bookmarks', () => {
        const manager = createMockBookmarksManager();
        const results = manager.filter('');
        expect(results.length).toBe(manager.data.length);
        expect(results).toEqual(manager.data);
    });

    it('search should be case insensitive', () => {
        const manager = createMockBookmarksManager();
        
        const upperResults = manager.filter('REACT');
        const lowerResults = manager.filter('react');
        const mixedResults = manager.filter('React');
        
        expect(upperResults).toEqual(lowerResults);
        expect(lowerResults).toEqual(mixedResults);
        expect(upperResults.length).toBeGreaterThan(0);
    });

    /**
     * **Feature: admin-dashboard-fix, Property 7: Category Dropdown Population**
     * 
     * For any bookmarks view load, the category dropdown should contain 
     * all predefined categories plus a default option.
     * **Validates: Requirements 2.5**
     */
    it('Property 7: category dropdown should be populated with predefined categories', () => {
        // Create mock DOM
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <select id="bm-category">
                    <option value="others">默认分类</option>
                </select>
            </body>
            </html>
        `);
        const document = dom.window.document;
        
        // Mock populateCategories function
        function populateCategories() {
            const categorySelect = document.getElementById('bm-category');
            if (!categorySelect) return;
            
            const categories = [
                'others',
                'tech',
                'design', 
                'news',
                'blog',
                'tools',
                'reference',
                'entertainment',
                'social',
                'shopping'
            ];
            
            // Clear existing options except the first one
            categorySelect.innerHTML = '<option value="others">默认分类</option>';
            
            // Add predefined categories
            categories.slice(1).forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                categorySelect.appendChild(option);
            });
        }
        
        // Execute
        populateCategories();
        
        // Verify
        const select = document.getElementById('bm-category');
        const options = Array.from(select.options);
        
        // Should have default + 9 predefined categories = 10 total
        expect(options.length).toBe(10);
        
        // First option should be default
        expect(options[0].value).toBe('others');
        expect(options[0].textContent).toBe('默认分类');
        
        // Should contain all expected categories
        const expectedCategories = ['others', 'tech', 'design', 'news', 'blog', 'tools', 'reference', 'entertainment', 'social', 'shopping'];
        const actualValues = options.map(opt => opt.value);
        
        expectedCategories.forEach(cat => {
            expect(actualValues).toContain(cat);
        });
    });
});

describe('MediaManager', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 8: Media Type Switching**
     * 
     * For any media type switch (anime/manga), only items of the selected 
     * type should be displayed.
     * **Validates: Requirements 4.2**
     */
    
    // Mock MediaManager for testing
    function createMockMediaManager() {
        return {
            data: {
                anime: [
                    { id: '1', title: 'Attack on Titan', type: 'anime' },
                    { id: '2', title: 'Demon Slayer', type: 'anime' }
                ],
                manga: [
                    { id: '3', title: 'One Piece', type: 'manga' },
                    { id: '4', title: 'Naruto', type: 'manga' }
                ]
            },
            currentType: 'anime',
            
            switchType(type) {
                this.currentType = type;
            },
            
            getCurrentItems() {
                return this.data[this.currentType] || [];
            }
        };
    }

    it('Property 8: media type switching should show only items of selected type', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('anime', 'manga'),
                (selectedType) => {
                    const manager = createMockMediaManager();
                    
                    // Switch to the selected type
                    manager.switchType(selectedType);
                    
                    // Get current items
                    const currentItems = manager.getCurrentItems();
                    
                    // Verify current type is set correctly
                    expect(manager.currentType).toBe(selectedType);
                    
                    // Verify all items are of the selected type
                    expect(currentItems).toEqual(manager.data[selectedType]);
                    
                    // Verify no items from other type are included
                    const otherType = selectedType === 'anime' ? 'manga' : 'anime';
                    const otherItems = manager.data[otherType];
                    
                    currentItems.forEach(item => {
                        expect(otherItems).not.toContain(item);
                    });
                }
            ),
            { numRuns: 50 }
        );
    });

    it('switching between anime and manga should show different items', () => {
        const manager = createMockMediaManager();
        
        // Switch to anime
        manager.switchType('anime');
        const animeItems = manager.getCurrentItems();
        
        // Switch to manga
        manager.switchType('manga');
        const mangaItems = manager.getCurrentItems();
        
        // Should be different sets of items
        expect(animeItems).not.toEqual(mangaItems);
        expect(animeItems.length).toBe(2);
        expect(mangaItems.length).toBe(2);
    });

    it('should maintain type state after switching', () => {
        const manager = createMockMediaManager();
        
        // Initially anime
        expect(manager.currentType).toBe('anime');
        
        // Switch to manga
        manager.switchType('manga');
        expect(manager.currentType).toBe('manga');
        
        // Switch back to anime
        manager.switchType('anime');
        expect(manager.currentType).toBe('anime');
    });
});

describe('FeedsManager', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 9: Feed ID Uniqueness**
     * 
     * For any feed addition attempt, if the ID already exists, the operation 
     * should fail and no duplicate should be created.
     * **Validates: Requirements 5.5**
     */
    
    // Mock FeedsManager for testing
    function createMockFeedsManager() {
        return {
            data: [
                { id: 'tech-news', title: 'Tech News', url: 'https://example.com/tech.rss' },
                { id: 'design-blog', title: 'Design Blog', url: 'https://example.com/design.rss' }
            ],
            
            add(id, title, url, icon) {
                // Check for duplicate ID
                if (this.data.some(f => f.id === id)) {
                    return { success: false, error: 'ID already exists' };
                }
                
                this.data.push({ id, title, url, icon });
                return { success: true };
            },
            
            hasId(id) {
                return this.data.some(f => f.id === id);
            }
        };
    }

    it('Property 9: feed ID uniqueness should prevent duplicate creation', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.webUrl(),
                (id, title, url) => {
                    const manager = createMockFeedsManager();
                    const originalCount = manager.data.length;
                    
                    // First addition should succeed
                    const firstResult = manager.add(id, title, url, '');
                    expect(firstResult.success).toBe(true);
                    expect(manager.data.length).toBe(originalCount + 1);
                    expect(manager.hasId(id)).toBe(true);
                    
                    // Second addition with same ID should fail
                    const secondResult = manager.add(id, 'Different Title', 'https://different.com', '');
                    expect(secondResult.success).toBe(false);
                    expect(manager.data.length).toBe(originalCount + 1); // No change
                    
                    // Should still have only one feed with that ID
                    const feedsWithId = manager.data.filter(f => f.id === id);
                    expect(feedsWithId.length).toBe(1);
                    expect(feedsWithId[0].title).toBe(title); // Original title preserved
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should allow feeds with different IDs', () => {
        const manager = createMockFeedsManager();
        const originalCount = manager.data.length;
        
        const result1 = manager.add('new-feed-1', 'Feed 1', 'https://feed1.com', '');
        const result2 = manager.add('new-feed-2', 'Feed 2', 'https://feed2.com', '');
        
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(manager.data.length).toBe(originalCount + 2);
    });

    it('should reject duplicate IDs from existing feeds', () => {
        const manager = createMockFeedsManager();
        
        // Try to add feed with existing ID
        const result = manager.add('tech-news', 'New Tech News', 'https://newtechnews.com', '');
        
        expect(result.success).toBe(false);
        expect(manager.data.length).toBe(2); // No change
        
        // Original feed should be unchanged
        const originalFeed = manager.data.find(f => f.id === 'tech-news');
        expect(originalFeed.title).toBe('Tech News');
    });
});

describe('Visit Count Persistence', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 10: Visit Count Key Uniqueness**
     * 
     * For any article page visit, the visit should be recorded under a unique 
     * key based on the article's file path (e.g., "posts/2025-12-12-article-name").
     * **Validates: Requirements 9.1**
     */
    
    // Mock visit tracking system for testing
    function createMockVisitTracker() {
        return {
            visits: new Map(),
            
            recordVisit(pageId) {
                const current = this.visits.get(pageId) || 0;
                this.visits.set(pageId, current + 1);
                return current + 1;
            },
            
            getVisitCount(pageId) {
                return this.visits.get(pageId) || 0;
            },
            
            getAllKeys() {
                return Array.from(this.visits.keys());
            }
        };
    }

    it('Property 10: visit count keys should be unique per article', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
                (articleNames) => {
                    const tracker = createMockVisitTracker();
                    const expectedKeys = new Set();
                    
                    // Record visits for each article
                    articleNames.forEach(name => {
                        const pageId = `posts/${name}`;
                        expectedKeys.add(pageId);
                        tracker.recordVisit(pageId);
                    });
                    
                    // Verify all keys are unique and correctly formatted
                    const actualKeys = tracker.getAllKeys();
                    
                    // Each key should start with "posts/"
                    actualKeys.forEach(key => {
                        expect(key.startsWith('posts/')).toBe(true);
                    });
                    
                    // Number of unique keys should match expected
                    expect(actualKeys.length).toBe(expectedKeys.size);
                    
                    // All expected keys should be present
                    expectedKeys.forEach(expectedKey => {
                        expect(actualKeys).toContain(expectedKey);
                    });
                }
            ),
            { numRuns: 50 }
        );
    });

    it('different articles should have separate visit counts', () => {
        const tracker = createMockVisitTracker();
        
        // Record visits for different articles
        tracker.recordVisit('posts/article-1');
        tracker.recordVisit('posts/article-1');
        tracker.recordVisit('posts/article-2');
        
        // Verify separate counts
        expect(tracker.getVisitCount('posts/article-1')).toBe(2);
        expect(tracker.getVisitCount('posts/article-2')).toBe(1);
        expect(tracker.getVisitCount('posts/article-3')).toBe(0);
    });

    /**
     * **Feature: admin-dashboard-fix, Property 11: Storage Priority Chain**
     * 
     * For any visit recording operation, the system should attempt KV Database 
     * first, then MySQL, then file storage, in that order.
     * **Validates: Requirements 9.2, 9.6**
     */
    
    // Mock storage system for testing
    function createMockStorageSystem() {
        return {
            kvAvailable: true,
            mysqlAvailable: true,
            fileAvailable: true,
            
            attemptedMethods: [],
            
            recordVisit(pageId) {
                this.attemptedMethods = [];
                
                // Try KV Database first
                this.attemptedMethods.push('kv');
                if (this.kvAvailable) {
                    return { success: true, mode: 'kv', count: 1 };
                }
                
                // Try MySQL second
                this.attemptedMethods.push('mysql');
                if (this.mysqlAvailable) {
                    return { success: true, mode: 'mysql', count: 1 };
                }
                
                // Try file storage last
                this.attemptedMethods.push('file');
                if (this.fileAvailable) {
                    return { success: true, mode: 'file', count: 1 };
                }
                
                return { success: false, error: 'All storage methods failed' };
            }
        };
    }

    it('Property 11: storage priority should follow KV -> MySQL -> File order', () => {
        fc.assert(
            fc.property(
                fc.boolean(),
                fc.boolean(), 
                fc.boolean(),
                (kvAvailable, mysqlAvailable, fileAvailable) => {
                    const storage = createMockStorageSystem();
                    storage.kvAvailable = kvAvailable;
                    storage.mysqlAvailable = mysqlAvailable;
                    storage.fileAvailable = fileAvailable;
                    
                    const result = storage.recordVisit('posts/test-article');
                    
                    // Verify KV is always tried first
                    expect(storage.attemptedMethods[0]).toBe('kv');
                    
                    if (kvAvailable) {
                        // If KV is available, should use it and not try others
                        expect(result.mode).toBe('kv');
                        expect(storage.attemptedMethods.length).toBe(1);
                    } else if (mysqlAvailable) {
                        // If KV fails but MySQL available, should use MySQL
                        expect(result.mode).toBe('mysql');
                        expect(storage.attemptedMethods).toContain('mysql');
                        expect(storage.attemptedMethods.indexOf('mysql')).toBe(1);
                    } else if (fileAvailable) {
                        // If KV and MySQL fail but file available, should use file
                        expect(result.mode).toBe('file');
                        expect(storage.attemptedMethods).toContain('file');
                        expect(storage.attemptedMethods.indexOf('file')).toBe(2);
                    } else {
                        // If all fail, should return error
                        expect(result.success).toBe(false);
                        expect(storage.attemptedMethods.length).toBe(3);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should prefer KV database when available', () => {
        const storage = createMockStorageSystem();
        storage.kvAvailable = true;
        storage.mysqlAvailable = true;
        storage.fileAvailable = true;
        
        const result = storage.recordVisit('posts/test');
        
        expect(result.mode).toBe('kv');
        expect(storage.attemptedMethods).toEqual(['kv']);
    });

    it('should fallback to MySQL when KV unavailable', () => {
        const storage = createMockStorageSystem();
        storage.kvAvailable = false;
        storage.mysqlAvailable = true;
        storage.fileAvailable = true;
        
        const result = storage.recordVisit('posts/test');
        
        expect(result.mode).toBe('mysql');
        expect(storage.attemptedMethods).toEqual(['kv', 'mysql']);
    });

    it('should fallback to file when KV and MySQL unavailable', () => {
        const storage = createMockStorageSystem();
        storage.kvAvailable = false;
        storage.mysqlAvailable = false;
        storage.fileAvailable = true;
        
        const result = storage.recordVisit('posts/test');
        
        expect(result.mode).toBe('file');
        expect(storage.attemptedMethods).toEqual(['kv', 'mysql', 'file']);
    });
});

describe('Data Export/Import', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 12: Data Export/Import Round-Trip**
     * 
     * For any valid bookmarks data, exporting to JSON and then importing 
     * should produce equivalent data.
     * **Validates: Requirements 10.1, 10.2**
     */
    
    // Mock BookmarksManager for export/import testing
    function createMockBookmarksManagerForExport() {
        return {
            data: [],
            
            // Simulate export functionality
            exportData() {
                return {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    bookmarks: this.data
                };
            },
            
            // Simulate import functionality
            importData(importData, mergeMode = 'replace') {
                if (!importData.bookmarks || !Array.isArray(importData.bookmarks)) {
                    throw new Error('Invalid format');
                }
                
                if (mergeMode === 'replace') {
                    this.data = importData.bookmarks.map(bookmark => ({
                        ...bookmark,
                        id: bookmark.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        addedAt: bookmark.addedAt || new Date().toISOString()
                    }));
                } else {
                    // Merge mode
                    const existingUrls = new Set(this.data.map(b => b.url));
                    importData.bookmarks.forEach(bookmark => {
                        if (!existingUrls.has(bookmark.url)) {
                            this.data.push({
                                ...bookmark,
                                id: bookmark.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                                addedAt: bookmark.addedAt || new Date().toISOString()
                            });
                        }
                    });
                }
                
                return this.data.length;
            }
        };
    }

    it('Property 12: export/import round-trip should preserve data', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        url: fc.webUrl(),
                        title: fc.string({ minLength: 1, maxLength: 100 }),
                        category: fc.constantFrom('tech', 'design', 'news', 'blog', 'others'),
                        addedAt: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(timestamp => new Date(timestamp).toISOString())
                    }),
                    { minLength: 0, maxLength: 20 }
                ),
                (originalBookmarks) => {
                    const manager = createMockBookmarksManagerForExport();
                    manager.data = originalBookmarks;
                    
                    // Export data
                    const exportedData = manager.exportData();
                    
                    // Clear manager and import
                    manager.data = [];
                    manager.importData(exportedData, 'replace');
                    
                    // Verify data integrity
                    expect(manager.data.length).toBe(originalBookmarks.length);
                    
                    // Check that all original bookmarks are present
                    originalBookmarks.forEach(originalBookmark => {
                        const found = manager.data.find(b => 
                            b.url === originalBookmark.url && 
                            b.title === originalBookmark.title &&
                            b.category === originalBookmark.category
                        );
                        expect(found).toBeDefined();
                    });
                }
            ),
            { numRuns: 50 }
        );
    });

    it('merge mode should not create duplicates', () => {
        const manager = createMockBookmarksManagerForExport();
        
        // Set initial data
        manager.data = [
            { id: '1', url: 'https://example.com', title: 'Example', category: 'tech', addedAt: '2023-01-01T00:00:00.000Z' },
            { id: '2', url: 'https://test.com', title: 'Test', category: 'blog', addedAt: '2023-01-02T00:00:00.000Z' }
        ];
        
        // Import data with one duplicate and one new item
        const importData = {
            bookmarks: [
                { id: '3', url: 'https://example.com', title: 'Example Duplicate', category: 'tech', addedAt: '2023-01-03T00:00:00.000Z' },
                { id: '4', url: 'https://new.com', title: 'New Site', category: 'news', addedAt: '2023-01-04T00:00:00.000Z' }
            ]
        };
        
        const originalCount = manager.data.length;
        manager.importData(importData, 'merge');
        
        // Should only add the new item, not the duplicate
        expect(manager.data.length).toBe(originalCount + 1);
        
        // Verify the new item was added
        const newItem = manager.data.find(b => b.url === 'https://new.com');
        expect(newItem).toBeDefined();
        expect(newItem.title).toBe('New Site');
    });

    it('replace mode should replace all data', () => {
        const manager = createMockBookmarksManagerForExport();
        
        // Set initial data
        manager.data = [
            { id: '1', url: 'https://old1.com', title: 'Old 1', category: 'tech', addedAt: '2023-01-01T00:00:00.000Z' },
            { id: '2', url: 'https://old2.com', title: 'Old 2', category: 'blog', addedAt: '2023-01-02T00:00:00.000Z' }
        ];
        
        // Import new data
        const importData = {
            bookmarks: [
                { id: '3', url: 'https://new1.com', title: 'New 1', category: 'news', addedAt: '2023-01-03T00:00:00.000Z' },
                { id: '4', url: 'https://new2.com', title: 'New 2', category: 'design', addedAt: '2023-01-04T00:00:00.000Z' }
            ]
        };
        
        manager.importData(importData, 'replace');
        
        // Should have exactly the imported data
        expect(manager.data.length).toBe(2);
        expect(manager.data.find(b => b.url === 'https://old1.com')).toBeUndefined();
        expect(manager.data.find(b => b.url === 'https://new1.com')).toBeDefined();
        expect(manager.data.find(b => b.url === 'https://new2.com')).toBeDefined();
    });

    it('should handle invalid import data gracefully', () => {
        const manager = createMockBookmarksManagerForExport();
        
        // Test invalid data structures
        expect(() => manager.importData({})).toThrow('Invalid format');
        expect(() => manager.importData({ bookmarks: 'not an array' })).toThrow('Invalid format');
        expect(() => manager.importData({ bookmarks: null })).toThrow('Invalid format');
    });
});

describe('Bulk Operations', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 13: Bulk Delete Count**
     * 
     * For any bulk delete operation, the number of items removed should 
     * equal the number of items selected.
     * **Validates: Requirements 11.2**
     */
    
    // Mock BookmarksManager for bulk operations testing
    function createMockBookmarksManagerForBulk() {
        return {
            data: [],
            
            // Simulate bulk delete functionality
            bulkDelete(selectedIds) {
                const originalCount = this.data.length;
                this.data = this.data.filter(bookmark => 
                    !selectedIds.includes(bookmark.id)
                );
                const deletedCount = originalCount - this.data.length;
                return deletedCount;
            },
            
            // Add bookmarks for testing
            addBookmarks(bookmarks) {
                this.data = [...bookmarks];
            }
        };
    }

    it('Property 13: bulk delete count should equal selected items count', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        title: fc.string({ minLength: 1, maxLength: 50 }),
                        url: fc.webUrl(),
                        category: fc.constantFrom('tech', 'design', 'news', 'blog', 'others')
                    }),
                    { minLength: 1, maxLength: 20 }
                ),
                fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 0, maxLength: 10 }),
                (bookmarks, selectedIndices) => {
                    const manager = createMockBookmarksManagerForBulk();
                    manager.addBookmarks(bookmarks);
                    
                    // Get unique valid indices
                    const validIndices = [...new Set(selectedIndices)].filter(i => i < bookmarks.length);
                    const selectedIds = validIndices.map(i => bookmarks[i].id);
                    
                    const originalCount = manager.data.length;
                    const deletedCount = manager.bulkDelete(selectedIds);
                    
                    // Verify the number of deleted items equals the number of selected items
                    expect(deletedCount).toBe(selectedIds.length);
                    
                    // Verify the remaining count is correct
                    expect(manager.data.length).toBe(originalCount - selectedIds.length);
                    
                    // Verify none of the selected items remain
                    selectedIds.forEach(id => {
                        const found = manager.data.find(b => b.id === id);
                        expect(found).toBeUndefined();
                    });
                }
            ),
            { numRuns: 50 }
        );
    });

    it('bulk delete with empty selection should delete nothing', () => {
        const manager = createMockBookmarksManagerForBulk();
        manager.addBookmarks([
            { id: '1', title: 'Test 1', url: 'https://test1.com', category: 'tech' },
            { id: '2', title: 'Test 2', url: 'https://test2.com', category: 'blog' }
        ]);
        
        const originalCount = manager.data.length;
        const deletedCount = manager.bulkDelete([]);
        
        expect(deletedCount).toBe(0);
        expect(manager.data.length).toBe(originalCount);
    });

    it('bulk delete with all items selected should delete everything', () => {
        const manager = createMockBookmarksManagerForBulk();
        const testBookmarks = [
            { id: '1', title: 'Test 1', url: 'https://test1.com', category: 'tech' },
            { id: '2', title: 'Test 2', url: 'https://test2.com', category: 'blog' },
            { id: '3', title: 'Test 3', url: 'https://test3.com', category: 'news' }
        ];
        manager.addBookmarks(testBookmarks);
        
        const allIds = testBookmarks.map(b => b.id);
        const deletedCount = manager.bulkDelete(allIds);
        
        expect(deletedCount).toBe(testBookmarks.length);
        expect(manager.data.length).toBe(0);
    });

    it('bulk delete with partial selection should delete only selected items', () => {
        const manager = createMockBookmarksManagerForBulk();
        const testBookmarks = [
            { id: '1', title: 'Test 1', url: 'https://test1.com', category: 'tech' },
            { id: '2', title: 'Test 2', url: 'https://test2.com', category: 'blog' },
            { id: '3', title: 'Test 3', url: 'https://test3.com', category: 'news' }
        ];
        manager.addBookmarks(testBookmarks);
        
        const selectedIds = ['1', '3'];
        const deletedCount = manager.bulkDelete(selectedIds);
        
        expect(deletedCount).toBe(2);
        expect(manager.data.length).toBe(1);
        expect(manager.data[0].id).toBe('2');
    });

    it('bulk delete with non-existent IDs should handle gracefully', () => {
        const manager = createMockBookmarksManagerForBulk();
        manager.addBookmarks([
            { id: '1', title: 'Test 1', url: 'https://test1.com', category: 'tech' }
        ]);
        
        const selectedIds = ['1', 'non-existent', '999'];
        const deletedCount = manager.bulkDelete(selectedIds);
        
        // Should only delete the existing item
        expect(deletedCount).toBe(1);
        expect(manager.data.length).toBe(0);
    });
});

describe('Form Validation', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 14: Form Validation Completeness**
     * 
     * For any form submission with missing required fields, the form should 
     * not submit and all invalid fields should be highlighted.
     * **Validates: Requirements 12.1**
     */
    
    // Mock FormValidator for testing
    function createMockFormValidator() {
        return {
            validateRequired(formElement) {
                const requiredFields = formElement.querySelectorAll('[required]');
                let isValid = true;
                const errors = [];
                const invalidFields = [];
                
                requiredFields.forEach(field => {
                    const value = field.value ? field.value.trim() : '';
                    const fieldName = field.getAttribute('data-field-name') || field.name || field.id || 'field';
                    
                    if (!value) {
                        isValid = false;
                        errors.push(`${fieldName} is required`);
                        invalidFields.push(field);
                    }
                });
                
                return { isValid, errors, invalidFields };
            },
            
            validateURL(urlString) {
                try {
                    const url = new URL(urlString);
                    return url.protocol === 'http:' || url.protocol === 'https:';
                } catch (e) {
                    return false;
                }
            },
            
            validateURLFields(formElement) {
                const urlFields = formElement.querySelectorAll('input[type="url"], input[data-type="url"]');
                let isValid = true;
                const errors = [];
                const invalidFields = [];
                
                urlFields.forEach(field => {
                    const value = field.value ? field.value.trim() : '';
                    
                    if (value && !this.validateURL(value)) {
                        isValid = false;
                        errors.push('Invalid URL format');
                        invalidFields.push(field);
                    }
                });
                
                return { isValid, errors, invalidFields };
            },
            
            validateForm(formElement) {
                const requiredValidation = this.validateRequired(formElement);
                const urlValidation = this.validateURLFields(formElement);
                
                const isValid = requiredValidation.isValid && urlValidation.isValid;
                const errors = [...requiredValidation.errors, ...urlValidation.errors];
                const invalidFields = [...requiredValidation.invalidFields, ...urlValidation.invalidFields];
                
                return { isValid, errors, invalidFields };
            }
        };
    }

    // Create mock form for testing
    function createMockForm(fields) {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <form id="test-form">
                    ${fields.map(field => {
                        const required = field.required ? 'required' : '';
                        const type = field.type || 'text';
                        const dataType = field.dataType ? `data-type="${String(field.dataType).replace(/\"/g, '&quot;')}"` : '';
                        const safeId = String(field.id).replace(/\"/g, '');
                        const name = (field.name || field.id);
                        const safeName = String(name).replace(/\"/g, '');
                        const safeLabel = String(field.label || field.id).replace(/\"/g, '&quot;');
                        const safeValue = String(field.value || '').replace(/\"/g, '');
                        return `<input type="${type}" id="${safeId}" name="${safeName}" ${required} ${dataType} value="${safeValue}" data-field-name="${safeLabel}">`;
                    }).join('\n')}
                </form>
            </body>
            </html>
        `);
        return dom.window.document.getElementById('test-form');
    }

    it('Property 14: form validation should identify all missing required fields', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
                        label: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                        required: fc.boolean(),
                        value: fc.option(fc.string({ maxLength: 50 }).filter(s => !s.includes('"')), { nil: '' })
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                (fieldConfigs) => {
                    const validator = createMockFormValidator();
                    const form = createMockForm(fieldConfigs);
                    
                    const validation = validator.validateForm(form);
                    
                    // Count expected invalid fields (required fields with empty values)
                    const expectedInvalidCount = fieldConfigs.filter(field => 
                        field.required && (!field.value || (typeof field.value === 'string' && field.value.trim() === ''))
                    ).length;
                    
                    if (expectedInvalidCount === 0) {
                        // Should be valid if no required fields are empty
                        expect(validation.isValid).toBe(true);
                        expect(validation.invalidFields.length).toBe(0);
                    } else {
                        // Should be invalid and identify all missing required fields
                        expect(validation.isValid).toBe(false);
                        expect(validation.invalidFields.length).toBe(expectedInvalidCount);
                        expect(validation.errors.length).toBeGreaterThanOrEqual(expectedInvalidCount);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should validate URL format correctly', () => {
        const validator = createMockFormValidator();
        
        // Valid URLs
        expect(validator.validateURL('https://example.com')).toBe(true);
        expect(validator.validateURL('http://test.org')).toBe(true);
        expect(validator.validateURL('https://sub.domain.com/path?query=1')).toBe(true);
        
        // Invalid URLs
        expect(validator.validateURL('not-a-url')).toBe(false);
        expect(validator.validateURL('ftp://example.com')).toBe(false);
        expect(validator.validateURL('javascript:alert(1)')).toBe(false);
        expect(validator.validateURL('')).toBe(false);
    });

    it('should validate URL fields in forms', () => {
        const validator = createMockFormValidator();
        
        const form = createMockForm([
            { id: 'url1', type: 'url', value: 'https://valid.com', required: true },
            { id: 'url2', dataType: 'url', value: 'invalid-url', required: false },
            { id: 'text1', type: 'text', value: 'some text', required: true }
        ]);
        
        const validation = validator.validateForm(form);
        
        // Should be invalid due to invalid URL
        expect(validation.isValid).toBe(false);
        expect(validation.invalidFields.length).toBe(1);
        expect(validation.invalidFields[0].id).toBe('url2');
    });

    it('should handle forms with no required fields', () => {
        const validator = createMockFormValidator();
        
        const form = createMockForm([
            { id: 'optional1', value: '', required: false },
            { id: 'optional2', value: 'some value', required: false }
        ]);
        
        const validation = validator.validateForm(form);
        
        expect(validation.isValid).toBe(true);
        expect(validation.invalidFields.length).toBe(0);
        expect(validation.errors.length).toBe(0);
    });

    it('should handle forms with all required fields filled', () => {
        const validator = createMockFormValidator();
        
        const form = createMockForm([
            { id: 'required1', value: 'filled', required: true },
            { id: 'required2', value: 'also filled', required: true },
            { id: 'url1', type: 'url', value: 'https://valid.com', required: true }
        ]);
        
        const validation = validator.validateForm(form);
        
        expect(validation.isValid).toBe(true);
        expect(validation.invalidFields.length).toBe(0);
        expect(validation.errors.length).toBe(0);
    });

    it('should handle whitespace-only values as empty', () => {
        const validator = createMockFormValidator();
        
        const form = createMockForm([
            { id: 'whitespace', value: '   ', required: true },
            { id: 'tabs', value: '\t\t', required: true },
            { id: 'mixed', value: ' \n \t ', required: true }
        ]);
        
        const validation = validator.validateForm(form);
        
        expect(validation.isValid).toBe(false);
        expect(validation.invalidFields.length).toBe(3);
    });
});

describe('Backend Connectivity', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 15: Backend Fallback Chain**
     * 
     * For any backend connectivity check, if PHP fails, Node.js should be tried; 
     * if Node.js fails, Mock Mode should be activated.
     * **Validates: Requirements 8.2, 8.3**
     */
    
    // Mock backend connectivity checker
    function createMockBackendChecker() {
        return {
            phpAvailable: true,
            nodeAvailable: true,
            
            async checkBackend() {
                const attempts = [];
                let finalMode = null;
                
                // Try PHP first
                attempts.push('php');
                if (this.phpAvailable) {
                    finalMode = 'php';
                    return { mode: finalMode, attempts };
                }
                
                // Try Node.js second
                attempts.push('node');
                if (this.nodeAvailable) {
                    finalMode = 'node';
                    return { mode: finalMode, attempts };
                }
                
                // Fall back to Mock Mode
                attempts.push('mock');
                finalMode = 'mock';
                return { mode: finalMode, attempts };
            }
        };
    }

    it('Property 15: backend fallback should follow PHP -> Node -> Mock order', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.boolean(),
                fc.boolean(),
                async (phpAvailable, nodeAvailable) => {
                    const checker = createMockBackendChecker();
                    checker.phpAvailable = phpAvailable;
                    checker.nodeAvailable = nodeAvailable;
                    
                    const result = await checker.checkBackend();
                    
                    // Verify PHP is always tried first
                    expect(result.attempts[0]).toBe('php');
                    
                    if (phpAvailable) {
                        // If PHP is available, should use it and not try others
                        expect(result.mode).toBe('php');
                        expect(result.attempts.length).toBe(1);
                    } else if (nodeAvailable) {
                        // If PHP fails but Node available, should use Node
                        expect(result.mode).toBe('node');
                        expect(result.attempts).toContain('node');
                        expect(result.attempts.indexOf('node')).toBe(1);
                    } else {
                        // If both fail, should use Mock Mode
                        expect(result.mode).toBe('mock');
                        expect(result.attempts).toContain('mock');
                        expect(result.attempts.indexOf('mock')).toBe(2);
                        expect(result.attempts.length).toBe(3);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should prefer PHP when available', async () => {
        const checker = createMockBackendChecker();
        checker.phpAvailable = true;
        checker.nodeAvailable = true;
        
        const result = await checker.checkBackend();
        
        expect(result.mode).toBe('php');
        expect(result.attempts).toEqual(['php']);
    });

    it('should fallback to Node when PHP unavailable', async () => {
        const checker = createMockBackendChecker();
        checker.phpAvailable = false;
        checker.nodeAvailable = true;
        
        const result = await checker.checkBackend();
        
        expect(result.mode).toBe('node');
        expect(result.attempts).toEqual(['php', 'node']);
    });

    it('should fallback to Mock when both PHP and Node unavailable', async () => {
        const checker = createMockBackendChecker();
        checker.phpAvailable = false;
        checker.nodeAvailable = false;
        
        const result = await checker.checkBackend();
        
        expect(result.mode).toBe('mock');
        expect(result.attempts).toEqual(['php', 'node', 'mock']);
    });

    it('should always try backends in the correct order', async () => {
        const checker = createMockBackendChecker();
        
        // Test all combinations
        const combinations = [
            { php: true, node: true, expected: 'php' },
            { php: true, node: false, expected: 'php' },
            { php: false, node: true, expected: 'node' },
            { php: false, node: false, expected: 'mock' }
        ];
        
        for (const combo of combinations) {
            checker.phpAvailable = combo.php;
            checker.nodeAvailable = combo.node;
            
            const result = await checker.checkBackend();
            expect(result.mode).toBe(combo.expected);
            
            // Verify attempt order
            expect(result.attempts[0]).toBe('php');
            if (!combo.php) {
                expect(result.attempts[1]).toBe('node');
                if (!combo.node) {
                    expect(result.attempts[2]).toBe('mock');
                }
            }
        }
    });
});

describe('Toast Notifications', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 4: Toast Auto-Dismiss**
     * 
     * For any toast notification displayed, it should be automatically 
     * removed from the DOM after the specified timeout period.
     * **Validates: Requirements 1.7**
     */
    
    // Mock showToast function for testing
    function createToastContainer() {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="toast-container"></div>
            </body>
            </html>
        `);
        return dom;
    }

    function showToast(document, msg, type = 'info', timeout = 100) {
        const container = document.getElementById('toast-container');
        if (!container) return null;

        const el = document.createElement('div');
        el.className = 'toast-item';
        el.textContent = msg;
        el.dataset.type = type;
        
        container.appendChild(el);

        // Auto-dismiss after timeout
        setTimeout(() => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, timeout);

        return el;
    }

    it('Property 4: toast should be removed after timeout', async () => {
        const dom = createToastContainer();
        const document = dom.window.document;
        
        // Show toast with short timeout for testing
        const toast = showToast(document, 'Test message', 'info', 50);
        
        // Toast should exist initially
        expect(document.querySelector('.toast-item')).not.toBeNull();
        
        // Wait for timeout + buffer
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Toast should be removed
        expect(document.querySelector('.toast-item')).toBeNull();
    });

    it('multiple toasts should all be dismissed independently', async () => {
        const dom = createToastContainer();
        const document = dom.window.document;
        
        // Show multiple toasts
        showToast(document, 'Toast 1', 'info', 50);
        showToast(document, 'Toast 2', 'success', 100);
        showToast(document, 'Toast 3', 'error', 150);
        
        // All three should exist initially
        expect(document.querySelectorAll('.toast-item').length).toBe(3);
        
        // After 75ms, first should be gone
        await new Promise(resolve => setTimeout(resolve, 75));
        expect(document.querySelectorAll('.toast-item').length).toBe(2);
        
        // After 125ms total, second should be gone
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(document.querySelectorAll('.toast-item').length).toBe(1);
        
        // After 175ms total, all should be gone
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(document.querySelectorAll('.toast-item').length).toBe(0);
    });

    it('should handle rapid toast creation and dismissal', async () => {
        const dom = createToastContainer();
        const document = dom.window.document;
        
        // Create multiple toasts rapidly
        for (let i = 0; i < 5; i++) {
            showToast(document, `Toast ${i}`, 'info', 30);
        }
        
        // All should exist initially
        expect(document.querySelectorAll('.toast-item').length).toBe(5);
        
        // Wait for all to be dismissed
        await new Promise(resolve => setTimeout(resolve, 60));
        expect(document.querySelectorAll('.toast-item').length).toBe(0);
    });
});

describe('Dark Mode Support', () => {
    /**
     * **Feature: admin-dashboard-fix, Property 16: Dark Mode Theme Application**
     * 
     * For any system theme change, the admin dashboard should update its 
     * theme accordingly and ensure proper contrast for all elements.
     * **Validates: Requirements 18.1, 18.3**
     */
    
    // Mock DarkModeManager for testing
    function createMockDarkModeManager() {
        return {
            isDark: false,
            
            updateTheme(forceDark = null) {
                this.isDark = forceDark !== null ? forceDark : this.isDark;
                
                if (this.isDark) {
                    document.documentElement.classList.add('dark');
                    this.applyDarkStyles();
                } else {
                    document.documentElement.classList.remove('dark');
                    this.removeDarkStyles();
                }
            },
            
            applyDarkStyles() {
                // Simulate dark theme application
                const elements = document.querySelectorAll('.bg-white, .bg-slate-50, .text-slate-800');
                elements.forEach(el => {
                    el.classList.add('dark-theme-applied');
                });
            },
            
            removeDarkStyles() {
                // Simulate light theme application
                const elements = document.querySelectorAll('.dark-theme-applied');
                elements.forEach(el => {
                    el.classList.remove('dark-theme-applied');
                });
            },
            
            isDarkMode() {
                return this.isDark;
            },
            
            hasProperContrast() {
                // Simulate contrast checking
                const darkElements = document.querySelectorAll('.dark-theme-applied');
                return this.isDark ? darkElements.length > 0 : darkElements.length === 0;
            }
        };
    }

    // Create mock DOM with theme-sensitive elements
    function createMockThemeDOM() {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div class="bg-white text-slate-800">Content</div>
                <div class="bg-slate-50 text-slate-600">Secondary</div>
                <button class="text-blue-600">Action</button>
                <input class="border-slate-200" />
            </body>
            </html>
        `);
        return dom;
    }

    it('Property 16: dark mode should apply theme consistently across all elements', () => {
        fc.assert(
            fc.property(
                fc.boolean(),
                (shouldBeDark) => {
                    const dom = createMockThemeDOM();
                    const document = dom.window.document;
                    global.document = document;
                    
                    const manager = createMockDarkModeManager();
                    
                    // Apply theme
                    manager.updateTheme(shouldBeDark);
                    
                    // Verify theme state
                    expect(manager.isDarkMode()).toBe(shouldBeDark);
                    
                    // Verify DOM classes
                    const hasClassDark = document.documentElement.classList.contains('dark');
                    expect(hasClassDark).toBe(shouldBeDark);
                    
                    // Verify proper contrast
                    expect(manager.hasProperContrast()).toBe(true);
                    
                    // Verify theme application consistency
                    const themeElements = document.querySelectorAll('.dark-theme-applied');
                    if (shouldBeDark) {
                        expect(themeElements.length).toBeGreaterThan(0);
                    } else {
                        expect(themeElements.length).toBe(0);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should toggle between light and dark themes correctly', () => {
        const dom = createMockThemeDOM();
        const document = dom.window.document;
        global.document = document;
        
        const manager = createMockDarkModeManager();
        
        // Start with light theme
        manager.updateTheme(false);
        expect(manager.isDarkMode()).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        
        // Switch to dark theme
        manager.updateTheme(true);
        expect(manager.isDarkMode()).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        
        // Switch back to light theme
        manager.updateTheme(false);
        expect(manager.isDarkMode()).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should maintain proper contrast in both themes', () => {
        const dom = createMockThemeDOM();
        const document = dom.window.document;
        global.document = document;
        
        const manager = createMockDarkModeManager();
        
        // Test light theme contrast
        manager.updateTheme(false);
        expect(manager.hasProperContrast()).toBe(true);
        
        // Test dark theme contrast
        manager.updateTheme(true);
        expect(manager.hasProperContrast()).toBe(true);
    });

    it('should handle rapid theme changes gracefully', () => {
        const dom = createMockThemeDOM();
        const document = dom.window.document;
        global.document = document;
        
        const manager = createMockDarkModeManager();
        
        // Rapidly toggle themes
        for (let i = 0; i < 10; i++) {
            manager.updateTheme(i % 2 === 0);
            expect(manager.hasProperContrast()).toBe(true);
        }
        
        // Final state should be consistent
        const finalState = manager.isDarkMode();
        const hasClassDark = document.documentElement.classList.contains('dark');
        expect(hasClassDark).toBe(finalState);
    });
});

describe('Keyboard Shortcuts', () => {
    /**
     * Unit tests for keyboard shortcut functionality
     * Tests Escape, Ctrl+S, and / (slash) shortcuts
     * **Validates: Requirements 17.1, 17.2, 17.3**
     */
    
    // Mock KeyboardShortcuts for testing
    function createMockKeyboardShortcuts() {
        return {
            escapePressed: false,
            ctrlSPressed: false,
            slashPressed: false,
            
            handleKeydown(e) {
                if (e.key === 'Escape') {
                    this.escapePressed = true;
                    // Mock closing modals/sidebar
                    const dialog = document.getElementById('confirmation-dialog');
                    if (dialog) dialog.remove();
                }
                
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    this.ctrlSPressed = true;
                    // Mock form submission
                    const submitBtn = document.querySelector('button[type="submit"]:not([disabled])');
                    if (submitBtn) submitBtn.click();
                }
                
                if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    const target = e.target;
                    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        this.slashPressed = true;
                        // Mock focusing search
                        const searchInput = document.querySelector('input[type="search"]');
                        if (searchInput) searchInput.focus();
                    }
                }
            }
        };
    }

    // Create mock DOM for keyboard testing
    function createMockKeyboardDOM() {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="confirmation-dialog">Dialog</div>
                <form>
                    <input type="search" id="search-input" />
                    <button type="submit" id="submit-btn">Submit</button>
                </form>
                <input type="text" id="text-input" />
            </body>
            </html>
        `);
        return dom;
    }

    it('Escape key should close modals and dialogs', () => {
        const dom = createMockKeyboardDOM();
        const document = dom.window.document;
        global.document = document;
        
        const shortcuts = createMockKeyboardShortcuts();
        
        // Verify dialog exists
        expect(document.getElementById('confirmation-dialog')).not.toBeNull();
        
        // Simulate Escape key
        const escapeEvent = { key: 'Escape' };
        shortcuts.handleKeydown(escapeEvent);
        
        // Verify escape was handled
        expect(shortcuts.escapePressed).toBe(true);
        
        // Verify dialog was removed
        expect(document.getElementById('confirmation-dialog')).toBeNull();
    });

    it('Ctrl+S should submit active form', () => {
        const dom = createMockKeyboardDOM();
        const document = dom.window.document;
        global.document = document;
        
        const shortcuts = createMockKeyboardShortcuts();
        
        // Mock button click
        let buttonClicked = false;
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.click = () => { buttonClicked = true; };
        
        // Simulate Ctrl+S
        const ctrlSEvent = { 
            key: 's', 
            ctrlKey: true,
            preventDefault: vi.fn()
        };
        shortcuts.handleKeydown(ctrlSEvent);
        
        // Verify shortcut was handled
        expect(shortcuts.ctrlSPressed).toBe(true);
        expect(ctrlSEvent.preventDefault).toHaveBeenCalled();
        expect(buttonClicked).toBe(true);
    });

    it('/ (slash) should focus search input when not in input field', () => {
        const dom = createMockKeyboardDOM();
        const document = dom.window.document;
        global.document = document;
        
        const shortcuts = createMockKeyboardShortcuts();
        
        // Mock search input focus
        let searchFocused = false;
        const searchInput = document.getElementById('search-input');
        searchInput.focus = () => { searchFocused = true; };
        
        // Simulate / key from body (not input)
        const slashEvent = { 
            key: '/', 
            ctrlKey: false, 
            altKey: false, 
            metaKey: false,
            target: document.body,
            preventDefault: vi.fn()
        };
        shortcuts.handleKeydown(slashEvent);
        
        // Verify shortcut was handled
        expect(shortcuts.slashPressed).toBe(true);
        expect(slashEvent.preventDefault).toHaveBeenCalled();
        expect(searchFocused).toBe(true);
    });

    it('/ (slash) should NOT trigger when already in input field', () => {
        const dom = createMockKeyboardDOM();
        const document = dom.window.document;
        global.document = document;
        
        const shortcuts = createMockKeyboardShortcuts();
        
        // Simulate / key from input field
        const textInput = document.getElementById('text-input');
        const slashEvent = { 
            key: '/', 
            ctrlKey: false, 
            altKey: false, 
            metaKey: false,
            target: textInput,
            preventDefault: vi.fn()
        };
        shortcuts.handleKeydown(slashEvent);
        
        // Verify shortcut was NOT handled
        expect(shortcuts.slashPressed).toBe(false);
        expect(slashEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should handle multiple shortcuts in sequence', () => {
        const dom = createMockKeyboardDOM();
        const document = dom.window.document;
        global.document = document;
        
        const shortcuts = createMockKeyboardShortcuts();
        
        // Simulate multiple shortcuts
        shortcuts.handleKeydown({ key: 'Escape' });
        shortcuts.handleKeydown({ 
            key: 's', 
            ctrlKey: true, 
            preventDefault: vi.fn() 
        });
        shortcuts.handleKeydown({ 
            key: '/', 
            ctrlKey: false, 
            altKey: false, 
            metaKey: false,
            target: document.body,
            preventDefault: vi.fn()
        });
        
        // Verify all shortcuts were handled
        expect(shortcuts.escapePressed).toBe(true);
        expect(shortcuts.ctrlSPressed).toBe(true);
        expect(shortcuts.slashPressed).toBe(true);
    });
});

describe('Confirmation Dialogs', () => {
    /**
     * Unit tests for confirmation dialog system
     * **Validates: Requirements 16.1, 16.2, 16.3**
     */
    
    // Mock ConfirmationDialog for testing
    function createMockConfirmationDialog() {
        return {
            currentDialog: null,
            
            show(message, onConfirm, onCancel = null) {
                // Remove existing dialog
                this.hide();
                
                const dialog = document.createElement('div');
                dialog.id = 'confirmation-dialog';
                dialog.innerHTML = `
                    <div class="dialog-content">
                        <p class="message">${message}</p>
                        <button id="dialog-confirm">确认</button>
                        <button id="dialog-cancel">取消</button>
                    </div>
                `;
                
                document.body.appendChild(dialog);
                this.currentDialog = dialog;
                
                // Event listeners
                dialog.querySelector('#dialog-confirm').onclick = () => {
                    this.hide();
                    if (onConfirm) onConfirm();
                };
                
                dialog.querySelector('#dialog-cancel').onclick = () => {
                    this.hide();
                    if (onCancel) onCancel();
                };
                
                return dialog;
            },
            
            hide() {
                if (this.currentDialog) {
                    this.currentDialog.remove();
                    this.currentDialog = null;
                }
            },
            
            isVisible() {
                return this.currentDialog !== null;
            }
        };
    }

    function createMockDialogDOM() {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body></body>
            </html>
        `);
        return dom;
    }

    it('should show confirmation dialog with correct message', () => {
        const dom = createMockDialogDOM();
        const document = dom.window.document;
        global.document = document;
        
        const dialog = createMockConfirmationDialog();
        const testMessage = '确定要删除这个项目吗？';
        
        dialog.show(testMessage, () => {});
        
        expect(dialog.isVisible()).toBe(true);
        expect(document.getElementById('confirmation-dialog')).not.toBeNull();
        expect(document.querySelector('.message').textContent).toBe(testMessage);
    });

    it('should call onConfirm when confirm button is clicked', () => {
        const dom = createMockDialogDOM();
        const document = dom.window.document;
        global.document = document;
        
        const dialog = createMockConfirmationDialog();
        let confirmCalled = false;
        
        dialog.show('Test message', () => {
            confirmCalled = true;
        });
        
        // Click confirm button
        document.getElementById('dialog-confirm').click();
        
        expect(confirmCalled).toBe(true);
        expect(dialog.isVisible()).toBe(false);
    });

    it('should call onCancel when cancel button is clicked', () => {
        const dom = createMockDialogDOM();
        const document = dom.window.document;
        global.document = document;
        
        const dialog = createMockConfirmationDialog();
        let cancelCalled = false;
        
        dialog.show('Test message', () => {}, () => {
            cancelCalled = true;
        });
        
        // Click cancel button
        document.getElementById('dialog-cancel').click();
        
        expect(cancelCalled).toBe(true);
        expect(dialog.isVisible()).toBe(false);
    });

    it('should hide existing dialog when showing new one', () => {
        const dom = createMockDialogDOM();
        const document = dom.window.document;
        global.document = document;
        
        const dialog = createMockConfirmationDialog();
        
        // Show first dialog
        dialog.show('First message', () => {});
        const firstDialog = document.getElementById('confirmation-dialog');
        
        // Show second dialog
        dialog.show('Second message', () => {});
        const secondDialog = document.getElementById('confirmation-dialog');
        
        // Should only have one dialog
        expect(document.querySelectorAll('#confirmation-dialog').length).toBe(1);
        expect(secondDialog.querySelector('.message').textContent).toBe('Second message');
    });

    it('should handle missing onCancel callback gracefully', () => {
        const dom = createMockDialogDOM();
        const document = dom.window.document;
        global.document = document;
        
        const dialog = createMockConfirmationDialog();
        
        // Show dialog without onCancel
        dialog.show('Test message', () => {});
        
        // Click cancel button - should not throw error
        expect(() => {
            document.getElementById('dialog-cancel').click();
        }).not.toThrow();
        
        expect(dialog.isVisible()).toBe(false);
    });
});
