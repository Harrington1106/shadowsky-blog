/**
 * Stats/Visit API Tests
 * Property-based and unit tests for visit tracking functionality
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Generate valid ISO date strings directly
const isoDateArbitrary = fc.tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 })
).map(([y, m, d, h, min, s]) => 
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}.000Z`
);

// Simulate visit log entry structure
const visitLogEntryArbitrary = fc.record({
    time: isoDateArbitrary,
    ip: fc.tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
    ).map(parts => parts.join('.')),
    ua: fc.string({ minLength: 0, maxLength: 100 }),
    page: fc.string({ minLength: 1, maxLength: 50 }).map(s => s.replace(/[^a-zA-Z0-9_\-\.\/]/g, '')),
    referer: fc.option(fc.webUrl(), { nil: undefined })
});

/**
 * Append a visit entry to the log (simulates PHP behavior)
 * @param {Array} existingLog - Existing log entries
 * @param {Object} newEntry - New entry to append
 * @returns {Array} - Updated log
 */
function appendVisit(existingLog, newEntry) {
    if (!Array.isArray(existingLog)) existingLog = [];
    return [...existingLog, newEntry];
}

/**
 * Calculate stats from visit log (simulates admin.js processStats)
 * @param {Array} logs - Visit log entries
 * @returns {Object} - Computed statistics
 */
function calculateStats(logs) {
    if (!Array.isArray(logs)) logs = [];
    
    const totalVisits = logs.length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayVisits = logs.filter(s => s.time && s.time.startsWith(today)).length;
    
    // Use Map to avoid prototype pollution with page names like "valueOf", "toString"
    const pageCountsMap = new Map();
    logs.forEach(s => {
        const p = s.page || 'unknown';
        pageCountsMap.set(p, (pageCountsMap.get(p) || 0) + 1);
    });
    
    // Convert to plain object for compatibility
    const pageCounts = Object.fromEntries(pageCountsMap);
    
    const sortedPages = Array.from(pageCountsMap.entries()).sort((a, b) => b[1] - a[1]);
    const topPage = sortedPages[0] || null;
    
    return {
        totalVisits,
        todayVisits,
        pageCounts,
        topPage: topPage ? { page: topPage[0], count: topPage[1] } : null
    };
}

describe('Visit Stats Module', () => {
    describe('Visit Log Append', () => {
        /**
         * **Feature: shadowsky-fixes, Property 1: Visit Log Append Preserves History**
         * 
         * For any existing visit log array and any new visit entry, appending the new
         * entry SHALL result in a log that contains all previous entries in their
         * original order, plus the new entry at the end.
         */
        it('Property 1: appending visit preserves all previous entries', () => {
            fc.assert(
                fc.property(
                    fc.array(visitLogEntryArbitrary, { maxLength: 50 }),
                    visitLogEntryArbitrary,
                    (existingLog, newEntry) => {
                        const result = appendVisit(existingLog, newEntry);
                        
                        // All previous entries preserved in order
                        existingLog.forEach((entry, i) => {
                            expect(result[i]).toEqual(entry);
                        });
                        
                        // New entry at end
                        expect(result[result.length - 1]).toEqual(newEntry);
                        
                        // Length increased by exactly 1
                        expect(result.length).toBe(existingLog.length + 1);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('appending to empty log creates single-entry log', () => {
            fc.assert(
                fc.property(
                    visitLogEntryArbitrary,
                    (newEntry) => {
                        const result = appendVisit([], newEntry);
                        expect(result.length).toBe(1);
                        expect(result[0]).toEqual(newEntry);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('handles null/undefined existing log gracefully', () => {
            const entry = { time: new Date().toISOString(), ip: '127.0.0.1', ua: 'test', page: 'home' };
            
            expect(appendVisit(null, entry)).toEqual([entry]);
            expect(appendVisit(undefined, entry)).toEqual([entry]);
        });
    });

    describe('Stats Calculation', () => {
        /**
         * **Feature: shadowsky-fixes, Property 2: Stats Display Accuracy**
         * 
         * For any array of visit log entries, the computed statistics (total count,
         * today count, page counts) SHALL accurately reflect the data in the log entries.
         */
        it('Property 2: total visits equals log length', () => {
            fc.assert(
                fc.property(
                    fc.array(visitLogEntryArbitrary, { maxLength: 100 }),
                    (logs) => {
                        const stats = calculateStats(logs);
                        expect(stats.totalVisits).toBe(logs.length);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property 2: page counts sum equals total visits', () => {
            fc.assert(
                fc.property(
                    fc.array(visitLogEntryArbitrary, { maxLength: 100 }),
                    (logs) => {
                        const stats = calculateStats(logs);
                        const sumOfPageCounts = Object.values(stats.pageCounts).reduce((a, b) => a + b, 0);
                        expect(sumOfPageCounts).toBe(stats.totalVisits);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property 2: today visits is subset of total visits', () => {
            fc.assert(
                fc.property(
                    fc.array(visitLogEntryArbitrary, { maxLength: 100 }),
                    (logs) => {
                        const stats = calculateStats(logs);
                        expect(stats.todayVisits).toBeLessThanOrEqual(stats.totalVisits);
                        expect(stats.todayVisits).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property 2: top page has highest count', () => {
            fc.assert(
                fc.property(
                    fc.array(visitLogEntryArbitrary, { minLength: 1, maxLength: 100 }),
                    (logs) => {
                        const stats = calculateStats(logs);
                        
                        if (stats.topPage) {
                            const maxCount = Math.max(...Object.values(stats.pageCounts));
                            expect(stats.topPage.count).toBe(maxCount);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('handles empty log array', () => {
            const stats = calculateStats([]);
            expect(stats.totalVisits).toBe(0);
            expect(stats.todayVisits).toBe(0);
            expect(stats.topPage).toBeNull();
            expect(Object.keys(stats.pageCounts).length).toBe(0);
        });

        it('handles null/undefined log gracefully', () => {
            expect(calculateStats(null).totalVisits).toBe(0);
            expect(calculateStats(undefined).totalVisits).toBe(0);
        });
    });
});
