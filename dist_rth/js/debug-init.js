/**
 * Debug script to diagnose page initialization issues
 * Add this script BEFORE other scripts to see what's happening
 */

console.log('[DEBUG] Script loaded at:', new Date().toISOString());
console.log('[DEBUG] Document readyState:', document.readyState);

// Check if cache.js loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] DOMContentLoaded fired');
    console.log('[DEBUG] window.swrCache available:', !!window.swrCache);
    console.log('[DEBUG] window.CacheManager available:', !!window.CacheManager);
    
    // Check for key elements
    console.log('[DEBUG] #category-nav exists:', !!document.getElementById('category-nav'));
    console.log('[DEBUG] #category-list exists:', !!document.getElementById('category-list'));
    console.log('[DEBUG] #feed-list-items exists:', !!document.getElementById('feed-list-items'));
});

// Monitor fetch requests
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    console.log('[DEBUG] Fetch:', args[0]);
    try {
        const response = await originalFetch.apply(this, args);
        console.log('[DEBUG] Fetch response:', args[0], response.status, response.ok);
        return response;
    } catch (e) {
        console.error('[DEBUG] Fetch error:', args[0], e);
        throw e;
    }
};

console.log('[DEBUG] Fetch interceptor installed');
