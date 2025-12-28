// Tracker Configuration
// Use existing API_CONFIG if available, otherwise fallback to dynamic determination
const TRACKER_ENDPOINT = (function() {
    if (typeof API_CONFIG !== 'undefined' && API_CONFIG.baseUrl) {
        return API_CONFIG.baseUrl + '/visit.php';
    }
    
    // Fallback logic similar to api.js
    const hostname = window.location.hostname;
    if (hostname === 'shadowquake.top' || hostname === 'www.shadowquake.top') {
        return '/api/visit.php';
    }
    
    // Default to relative path for safety
    return '/api/visit.php';
})();

(function() {
    // Prevent double loading
    if (window.__shadowsky_tracker_loaded) return;
    window.__shadowsky_tracker_loaded = true;

    // Configuration
    const ENDPOINT = TRACKER_ENDPOINT;

    function track() {
        // Prepare data
        const data = {
            url: window.location.href,
            referrer: document.referrer
        };
        
        // Log to console for debugging
        console.log('[Tracker] Sending visit data to:', ENDPOINT);

        // Send beacon or fetch
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon(ENDPOINT, blob);
        } else {
            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true
            }).catch(e => {
                // Silent fail
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
