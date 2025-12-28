/**
 * Blog Module Tests
 * Tests for pagination, reading time, and blog caching
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

const {
    calculateReadingTime,
    countWords,
    formatReadingTime,
    paginate,
    WORDS_PER_MINUTE,
    DEFAULT_PER_PAGE
} = require('./blog-utils.js');

describe('Blog Module', () => {
    
    describe('calculateReadingTime', () => {
        /**
         * **Feature: site-improvements, Property 1: Reading Time Calculation Consistency**
         * *For any* article with a positive word count, the calculated reading time 
         * SHALL be a positive integer representing minutes (assuming 200 words/minute reading speed).
         * **Validates: Requirements 2.2**
         */
        it('Property 1: returns positive integer for any positive word count', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 100000 }),
                    (wordCount) => {
                        const readingTime = calculateReadingTime(wordCount);
                        
                        // Must be a positive integer
                        expect(Number.isInteger(readingTime)).toBe(true);
                        expect(readingTime).toBeGreaterThanOrEqual(1);
                        
                        // Must be consistent with word count
                        const expectedMin = Math.ceil(wordCount / WORDS_PER_MINUTE);
                        expect(readingTime).toBe(Math.max(1, expectedMin));
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('Property 1: returns minimum 1 minute for small word counts', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: WORDS_PER_MINUTE - 1 }),
                    (wordCount) => {
                        const readingTime = calculateReadingTime(wordCount);
                        expect(readingTime).toBe(1);
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('returns 1 for exactly 200 words', () => {
            expect(calculateReadingTime(200)).toBe(1);
        });
        
        it('returns 2 for 201-400 words', () => {
            expect(calculateReadingTime(201)).toBe(2);
            expect(calculateReadingTime(400)).toBe(2);
        });
        
        it('handles invalid inputs gracefully', () => {
            expect(calculateReadingTime(-1)).toBe(1);
            expect(calculateReadingTime(NaN)).toBe(1);
            expect(calculateReadingTime(null)).toBe(1);
            expect(calculateReadingTime(undefined)).toBe(1);
            expect(calculateReadingTime('string')).toBe(1);
        });
    });
    
    describe('countWords', () => {
        it('counts English words correctly', () => {
            expect(countWords('Hello world')).toBe(2);
            expect(countWords('One two three four five')).toBe(5);
        });
        
        it('counts Chinese characters correctly', () => {
            expect(countWords('你好世界')).toBe(4);
            expect(countWords('测试')).toBe(2);
        });
        
        it('counts mixed content correctly', () => {
            expect(countWords('Hello 世界')).toBe(3); // 1 English + 2 Chinese
            expect(countWords('Test 测试 example')).toBe(4); // 2 English + 2 Chinese
        });
        
        it('handles empty and invalid inputs', () => {
            expect(countWords('')).toBe(0);
            expect(countWords(null)).toBe(0);
            expect(countWords(undefined)).toBe(0);
        });
        
        it('strips HTML tags', () => {
            expect(countWords('<p>Hello world</p>')).toBe(2);
            expect(countWords('<div><span>Test</span></div>')).toBe(1);
        });
    });
    
    describe('formatReadingTime', () => {
        it('formats single minute correctly', () => {
            expect(formatReadingTime(1)).toBe('1 分钟阅读');
        });
        
        it('formats multiple minutes correctly', () => {
            expect(formatReadingTime(5)).toBe('5 分钟阅读');
            expect(formatReadingTime(10)).toBe('10 分钟阅读');
        });
    });
    
    describe('paginate', () => {
        /**
         * **Feature: site-improvements, Property 2: Pagination Correctness**
         * *For any* list of items and valid page parameters, the paginate function 
         * SHALL return the correct subset of items and accurate total page count.
         * **Validates: Requirements 2.1**
         */
        it('Property 2: returns correct subset for any items and page params', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.anything(), { minLength: 0, maxLength: 100 }),
                    fc.integer({ min: 1, max: 20 }),
                    fc.integer({ min: 1, max: 20 }),
                    (items, page, perPage) => {
                        const result = paginate(items, page, perPage);
                        
                        // Items returned should not exceed perPage
                        expect(result.items.length).toBeLessThanOrEqual(perPage);
                        
                        // Total pages calculation should be correct
                        const expectedTotalPages = Math.max(1, Math.ceil(items.length / perPage));
                        expect(result.totalPages).toBe(expectedTotalPages);
                        
                        // Current page should be within valid range
                        expect(result.currentPage).toBeGreaterThanOrEqual(1);
                        expect(result.currentPage).toBeLessThanOrEqual(result.totalPages);
                        
                        // Total items should match input
                        expect(result.totalItems).toBe(items.length);
                        
                        // hasNext/hasPrev should be consistent
                        expect(result.hasNext).toBe(result.currentPage < result.totalPages);
                        expect(result.hasPrev).toBe(result.currentPage > 1);
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('Property 2: all items are accessible through pagination', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.integer(), { minLength: 1, maxLength: 50 }),
                    fc.integer({ min: 1, max: 10 }),
                    (items, perPage) => {
                        // Collect all items from all pages
                        const allPaginatedItems = [];
                        const totalPages = Math.ceil(items.length / perPage);
                        
                        for (let page = 1; page <= totalPages; page++) {
                            const result = paginate(items, page, perPage);
                            allPaginatedItems.push(...result.items);
                        }
                        
                        // All original items should be present
                        expect(allPaginatedItems).toEqual(items);
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('handles empty array', () => {
            const result = paginate([], 1, 10);
            expect(result.items).toEqual([]);
            expect(result.totalPages).toBe(1);
            expect(result.currentPage).toBe(1);
            expect(result.totalItems).toBe(0);
        });
        
        it('handles invalid inputs', () => {
            const result = paginate(null, 1, 10);
            expect(result.items).toEqual([]);
            expect(result.totalPages).toBe(0);
        });
        
        it('clamps page to valid range', () => {
            const items = [1, 2, 3, 4, 5];
            
            // Page too high
            const result1 = paginate(items, 100, 2);
            expect(result1.currentPage).toBe(3); // Max page
            
            // Page too low
            const result2 = paginate(items, 0, 2);
            expect(result2.currentPage).toBe(1);
            
            // Negative page
            const result3 = paginate(items, -5, 2);
            expect(result3.currentPage).toBe(1);
        });
        
        it('returns correct items for specific page', () => {
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            
            const page1 = paginate(items, 1, 3);
            expect(page1.items).toEqual([1, 2, 3]);
            
            const page2 = paginate(items, 2, 3);
            expect(page2.items).toEqual([4, 5, 6]);
            
            const page4 = paginate(items, 4, 3);
            expect(page4.items).toEqual([10]);
        });
    });
});
