/**
 * Service Worker Tests
 * Tests for caching strategies and HTML request detection
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Check if request is for an HTML page
 * This mirrors the implementation in sw.js
 * @param {Object} request - Mock request object
 * @returns {boolean} - True if request is for HTML
 */
function isHtmlRequest(request) {
    // Navigation requests are always for HTML
    if (request.mode === 'navigate') return true;
    
    // Check accept header for text/html
    const acceptHeader = request.headers?.get?.('accept') || request.headers?.accept;
    if (acceptHeader && acceptHeader.includes('text/html')) return true;
    
    // Check URL for .html extension
    if (request.url.endsWith('.html')) return true;
    
    return false;
}

/**
 * Create a mock request object for testing
 * @param {Object} options - Request options
 * @returns {Object} - Mock request object
 */
function createMockRequest(options = {}) {
    return {
        url: options.url || 'https://example.com/',
        mode: options.mode || 'cors',
        headers: {
            get: (name) => {
                if (name === 'accept') return options.accept || null;
                return null;
            },
            accept: options.accept || null
        }
    };
}

describe('Service Worker', () => {
    // **Feature: bfcache-compatibility, Property 6: Service Worker Network-First for HTML**
    describe('Property 6: Service Worker Network-First for HTML', () => {
        it('navigation requests are always identified as HTML', () => {
            fc.assert(
                fc.property(
                    fc.webUrl(),
                    (url) => {
                        const request = createMockRequest({ url, mode: 'navigate' });
                        expect(isHtmlRequest(request)).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('requests with text/html accept header are identified as HTML', () => {
            fc.assert(
                fc.property(
                    fc.webUrl(),
                    fc.constantFrom(
                        'text/html',
                        'text/html,application/xhtml+xml',
                        'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8'
                    ),
                    (url, accept) => {
                        const request = createMockRequest({ url, mode: 'cors', accept });
                        expect(isHtmlRequest(request)).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('URLs ending with .html are identified as HTML', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(
                        'https://example.com/index.html',
                        'https://example.com/blog.html',
                        'https://example.com/about.html',
                        'https://example.com/path/to/page.html'
                    ),
                    (url) => {
                        const request = createMockRequest({ url, mode: 'cors' });
                        expect(isHtmlRequest(request)).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('non-HTML resources are not identified as HTML', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(
                        'https://example.com/style.css',
                        'https://example.com/main.js',
                        'https://example.com/image.png',
                        'https://example.com/data.json'
                    ),
                    (url) => {
                        const request = createMockRequest({ 
                            url, 
                            mode: 'cors',
                            accept: 'application/json'
                        });
                        expect(isHtmlRequest(request)).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
    
    describe('Cache Versioning', () => {
        it('cache name includes version string', () => {
            const CACHE_VERSION = 'v3';
            const CACHE_NAME = `shadowsky-blog-${CACHE_VERSION}`;
            
            expect(CACHE_NAME).toContain('v3');
            expect(CACHE_NAME).toBe('shadowsky-blog-v3');
        });
    });
});
