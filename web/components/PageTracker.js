'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const LEAVE_MESSAGES = ['憋走嘛 QAQ', '网页要长草了...', '你就这么走了吗 (T_T)', '再待一会嘛~', '页面想你了...', '真的要走吗 ;-;', '苟富贵 勿相忘！', '记得回来看看哦'];
const BACK_MESSAGES = ['你回来啦！(^_^)', '欢迎回来~', '等你好久啦 >_<', '终于回来了！', '想死你了！'];

/**
 * 页面访问上报 + 动态标题彩蛋 —— 移植自 ../../js/tracker.js
 * 原版依赖整页 load 事件（每个 .html 只触发一次）；
 * SPA 路由下改为每次 pathname 变化都上报一次页面访问。
 */
export default function PageTracker() {
    const pathname = usePathname();

    useEffect(() => {
        const data = { url: window.location.href, referrer: document.referrer, ts: Date.now() };

        fetch('/api/page-visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: data.url }),
            keepalive: true,
        }).catch(() => {});

        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon('/api/visit.php', blob);
        } else {
            fetch('/api/visit.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true,
            }).catch(() => {});
        }
    }, [pathname]);

    const msgIdxRef = useRef(0);
    useEffect(() => {
        let baseTitle = document.title;
        function onVisibilityChange() {
            if (document.hidden) {
                baseTitle = document.title;
                document.title = LEAVE_MESSAGES[msgIdxRef.current % LEAVE_MESSAGES.length];
                msgIdxRef.current++;
            } else {
                document.title = BACK_MESSAGES[Math.floor(Math.random() * BACK_MESSAGES.length)];
                setTimeout(() => { document.title = baseTitle; }, 1500);
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    return null;
}
