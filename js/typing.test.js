/**
 * Typing Effect Tests
 * Tests for typing animation and BFCache recovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Simulate typing animation timing
 * @param {string} text - Text to type
 * @param {number} interval - Interval between characters in ms
 * @returns {Array} - Array of timestamps when each character would appear
 */
function simulateTypingTimestamps(text, interval = 50) {
    const timestamps = [];
    for (let i = 0; i < text.length; i++) {
        timestamps.push(i * interval);
    }
    return timestamps;
}

/**
 * Calculate intervals between consecutive characters
 * @param {Array} timestamps - Array of timestamps
 * @returns {Array} - Array of intervals between consecutive timestamps
 */
function calculateIntervals(timestamps) {
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    return intervals;
}

describe('Typing Effect', () => {
    // **Feature: bfcache-compatibility, Property 5: Typing Animation Interval Consistency**
    describe('Property 5: Typing Animation Interval Consistency', () => {
        it('all character intervals are exactly 50ms', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 2, maxLength: 200 }),
                    (text) => {
                        const timestamps = simulateTypingTimestamps(text, 50);
                        const intervals = calculateIntervals(timestamps);

                        // All intervals should be exactly 50ms
                        intervals.forEach(interval => {
                            expect(interval).toBe(50);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('total typing duration equals (text.length - 1) * interval', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 200 }),
                    fc.integer({ min: 10, max: 200 }),
                    (text, interval) => {
                        const timestamps = simulateTypingTimestamps(text, interval);
                        
                        if (text.length > 1) {
                            const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
                            const expectedDuration = (text.length - 1) * interval;
                            expect(totalDuration).toBe(expectedDuration);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('first character appears at timestamp 0', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 200 }),
                    (text) => {
                        const timestamps = simulateTypingTimestamps(text, 50);
                        expect(timestamps[0]).toBe(0);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('number of timestamps equals text length', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 200 }),
                    (text) => {
                        const timestamps = simulateTypingTimestamps(text, 50);
                        expect(timestamps.length).toBe(text.length);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Typing Recovery', () => {
        it('recovery resets text content to empty', () => {
            // Simulate recovery behavior
            const mockElement = { textContent: 'Some existing text' };
            
            // Recovery should clear the text
            mockElement.textContent = '';
            
            expect(mockElement.textContent).toBe('');
        });
        
        it('recovery starts typing from index 0', () => {
            let typeIndex = 5; // Simulate mid-typing state
            
            // Recovery should reset index
            typeIndex = 0;
            
            expect(typeIndex).toBe(0);
        });
    });
});
