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
            #custom-context-menu{position:fixed;z-index:10000;width:210px;background:rgba(255,255,255,.82);
              backdrop-filter:blur(20px) saturate(1.1);-webkit-backdrop-filter:blur(20px) saturate(1.1);
              border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.1),0 0 0 1px rgba(0,0,0,.05);
              padding:6px;display:flex;flex-direction:column;opacity:0;transform:scale(.94);
              visibility:hidden;transition:opacity .15s ease,transform .15s ease,visibility .15s;
              font-family:'Inter','Noto Sans SC',sans-serif}
            html.dark #custom-context-menu{background:rgba(15,23,42,.88);box-shadow:0 8px 32px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.06)}
            #custom-context-menu.visible{visibility:visible;opacity:1;transform:scale(1)}
            .ctx-item{display:flex;align-items:center;padding:7px 12px;font-size:.8rem;color:#374151;cursor:pointer;
              border-radius:8px;transition:all .12s ease;user-select:none;font-weight:500;gap:10px}
            html.dark .ctx-item{color:#d1d5db}
            .ctx-item:hover{background:rgba(20,184,166,.08);color:#0d9488}
            html.dark .ctx-item:hover{background:rgba(45,212,191,.1);color:#2dd4bf}
            .ctx-icon{width:16px;height:16px;opacity:.55;flex-shrink:0}
            .ctx-shortcut{margin-left:auto;font-size:.65rem;opacity:.35;font-weight:400}
            .ctx-divider{height:1px;background:#e5e7eb;margin:3px 8px}
            html.dark .ctx-divider{background:rgba(255,255,255,.08)}
            }

            html.dark .ctx-divider {
                background-color: rgba(255,255,255,0.06);
            }

            .ctx-shortcut {
                margin-left: auto;
                font-size: 10px;
                color: #9ca3af;
                font-weight: 500;
                font-family: 'JetBrains Mono', 'Fira Code', monospace;
            }

            html.dark .ctx-shortcut {
                color: rgba(255,255,255,0.3);
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
            const rssScrollView = document.getElementById('article-scroll-view');
            if (rssScrollView && rssScrollView.offsetParent !== null) {
                rssScrollView.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
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
                        { label: '播放视频', icon: 'circle-play', action: () => window.videoLoader?.playVideo(parseInt(videoId)) }
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
                selector: '.blog-card',
                getItems: (target) => {
                    const el = target.closest('.blog-card');
                    const file = el.dataset.file;
                    const title = el.dataset.title || '文章';
                    if (!file) return [];
                    const link = `${window.location.origin}/post.html?file=${encodeURIComponent(file)}`;
                    return [
                        { label: '阅读文章', icon: 'book-open', action: () => window.location.href = link },
                        { label: '在新标签页打开', icon: 'external-link', action: () => window.open(link, '_blank') },
                        { label: '复制文章链接', icon: 'link', action: () => { navigator.clipboard.writeText(link); alert('文章链接已复制到剪贴板'); } },
                        { type: 'divider' },
                        { label: '分享到 Twitter', icon: 'twitter', action: () => {
                             const text = `Read "${title}" on Shadow Quake`;
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
                         { label: '标记为已看', icon: 'circle-check', action: () => alert(`已更新 "${title}" 观看进度`) },
                         { label: '搜索该番剧', icon: 'search', action: () => window.open(`https://bgm.tv/subject_search/${encodeURIComponent(title)}`, '_blank') }
                    ];
                }
            }
        ];

        // Page Contexts: Page-specific items (shown if no element context matched, or we can choose to merge)
        const pageContexts = [
            {   // 首页
                check: () => window.location.pathname === '/' || window.location.pathname.endsWith('index.html'),
                getItems: () => [
                    { label: '星空笔记', icon: 'file-text', action: () => window.location.href = 'blog.html' },
                    { label: 'RSS 订阅', icon: 'rss', action: () => window.location.href = 'rss.html' },
                    { label: 'ACG 空间', icon: 'film', action: () => window.location.href = 'acg.html' },
                ]
            },
            {   // 博客列表
                check: () => document.getElementById('posts-container') || window.location.pathname.includes('blog.html'),
                getItems: () => [
                    { label: '搜索笔记', icon: 'search', action: () => { const i=document.getElementById('search-input');if(i){i.focus();i.scrollIntoView({behavior:'smooth'})} }, shortcut: '⌘K' },
                    { type: 'divider' },
                    { label: '网格视图', icon: 'grid-3x3', action: () => { if(window.switchView) window.switchView('grid') } },
                    { label: '时间轴', icon: 'clock', action: () => { if(window.switchView) window.switchView('timeline') } },
                    { label: '目录', icon: 'folder-tree', action: () => { if(window.switchView) window.switchView('directory') } },
                    { label: '标签', icon: 'tags', action: () => { if(window.switchView) window.switchView('tags') } },
                ]
            },
            {   // 文章详情
                check: () => document.getElementById('post-title') || window.location.pathname.includes('post.html'),
                getItems: () => {
                    const title = document.getElementById('post-title')?.textContent.trim() || document.title;
                    const link = window.location.href;
                    return [
                        { label: '复制链接', icon: 'link', action: () => { navigator.clipboard.writeText(link); alert('已复制') } },
                        { label: '返回列表', icon: 'chevron-left', action: () => window.location.href = 'blog.html' },
                    ];
                }
            },
            {   // RSS
                check: () => window.location.pathname.includes('rss.html'),
                getItems: () => [
                    { label: '刷新订阅', icon: 'rotate-cw', action: () => document.getElementById('refresh-feeds-btn')?.click() },
                    { label: 'AI 翻译设置', icon: 'bot', action: () => document.getElementById('settings-btn')?.click() },
                    { label: '专注模式', icon: 'scan-eye', action: () => document.getElementById('focus-toggle')?.click() },
                ]
            },
            {   // ACG
                check: () => window.location.pathname.includes('acg.html'),
                getItems: () => [
                    { label: '我的追番', icon: 'tv', action: () => window.location.href = 'anime.html' },
                    { label: '我的漫画', icon: 'book-open', action: () => window.location.href = 'manga.html' },
                    { label: '全部剪辑', icon: 'clapperboard', action: () => window.location.href = 'edits.html' },
                ]
            },
            {   // 收藏
                check: () => window.location.pathname.includes('bookmarks.html'),
                getItems: () => [
                    { label: '搜索收藏', icon: 'search', action: () => { const i=document.getElementById('search-input');if(i)i.focus() } },
                    { label: '随机打开', icon: 'shuffle', action: () => { const links=document.querySelectorAll('.bookmark-card a');if(links.length)window.open(links[Math.floor(Math.random()*links.length)].href,'_blank') } },
                ]
            },
            {   // 片刻
                check: () => window.location.pathname.includes('moments.html'),
                getItems: () => [
                    { label: '随机漫游', icon: 'shuffle', action: () => { const btn=document.getElementById('random- stroll-btn')||document.querySelector('[onclick*=\"random\"]');if(btn)btn.click();else{const imgs=document.querySelectorAll('.moment-card img');if(imgs.length)imgs[Math.floor(Math.random()*imgs.length)].scrollIntoView({behavior:'smooth'})} } },
                ]
            },
            {   // 关于
                check: () => window.location.pathname.includes('about.html'),
                getItems: () => [
                    { label: '打个招呼', icon: 'hand', action: () => document.getElementById('wave-btn')?.click() },
                    { label: '发送邮件', icon: 'mail', action: () => window.location.href = 'mailto:contact@shadowsky.com' },
                ]
            },
        ];

        // Static Items (Global)
        // We use a function because some items might change (like theme icon)
        // But for efficiency we can just update the DOM elements in showMenu
        const staticItems = [
            { label: '返回', icon: 'chevron-left', action: () => window.history.back(), shortcut: '⌫' },
            { label: '刷新', icon: 'rotate-cw', action: () => window.location.reload(), shortcut: '⌘R' },
            { type: 'divider' },
            { label: '切换主题', icon: 'sun', action: () => window.toggleTheme?.(), id: 'ctx-theme' },
            { label: '回到顶部', icon: 'chevron-up', action: handleBackToTop },
            { label: '首页', icon: 'house', action: () => window.location.href = 'index.html' },
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

                // Theme Button State — 每次右键时刷新图标和文字
                const themeBtn = document.getElementById('ctx-theme');
                if (themeBtn) {
                    const isDark = document.documentElement.classList.contains('dark');
                    const iconEl = themeBtn.querySelector('.ctx-icon');
                    const labelEl = themeBtn.querySelector('span:not(.ctx-shortcut)');
                    if (iconEl && labelEl) {
                        // 重建 <i>，避免 lucide SVG 状态混乱
                        const newIcon = document.createElement('i');
                        newIcon.className = 'ctx-icon';
                        newIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
                        iconEl.replaceWith(newIcon);
                        labelEl.textContent = isDark ? '切换亮色' : '切换暗色';
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
