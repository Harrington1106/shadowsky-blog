(function() {
    // Debug helper
    function debug(msg) {
        console.log(`[ContextMenu] ${msg}`);
    }

    function initContextMenu() {
        // Prevent duplicate initialization
        if (document.getElementById('custom-context-menu')) {
            debug('Already initialized');
            return;
        }

        debug('Initializing...');

        // 1. Inject CSS
        const style = document.createElement('style');
        style.textContent = `
            #custom-context-menu {
                position: fixed;
                z-index: 10000;
                width: 220px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05);
                padding: 6px;
                display: flex;
                flex-direction: column;
                opacity: 0;
                transform: scale(0.95);
                visibility: hidden;
                transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
                font-family: 'Inter', 'Noto Sans SC', sans-serif;
            }
            
            html.dark #custom-context-menu {
                background: rgba(30, 30, 30, 0.95);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1);
            }

            #custom-context-menu.visible {
                visibility: visible;
                opacity: 1;
                transform: scale(1);
            }

            .ctx-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                font-size: 14px;
                color: #374151;
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.1s;
                user-select: none;
            }

            html.dark .ctx-item {
                color: #d1d5db;
            }

            .ctx-item:hover {
                background-color: #eff6ff;
                color: #2563eb;
            }

            html.dark .ctx-item:hover {
                background-color: rgba(59, 130, 246, 0.15);
                color: #60a5fa;
            }

            .ctx-icon {
                width: 16px;
                height: 16px;
                margin-right: 10px;
                stroke-width: 2px;
            }

            .ctx-divider {
                height: 1px;
                background-color: #e5e7eb;
                margin: 4px 0;
            }

            html.dark .ctx-divider {
                background-color: #374151;
            }
            
            .ctx-shortcut {
                margin-left: auto;
                font-size: 10px;
                color: #9ca3af;
                font-weight: 500;
            }
            
            #ctx-dynamic:empty {
                display: none;
            }
        `;
        document.head.appendChild(style);

        // 2. Create DOM
        const menu = document.createElement('div');
        menu.id = 'custom-context-menu';
        
        // Dynamic Content Container (Element Specific + Page Specific)
        const dynamicContainer = document.createElement('div');
        dynamicContainer.id = 'ctx-dynamic';
        menu.appendChild(dynamicContainer);
        
        // Divider
        const dynamicDivider = document.createElement('div');
        dynamicDivider.className = 'ctx-divider';
        dynamicDivider.id = 'ctx-dynamic-divider';
        dynamicDivider.style.display = 'none';
        menu.appendChild(dynamicDivider);

        // Static Content Container
        const staticContainer = document.createElement('div');
        staticContainer.id = 'ctx-static';
        menu.appendChild(staticContainer);

        // Helper to create item
        function createMenuItem(item, parent) {
            if (item.type === 'divider') {
                const div = document.createElement('div');
                div.className = 'ctx-divider';
                if (item.id) div.id = item.id;
                parent.appendChild(div);
                return div;
            }
            
            const el = document.createElement('div');
            el.className = 'ctx-item';
            if (item.id) el.id = item.id;
            
            el.innerHTML = `
                <i data-lucide="${item.icon}" class="ctx-icon"></i>
                <span>${item.label}</span>
                ${item.shortcut ? `<span class="ctx-shortcut">${item.shortcut}</span>` : ''}
            `;
            
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (item.action) item.action();
                hideMenu();
            });
            
            parent.appendChild(el);
            return el;
        }

        // Logic for Back to Top
        function handleBackToTop() {
            // Try to trigger the main back-to-top button to get the animation
            const backToTopBtn = document.getElementById('back-to-top');
            if (backToTopBtn) {
                backToTopBtn.click();
                return;
            }

            // Fallback logic
            // 1. Check for RSS Article Content or List
            const rssContent = document.getElementById('article-content');
            if (rssContent && rssContent.offsetParent !== null) {
                rssContent.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            const rssList = document.getElementById('article-list');
            if (rssList && rssList.offsetParent !== null) {
                rssList.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // 2. Check for Lenis
            if (window.lenis) {
                window.lenis.scrollTo(0);
            } else {
                // 3. Fallback to native
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        // Context Definitions
        
        // Element Contexts: Specific elements that have their own menu items
        const elementContexts = [
            {
                selector: '.video-item',
                getItems: (target) => {
                    const el = target.closest('.video-item');
                    const videoId = el.dataset.id;
                    const bvid = el.dataset.bvid;
                    const title = el.dataset.title;
                    const items = [
                        { label: '播放视频', icon: 'play-circle', action: () => window.videoLoader?.playVideo(parseInt(videoId)) }
                    ];
                    if (bvid && bvid !== 'undefined') {
                        items.push(
                            { label: '复制链接', icon: 'link', action: () => { navigator.clipboard.writeText(`https://www.bilibili.com/video/${bvid}`); alert('链接已复制到剪贴板'); } },
                            { label: '在 B 站打开', icon: 'external-link', action: () => window.open(`https://www.bilibili.com/video/${bvid}`, '_blank') }
                        );
                    }
                    items.push({ label: '稍后观看', icon: 'clock', action: () => alert(`已将 "${title}" 加入稍后观看列表`) });
                    return items;
                }
            },
            {
                selector: '.blog-post-card',
                getItems: (target) => {
                    const el = target.closest('.blog-post-card');
                    const file = el.dataset.file;
                    const title = el.dataset.title;
                    const link = `${window.location.origin}/post.html?file=${file}`;
                    return [
                        { label: '阅读文章', icon: 'book-open', action: () => window.location.href = link },
                        { label: '在新标签页打开', icon: 'external-link', action: () => window.open(link, '_blank') },
                        { label: '复制链接', icon: 'link', action: () => { navigator.clipboard.writeText(link); alert('文章链接已复制'); } },
                        { label: '分享到 Twitter', icon: 'share-2', action: () => {
                             const text = `Read "${title}" on ShadowSky Blog`;
                             const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
                             window.open(url, '_blank');
                        }}
                    ];
                }
            },
            {
                selector: '.anime-item',
                getItems: (target) => {
                    const el = target.closest('.anime-item');
                    const title = el.dataset.title;
                    return [
                         { label: '标记为已看', icon: 'check-circle', action: () => alert(`已更新 "${title}" 观看进度`) },
                         { label: '搜索该番剧', icon: 'search', action: () => window.open(`https://bgm.tv/subject_search/${encodeURIComponent(title)}`, '_blank') }
                    ];
                }
            }
        ];

        // Page Contexts: Page-specific items (shown if no element context matched, or we can choose to merge)
        const pageContexts = [
            {
                // Post Page
                check: () => document.getElementById('post-title') || window.location.pathname.includes('post.html'),
                getItems: () => {
                    const title = document.getElementById('post-title')?.textContent.trim() || document.title;
                    const link = window.location.href;
                    const items = [];
                    
                    items.push(
                        { label: '复制文章链接', icon: 'link', action: () => { navigator.clipboard.writeText(link); alert('文章链接已复制'); } },
                        { label: '分享到 Twitter', icon: 'share-2', action: () => {
                             const text = `Read "${title}" on ShadowSky Blog`;
                             const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
                             window.open(url, '_blank');
                        }},
                        { label: '返回文章列表', icon: 'arrow-left', action: () => window.location.href = 'blog.html' }
                    );
                    return items;
                }
            },
            {
                // About Page
                check: () => document.getElementById('wave-btn'),
                getItems: () => [
                    { label: '打个招呼', icon: 'hand', action: () => document.getElementById('wave-btn').click() },
                    { label: '发送邮件', icon: 'mail', action: () => window.location.href = 'mailto:contact@shadowsky.com' },
                    { label: '访问 GitHub', icon: 'github', action: () => window.open('https://github.com/shadowsky', '_blank') }
                ]
            },
            {
                // Video Page Global (Only if videoLoader is present and we are on video page)
                check: () => window.videoLoader && document.querySelector('#video-grid'),
                getItems: () => [
                    { label: '随机播放', icon: 'shuffle', action: () => {
                        const videos = document.querySelectorAll('.video-item');
                        if (videos.length) videos[Math.floor(Math.random() * videos.length)].click();
                    }},
                    { label: '刷新视频列表', icon: 'rotate-cw', action: () => window.videoLoader?.init() },
                    { label: '番剧索引', icon: 'search', action: () => window.open('https://bgm.tv/', '_blank') }
                ]
            },
            {
                // RSS Page
                check: () => window.location.pathname.includes('rss.html'),
                getItems: () => [
                    { label: '刷新订阅', icon: 'refresh-cw', action: () => document.getElementById('refresh-feeds-btn')?.click() },
                    { label: '添加订阅', icon: 'plus', action: () => document.getElementById('add-feed-btn')?.click() },
                    { label: 'AI 设置', icon: 'settings', action: () => document.getElementById('settings-btn')?.click() }
                ]
            }
        ];

        // Static Items (Global)
        // We use a function because some items might change (like theme icon)
        // But for efficiency we can just update the DOM elements in showMenu
        const staticItems = [
            { label: '返回', icon: 'arrow-left', action: () => window.history.back(), shortcut: 'Alt+←' },
            { label: '前进', icon: 'arrow-right', action: () => window.history.forward(), shortcut: 'Alt+→' },
            { label: '刷新', icon: 'rotate-cw', action: () => window.location.reload(), shortcut: 'F5' },
            { type: 'divider' },
            { label: '复制', icon: 'copy', action: () => {
                const s = window.getSelection().toString();
                if(s) navigator.clipboard.writeText(s);
            }, id: 'ctx-copy' }, // Hidden by default if no selection
            { type: 'divider' },
            { label: '切换主题', icon: 'moon', action: () => window.toggleTheme && window.toggleTheme(), id: 'ctx-theme' },
            { label: '回到顶部', icon: 'arrow-up-to-line', action: handleBackToTop },
            { label: '首页', icon: 'home', action: () => window.location.href = 'index.html' }
        ];

        // Ensure body exists before appending
        if (document.body) {
            document.body.appendChild(menu);
            
            // Render static items once
            staticItems.forEach(item => createMenuItem(item, staticContainer));
            debug('Menu appended to body');
        }

        function hideMenu() {
            if (!menu) return;
            menu.classList.remove('visible');
        }

        function showMenu(e) {
            e.preventDefault();
            debug('Show menu trigger');

            try {
                // 1. Clear Dynamic Container
                dynamicContainer.innerHTML = '';
                let hasDynamic = false;
                const target = e.target;
                if (!target) return;

                // 2. Check Element Contexts
                for (const ctx of elementContexts) {
                    if (target.closest(ctx.selector)) {
                        const items = ctx.getItems(target);
                        if (items && items.length > 0) {
                            items.forEach(item => createMenuItem(item, dynamicContainer));
                            hasDynamic = true;
                            // If we matched a specific element, we stop searching element contexts.
                            // But should we also show Page Contexts?
                            // Usually if I click a Video Card, I want Video options, not Page options (like Refresh Feeds).
                            // So we break here.
                            break;
                        }
                    }
                }

                // 3. Check Page Contexts (Only if no element context was found OR we decide to stack them)
                // For now, if we found element context, we skip page context to keep it clean.
                if (!hasDynamic) {
                    for (const ctx of pageContexts) {
                        if (ctx.check(target)) {
                            const items = ctx.getItems();
                            if (items && items.length > 0) {
                                items.forEach(item => createMenuItem(item, dynamicContainer));
                                hasDynamic = true;
                                break; // Only first matching page context
                            }
                        }
                    }
                }

                // 4. Update Static Items Visibility/State
                
                // Copy Button Visibility
                const copyBtn = document.getElementById('ctx-copy');
                if (copyBtn) {
                    const selection = window.getSelection().toString();
                    copyBtn.style.display = selection ? 'flex' : 'none';
                    // Also hide the divider before it if copy is hidden?
                    // The divider is the previous sibling.
                    const prev = copyBtn.previousElementSibling;
                    if (prev && prev.classList.contains('ctx-divider')) {
                        prev.style.display = selection ? 'block' : 'none';
                    }
                }

                // Theme Button State
                const themeBtn = document.getElementById('ctx-theme');
                if (themeBtn) {
                    const isDark = document.documentElement.classList.contains('dark');
                    const icon = themeBtn.querySelector('.ctx-icon');
                    const text = themeBtn.querySelector('span:not(.ctx-shortcut)');
                    
                    if (icon && text) {
                         // Reset icon element if it was replaced by lucide (svg)
                         // Actually lucide replaces <i> with <svg>.
                         // We can just update the attribute if it's <i>, or re-create if it's <svg>
                         // Simplest: clear and re-create icon
                         
                         let newIcon = document.createElement('i');
                         newIcon.className = 'ctx-icon';
                         
                         if (isDark) {
                             newIcon.setAttribute('data-lucide', 'sun');
                             text.textContent = '切换亮色';
                         } else {
                             newIcon.setAttribute('data-lucide', 'moon');
                             text.textContent = '切换暗色';
                         }
                         
                         if (icon.tagName.toLowerCase() === 'svg') {
                             icon.replaceWith(newIcon);
                         } else {
                             // It's <i>
                             icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
                             text.textContent = isDark ? '切换亮色' : '切换暗色';
                         }
                    }
                }

                // Divider Visibility
                dynamicDivider.style.display = hasDynamic ? 'block' : 'none';

                // Render Icons
                if (window.lucide) window.lucide.createIcons();

                // Position
                let x = e.clientX;
                let y = e.clientY;
                const winWidth = window.innerWidth;
                const winHeight = window.innerHeight;
                const menuWidth = 220;
                const menuHeight = menu.offsetHeight || 300;

                if (x + menuWidth > winWidth) x = winWidth - menuWidth - 10;
                if (y + menuHeight > winHeight) y = winHeight - menuHeight - 10;

                menu.style.left = `${x}px`;
                menu.style.top = `${y}px`;
                menu.classList.add('visible');

            } catch (error) {
                console.error('Context Menu Error:', error);
            }
        }

        // Event Listeners
        document.addEventListener('contextmenu', showMenu);
        document.addEventListener('click', (e) => {
            if (menu && !menu.contains(e.target)) hideMenu();
        });
        window.addEventListener('scroll', hideMenu);
        
        debug('Initialization complete');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContextMenu);
    } else {
        initContextMenu();
    }
})();
