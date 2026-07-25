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

        // 同时通知 Node 服务器更新页面访问计数
        try {
            fetch('/api/page-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: data.url }),
                keepalive: true
            }).catch(function(){});
        } catch(e) {}

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

    // ═══════════════════════════════════════════
    // 动态标题：离开时撒娇，回来时欢迎
    // ═══════════════════════════════════════════
    if (!window.__title_switch_loaded) {
        window.__title_switch_loaded = true;
        var baseTitle = document.title;
        var leaveMessages = [
            '憋走嘛 QAQ',
            '网页要长草了...',
            '你就这么走了吗 (T_T)',
            '再待一会嘛~',
            '页面想你了...',
            '真的要走吗 ;-;',
            '苟富贵 勿相忘！',
            '记得回来看看哦'
        ];
        var backMessages = [
            '你回来啦！(^_^)',
            '欢迎回来~',
            '等你好久啦 >_<',
            '终于回来了！',
            '想死你了！'
        ];
        var msgIdx = 0;

        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                baseTitle = document.title;
                document.title = leaveMessages[msgIdx % leaveMessages.length];
                msgIdx++;
            } else {
                document.title = backMessages[Math.floor(Math.random() * backMessages.length)];
                setTimeout(function() {
                    document.title = baseTitle;
                }, 1500);
            }
        });
    }
})();
