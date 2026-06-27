/**
 * Context Menu v3 — 全站右键菜单
 * 每页专属功能 + 通用操作，玻璃质感
 */
(function() {
    'use strict';
    var menu = null, shown = false;

    function create() {
        if (menu) return;
        menu = document.createElement('div');
        menu.id = 'ctx-menu';
        menu.style.cssText = 'position:fixed;z-index:9999;min-width:200px;padding:8px;border-radius:16px;background:rgba(15,20,30,.96);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,.1);box-shadow:0 12px 48px rgba(0,0,0,.5);opacity:0;pointer-events:none;transform:scale(.92) translateY(-8px);transition:opacity .18s,transform .18s;font-size:.84rem;font-family:Inter,Noto Sans SC,sans-serif';
        document.body.appendChild(menu);
    }

    // 内联SVG图标（不依赖Lucide）
    var ICONS = {
        'search': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
        'shuffle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
        'rotate-cw': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
        'sun-moon': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
        'chevron-up': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
        'house': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        'arrow-right': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
        'layout-grid': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
        'external-link': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
        'hand': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.2 0-4.4-1-6-2.6l-2-2.6"/></svg>',
        'mail': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
        'copy': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        'refresh-cw': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    };
    function iconSVG(name) { return ICONS[name] || ''; }

    function itemHTML(it) {
        if (it.type === 'sep') return '<div style="height:1px;background:rgba(255,255,255,.07);margin:5px 10px"></div>';
        if (it.type === 'title') return '<div style="padding:6px 10px 4px;font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.25)">' + it.label + '</div>';
        var icon = it.icon ? '<span style="opacity:.5;flex-shrink:0;display:flex">' + iconSVG(it.icon) + '</span>' : '<span style="width:16px;flex-shrink:0"></span>';
        var sc = it.shortcut ? '<span style="margin-left:auto;font-size:.65rem;opacity:.25;padding-left:16px">' + it.shortcut + '</span>' : '';
        return '<div class="ctx-item" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;color:rgba(255,255,255,.65);transition:all .12s;margin:1px 0" onmouseenter="this.style.background=\'rgba(255,255,255,.06)\';this.style.color=\'#fff\'" onmouseleave="this.style.background=\'transparent\';this.style.color=\'rgba(255,255,255,.65)\'">' + icon + '<span>' + it.label + '</span>' + sc + '</div>';
    }

    function show(x, y, items) {
        create();
        menu.innerHTML = items.map(itemHTML).join('');

        // 只给有 action 的 item 绑定事件，用闭包直接引用
        var actionItems = items.filter(function(it) { return it.action; });
        var actionEls = menu.querySelectorAll('.ctx-item');
        actionItems.forEach(function(it, i) {
            if (actionEls[i]) {
                actionEls[i].addEventListener('click', function(e) {
                    e.stopPropagation();
                    hide();
                    it.action();
                });
            }
        });

        var mw = menu.offsetWidth || 200, mh = menu.offsetHeight || 300;
        if (x + mw > window.innerWidth) x = window.innerWidth - mw - 8;
        if (y + mh > window.innerHeight) y = window.innerHeight - mh - 8;
        x = Math.max(4, x); y = Math.max(4, y);
        menu.style.left = x + 'px'; menu.style.top = y + 'px';
        menu.style.opacity = '1'; menu.style.pointerEvents = 'auto';
        menu.style.transform = 'scale(1) translateY(0)'; shown = true;
    }

    function hide() { if (!menu) return; menu.style.opacity = '0'; menu.style.pointerEvents = 'none'; menu.style.transform = 'scale(.92) translateY(-8px)'; shown = false; }

    function getItems() {
        var p = window.location.pathname.split('/').pop() || 'index.html';
        var items = [];
        var sep = {type:'sep'};

        // ── 页面专属 ──
        if (p === 'index.html' || p === '') {
            items.push({type:'title',label:'首页'});
            items.push({label:'随机探索',icon:'shuffle',action:function(){var a=['blog.html','moments.html','bookmarks.html','acg.html'];location.href=a[Math.floor(Math.random()*a.length)];}});
            items.push(sep);
        } else if (p === 'blog.html') {
            items.push({type:'title',label:'星空笔记'});
            items.push({label:'搜索文章',icon:'search',shortcut:'Ctrl+K',action:function(){var i=document.getElementById('blog-search');if(i){i.focus();i.scrollIntoView({behavior:'smooth'});}}});
            items.push({label:'打开最新',icon:'arrow-right',action:function(){var a=document.querySelector('.article-item');if(a)a.click();}});
            items.push(sep);
        } else if (p === 'moments.html') {
            items.push({type:'title',label:'随手拍'});
            items.push({label:'随机漫游',icon:'shuffle',action:function(){var b=document.getElementById('btn-random');if(b)b.click();}});
            items.push({label:'切换视图',icon:'layout-grid',action:function(){var g=document.getElementById('btn-grid'),t=document.getElementById('btn-timeline');if(g&&t){g.classList.contains('on')?t.click():g.click();}}});
            items.push(sep);
        } else if (p === 'bookmarks.html') {
            items.push({type:'title',label:'书签收藏'});
            items.push({label:'搜索收藏',icon:'search',action:function(){var i=document.getElementById('search-input');if(i){i.focus();i.scrollIntoView({behavior:'smooth'});}}});
            items.push({label:'随机打开',icon:'external-link',action:function(){var a=document.querySelectorAll('.bk-card');if(a.length)a[Math.floor(Math.random()*a.length)].click();}});
            items.push(sep);
        } else if (p === 'rss.html') {
            items.push({type:'title',label:'RSS 订阅'});
            items.push({label:'刷新订阅',icon:'refresh-cw',action:function(){location.reload();}});
            items.push(sep);
        } else if (p === 'acg.html') {
            items.push({type:'title',label:'二次元'});
            items.push({label:'同步番剧',icon:'refresh-cw',action:function(){if(window.syncBangumi)syncBangumi();}});
            items.push(sep);
        } else if (p === 'about.html') {
            items.push({type:'title',label:'关于'});
            items.push({label:'打招呼',icon:'hand',action:function(){var b=document.getElementById('wave-btn');if(b)b.click();}});
            items.push({label:'发邮件',icon:'mail',action:function(){location.href='mailto:contact@shadowsky.com';}});
            items.push(sep);
        } else if (p === 'post.html') {
            items.push({type:'title',label:'文章'});
            items.push({label:'复制链接',icon:'copy',action:function(){navigator.clipboard.writeText(location.href);}});
            items.push(sep);
        }

        // ── 通用 ──
        items.push({label:'刷新页面',icon:'rotate-cw',shortcut:'Ctrl+R',action:function(){location.reload();}});
        items.push({label:'切换主题',icon:'sun-moon',action:function(){if(window.toggleTheme)window.toggleTheme();}});
        items.push({label:'回到顶部',icon:'chevron-up',action:function(){window.scrollTo({top:0,behavior:'smooth'});}});
        items.push({label:'返回首页',icon:'house',shortcut:'Alt+H',action:function(){location.href='index.html';}});

        return items;
    }

    document.addEventListener('contextmenu', function(e) { e.preventDefault(); show(e.clientX, e.clientY, getItems()); });
    document.addEventListener('click', function() { if (shown) hide(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && shown) hide(); });
    document.addEventListener('DOMContentLoaded', function() { create(); if (menu) menu.addEventListener('click', function(e) { e.stopPropagation(); }); });
})();
