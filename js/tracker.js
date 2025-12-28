// Tracker Configuration
const API_BASE = 'http://47.118.28.27'; // Aliyun Backend

(function() {
    // Prevent double loading
    if (window.__shadowsky_tracker_loaded) return;
    window.__shadowsky_tracker_loaded = true;

    // Configuration
    const ENDPOINT = API_BASE + '/api/visit.php';

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
