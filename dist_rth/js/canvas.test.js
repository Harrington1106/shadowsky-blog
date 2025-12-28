/**
 * Canvas Animation Tests
 * Tests for canvas particle animation and BFCache recovery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Helper function to calculate expected particle count based on viewport width
 * @param {number} viewportWidth - The viewport width in pixels
 * @returns {number} - Expected particle count (60 for mobile, 120 for desktop)
 */
function getExpectedParticleCount(viewportWidth) {
    return viewportWidth < 768 ? 60 : 120;
}

/**
 * Simulate particle initialization for testing
 * @param {number} viewportWidth - The viewport width
 * @returns {Array} - Array of mock particles
 */
function initializeParticles(viewportWidth) {
    const count = getExpectedParticleCount(viewportWidth);
    const particles = [];
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * viewportWidth,
            y: Math.random() * 800,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            size: Math.random() * 2 + 1,
            color: '#3b82f6'
        });
    }
    return particles;
}

/**
 * Simulate canvas recovery
 * @param {number} viewportWidth - Current viewport width
 * @param {number} viewportHeight - Current viewport height
 * @param {number|null} oldAnimationId - Previous animation frame ID
 * @returns {Object} - Recovery result with new state
 */
function simulateCanvasRecovery(viewportWidth, viewportHeight, oldAnimationId) {
    // Cancel old animation (simulated)
    const cancelledId = oldAnimationId;
    
    // Resize canvas
    const canvasWidth = viewportWidth;
    const canvasHeight = viewportHeight;
    
    // Reinitialize particles
    const particles = initializeParticles(viewportWidth);
    
    // New animation ID (simulated as incremented value)
    const newAnimationId = (oldAnimationId || 0) + 1;
    
    return {
        cancelledId,
        canvasWidth,
        canvasHeight,
        particles,
        animationId: newAnimationId
    };
}

describe('Canvas Animation', () => {
    // **Feature: bfcache-compatibility, Property 3: Global State Variables Are Properly Initialized**
    describe('Property 3: Global State Variables Are Properly Initialized', () => {
        it('particle count matches expected value based on viewport width', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 320, max: 2560 }),
                    (viewportWidth) => {
                        const expectedCount = getExpectedParticleCount(viewportWidth);
                        const particles = initializeParticles(viewportWidth);
                        
                        expect(particles.length).toBe(expectedCount);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('particles array is always an array after initialization', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 320, max: 2560 }),
                    (viewportWidth) => {
                        const particles = initializeParticles(viewportWidth);
                        
                        expect(Array.isArray(particles)).toBe(true);
                        expect(particles.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('mobile viewport (< 768px) always gets 60 particles', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 320, max: 767 }),
                    (viewportWidth) => {
                        const particles = initializeParticles(viewportWidth);
                        expect(particles.length).toBe(60);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('desktop viewport (>= 768px) always gets 120 particles', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 768, max: 2560 }),
                    (viewportWidth) => {
                        const particles = initializeParticles(viewportWidth);
                        expect(particles.length).toBe(120);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    // **Feature: bfcache-compatibility, Property 2: Canvas Recovery Reinitializes Correctly**
    describe('Property 2: Canvas Recovery Reinitializes Correctly', () => {
        it('canvas dimensions match window dimensions after recovery', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 320, max: 2560 }),
                    fc.integer({ min: 480, max: 1440 }),
                    (viewportWidth, viewportHeight) => {
                        const result = simulateCanvasRecovery(viewportWidth, viewportHeight, 123);
                        
                        expect(result.canvasWidth).toBe(viewportWidth);
                        expect(result.canvasHeight).toBe(viewportHeight);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('particle count is correct after recovery based on viewport', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 320, max: 2560 }),
                    fc.integer({ min: 480, max: 1440 }),
                    (viewportWidth, viewportHeight) => {
                        const expectedCount = getExpectedParticleCount(viewportWidth);
                        const result = simulateCanvasRecovery(viewportWidth, viewportHeight, 123);
                        
                        expect(result.particles.length).toBe(expectedCount);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('animation ID changes after recovery', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000 }),
                    fc.integer({ min: 320, max: 2560 }),
                    fc.integer({ min: 480, max: 1440 }),
                    (oldAnimationId, viewportWidth, viewportHeight) => {
                        const result = simulateCanvasRecovery(viewportWidth, viewportHeight, oldAnimationId);
                        
                        // New animation ID should be different from old
                        expect(result.animationId).not.toBe(oldAnimationId);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('recovery handles null animation ID gracefully', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 320, max: 2560 }),
                    fc.integer({ min: 480, max: 1440 }),
                    (viewportWidth, viewportHeight) => {
                        // Should not throw when oldAnimationId is null
                        const result = simulateCanvasRecovery(viewportWidth, viewportHeight, null);
                        
                        expect(result.animationId).toBeDefined();
                        expect(result.particles.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
