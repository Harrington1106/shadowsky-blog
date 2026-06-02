(function() {
    // Prevent double loading
    // Use var to avoid block-scope conflicts if this IIFE is somehow pasted into another block
    if (window.__shadowsky_tracker_loaded) return;
    window.__shadowsky_tracker_loaded = true;

    // Configuration - Scoped within IIFE
    const TRACKER_ENDPOINT = (function() {
        // Try to use API_CONFIG from api.js if available
        if (typeof window.API_CONFIG !== 'undefined' && window.API_CONFIG.baseUrl) {
            // Remove trailing slash if present to avoid //visit.php
            const base = window.API_CONFIG.baseUrl.replace(/\/$/, '');
            return base + '/visit.php';
        }
        
        // Fallback logic
        const hostname = window.location.hostname;
        if (hostname === 'shadowquake.top' || hostname === 'www.shadowquake.top') {
            // Use relative path on production to auto-match HTTPS
            return '/api/visit.php';
        }
        
        // Default fallback (HTTPS to avoid mixed content)
        return 'https://shadowquake.top/api/visit.php';
    })();

    function track() {
        // Prepare data
        const data = {
            url: window.location.href,
            referrer: document.referrer,
            ts: Date.now()
        };
        
        // Log to console for debugging
        console.log('[Tracker] Sending visit data to:', TRACKER_ENDPOINT);

        // Send beacon or fetch
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon(TRACKER_ENDPOINT, blob);
        } else {
            fetch(TRACKER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true
            }).catch(e => {
                console.warn('[Tracker] Failed to send data:', e);
            });
        }
    }

    // Run on load
    if (document.readyState === 'complete') {
        track();
    } else {
        window.addEventListener('load', track);
    }
})();
