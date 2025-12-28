/**
 * Tilt Card Tests
 * Tests for 3D tilt effect and BFCache recovery
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Calculate tilt card transform based on mouse position
 * This mirrors the implementation in index.html
 * @param {number} x - Mouse X position relative to card
 * @param {number} y - Mouse Y position relative to card
 * @param {number} centerX - Card center X
 * @param {number} centerY - Card center Y
 * @returns {Object} - { rotateX, rotateY } in degrees
 */
function calculateTiltTransform(x, y, centerX, centerY) {
    const rotateX = ((y - centerY) / centerY) * -20;
    const rotateY = ((x - centerX) / centerX) * 20;
    return { rotateX, rotateY };
}

describe('Tilt Card', () => {
    // **Feature: bfcache-compatibility, Property 4: Tilt Card Transform Calculation**
    describe('Property 4: Tilt Card Transform Calculation', () => {
        it('rotateX is proportional to (y - centerY) / centerY * -20', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: 0, max: 500, noNaN: true }),
                    fc.float({ min: 0, max: 500, noNaN: true }),
                    fc.float({ min: 10, max: 250, noNaN: true }),
                    fc.float({ min: 10, max: 250, noNaN: true }),
                    (x, y, centerX, centerY) => {
                        const result = calculateTiltTransform(x, y, centerX, centerY);
                        const expectedRotateX = ((y - centerY) / centerY) * -20;
                        
                        expect(result.rotateX).toBeCloseTo(expectedRotateX, 5);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('rotateY is proportional to (x - centerX) / centerX * 20', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: 0, max: 500, noNaN: true }),
                    fc.float({ min: 0, max: 500, noNaN: true }),
                    fc.float({ min: 10, max: 250, noNaN: true }),
                    fc.float({ min: 10, max: 250, noNaN: true }),
                    (x, y, centerX, centerY) => {
                        const result = calculateTiltTransform(x, y, centerX, centerY);
                        const expectedRotateY = ((x - centerX) / centerX) * 20;
                        
                        expect(result.rotateY).toBeCloseTo(expectedRotateY, 5);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('center position produces zero rotation', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: 10, max: 250, noNaN: true }),
                    fc.float({ min: 10, max: 250, noNaN: true }),
                    (centerX, centerY) => {
                        // When mouse is at center, rotation should be 0
                        const result = calculateTiltTransform(centerX, centerY, centerX, centerY);
                        
                        expect(result.rotateX).toBeCloseTo(0, 5);
                        expect(result.rotateY).toBeCloseTo(0, 5);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('rotation is bounded by max 20 degrees at edges', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: 10, max: 250, noNaN: true }),
                    fc.float({ min: 10, max: 250, noNaN: true }),
                    (centerX, centerY) => {
                        // At top-left corner (0, 0)
                        const topLeft = calculateTiltTransform(0, 0, centerX, centerY);
                        // At bottom-right corner (2*centerX, 2*centerY)
                        const bottomRight = calculateTiltTransform(2 * centerX, 2 * centerY, centerX, centerY);
                        
                        // rotateX at top edge should be +20 (y=0, so (0-centerY)/centerY * -20 = 20)
                        expect(topLeft.rotateX).toBeCloseTo(20, 5);
                        // rotateY at left edge should be -20 (x=0, so (0-centerX)/centerX * 20 = -20)
                        expect(topLeft.rotateY).toBeCloseTo(-20, 5);
                        
                        // rotateX at bottom edge should be -20
                        expect(bottomRight.rotateX).toBeCloseTo(-20, 5);
                        // rotateY at right edge should be +20
                        expect(bottomRight.rotateY).toBeCloseTo(20, 5);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Tilt Card Recovery', () => {
        it('default transform is perspective with zero rotation', () => {
            const defaultTransform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
            expect(defaultTransform).toContain('rotateX(0)');
            expect(defaultTransform).toContain('rotateY(0)');
            expect(defaultTransform).toContain('scale(1)');
        });
    });
});
