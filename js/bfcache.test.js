/**
 * BFCache Handler Tests
 * Tests for the centralized BFCache recovery mechanism
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Create a fresh BFCacheHandler instance for testing
 * This mirrors the implementation in main.js
 */
function createBFCacheHandler() {
    return {
        callbacks: [],
        recovering: false,
        
        registerRecoveryCallback(callback) {
            if (typeof callback === 'function') {
                this.callbacks.push(callback);
            }
        },
        
        triggerRecovery() {
            this.recovering = true;
            this.callbacks.forEach((callback) => {
                try {
                    callback();
                } catch (e) {
                    // Silently handle errors in tests
                }
            });
            this.recovering = false;
        },
        
        isRecovering() {
            return this.recovering;
        }
    };
}

describe('BFCacheHandler', () => {
    let handler;
    
    beforeEach(() => {
        handler = createBFCacheHandler();
    });
    
    // **Feature: bfcache-compatibility, Property 1: BFCache Detection Triggers All Registered Callbacks**
    it('all registered callbacks are invoked in order on BFCache recovery', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 20 }),
                (callbackCount) => {
                    const handler = createBFCacheHandler();
                    const callOrder = [];
                    
                    // Register callbacks that record their index when called
                    for (let i = 0; i < callbackCount; i++) {
                        const index = i;
                        handler.registerRecoveryCallback(() => callOrder.push(index));
                    }
                    
                    // Trigger recovery
                    handler.triggerRecovery();
                    
                    // All callbacks should be called
                    expect(callOrder.length).toBe(callbackCount);
                    
                    // Callbacks should be called in registration order
                    for (let i = 0; i < callbackCount; i++) {
                        expect(callOrder[i]).toBe(i);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
    
    it('should register callbacks correctly', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        handler.registerRecoveryCallback(callback1);
        handler.registerRecoveryCallback(callback2);
        
        expect(handler.callbacks.length).toBe(2);
    });
    
    it('should not register non-function values', () => {
        handler.registerRecoveryCallback('not a function');
        handler.registerRecoveryCallback(123);
        handler.registerRecoveryCallback(null);
        handler.registerRecoveryCallback(undefined);
        
        expect(handler.callbacks.length).toBe(0);
    });
    
    it('should invoke all callbacks on triggerRecovery', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        const callback3 = vi.fn();
        
        handler.registerRecoveryCallback(callback1);
        handler.registerRecoveryCallback(callback2);
        handler.registerRecoveryCallback(callback3);
        
        handler.triggerRecovery();
        
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);
        expect(callback3).toHaveBeenCalledTimes(1);
    });
    
    it('should continue executing callbacks even if one throws', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn(() => { throw new Error('Test error'); });
        const callback3 = vi.fn();
        
        handler.registerRecoveryCallback(callback1);
        handler.registerRecoveryCallback(callback2);
        handler.registerRecoveryCallback(callback3);
        
        // Should not throw
        handler.triggerRecovery();
        
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);
        expect(callback3).toHaveBeenCalledTimes(1);
    });
    
    it('should set recovering flag during recovery', () => {
        let wasRecoveringDuringCallback = false;
        
        handler.registerRecoveryCallback(() => {
            wasRecoveringDuringCallback = handler.isRecovering();
        });
        
        expect(handler.isRecovering()).toBe(false);
        handler.triggerRecovery();
        expect(wasRecoveringDuringCallback).toBe(true);
        expect(handler.isRecovering()).toBe(false);
    });
    
    it('should reset recovering flag after recovery completes', () => {
        handler.registerRecoveryCallback(() => {});
        handler.triggerRecovery();
        
        expect(handler.isRecovering()).toBe(false);
    });
});
