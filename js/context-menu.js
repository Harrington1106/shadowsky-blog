/**
 * Context Menu v2 — 全站右键菜单
 * 页面特定功能 + 通用操作
 */
(function() {
    'use strict';

    var menu = null;
    var menuVisible = false;

    function create() {
        if (menu) return;
        menu = document.createElement('div');
        menu.id = 'ctx-menu';
        menu.style.cssText = 'position:fixed;z-index:9999;min-width:180px;padding:6px;border-radius:14px;background:rgba(18,22,30,.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 32px rgba(0,0,0,.4);opacity:0;pointer-events:none;transform:scale(.95);transition:opacity .15s,transform .15s;font-size:.82rem';
        document.body.appendChild(menu);
    }

    function show(x, y, items) {
        create();
        menu.innerHTML = items.map(function(item) {
            if (item.type === 'sep') return '<div style="height:1px;background:rgba(255,255,255,.06);margin:4px 8px"></div>';
            var icon = item.icon ? '<i data-lucide="' + item.icon + '" style="width:15px;height:15px;opacity:.6;flex-shrink:0"></i>' : '';
            var sc = item.shortcut ? '<span style="margin-left:auto;font-size:.65rem;opacity:.3;padding-left:12px">' + item.shortcut + '</span>' : '';
            return '<div class="ctx-item" data-action="' + (item.id||'') + '" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;color:rgba(255,255,255,.7);transition:all .1s" onmouseenter="this.style.background=\'rgba(255,255,255,.06)\';this.style.color=\'#fff\'" onmouseleave="this.style.background=\'transparent\';this.style.color=\'rgba(255,255,255,.7)\'">' + icon + item.label + sc + '</div>';
        }).join('');

        // Bind clicks
        var els = menu.querySelectorAll('.ctx-item');
        els.forEach(function(el, i) {
            el.addEventListener('click', function(e) {
                e.stopPropagation();
                hide();
                var it = items[i];
                if (it.action) it.action();
            });
        });

        // Position
        var mw = menu.offsetWidth || 200;
        var mh = menu.offsetHeight || 300;
        if (x + mw > window.innerWidth) x = window.innerWidth - mw - 8;
        if (y + mh > window.innerHeight) y = window.innerHeight - mh - 8;
        if (x < 4) x = 4;
        if (y < 4) y = 4;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.opacity = '1';
        menu.style.pointerEvents = 'auto';
        menu.style.transform = 'scale(1)';
        menuVisible = true;

        if (window.lucide) lucide.createIcons();
    }

    function hide() {
        if (!menu) return;
        menu.style.opacity = '0';
        menu.style.pointerEvents = 'none';
        menu.style.transform = 'scale(.95)';
        menuVisible = false;
    }

    function getPageItems() {
        var path = window.location.pathname;
        var page = path.split('/').pop() || 'index.html';

        // Common items for all pages
        var common = [
            { label: '刷新页面', icon: 'rotate-cw', shortcut: 'Ctrl+R', action: function() { location.reload(); } },
            { label: '切换主题', icon: 'sun-moon', action: function() { if (window.toggleTheme) window.toggleTheme(); } },
            { label: '回到顶部', icon: 'chevron-up', action: function() { window.scrollTo({top:0,behavior:'smooth'}); } },
            { label: '返回首页', icon: 'house', action: function() { location.href = 'index.html'; } },
        ];

        var specific = [];

        if (page === 'index.html' || page === '') {
            specific = [
                { label: '随机浏览', icon: 'shuffle', action: function() {
                    var pages = ['blog.html','moments.html','bookmarks.html','acg.html'];
                    location.href = pages[Math.floor(Math.random()*pages.length)];
                }},
            ];
        } else if (page === 'blog.html') {
            specific = [
                { label: '搜索文章', icon: 'search', action: function() {
                    var inp = document.getElementById('blog-search');
                    if (inp) { inp.focus(); inp.scrollIntoView({behavior:'smooth'}); }
                }},
                { label: '最新文章', icon: 'file-text', action: function() {
                    var links = document.querySelectorAll('.article-item');
                    if (links.length) links[0].click();
                }},
            ];
        } else if (page === 'moments.html') {
            specific = [
                { label: '随机漫游', icon: 'shuffle', action: function() {
                    var btn = document.getElementById('btn-random');
                    if (btn) btn.click();
                }},
                { label: '切换视图', icon: 'layout-grid', action: function() {
                    var grid = document.getElementById('btn-grid');
                    var tl = document.getElementById('btn-timeline');
                    if (grid && tl) { if (grid.classList.contains('on')) tl.click(); else grid.click(); }
                }},
            ];
        } else if (page === 'bookmarks.html') {
            specific = [
                { label: '搜索收藏', icon: 'search', action: function() {
                    var inp = document.getElementById('search-input');
                    if (inp) { inp.focus(); inp.scrollIntoView({behavior:'smooth'}); }
                }},
                { label: '随机打开', icon: 'external-link', action: function() {
                    var cards = document.querySelectorAll('.bk-card');
                    if (cards.length) cards[Math.floor(Math.random()*cards.length)].click();
                }},
            ];
        } else if (page === 'about.html') {
            specific = [
                { label: '打招呼', icon: 'hand', action: function() {
                    var btn = document.getElementById('wave-btn');
                    if (btn) btn.click();
                }},
                { label: '发邮件', icon: 'mail', action: function() {
                    location.href = 'mailto:contact@shadowsky.com';
                }},
            ];
        }

        if (specific.length) {
            return specific.concat([{type:'sep'}]).concat(common);
        }
        return common;
    }

    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        show(e.clientX, e.clientY, getPageItems());
    });

    document.addEventListener('click', function() {
        if (menuVisible) hide();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && menuVisible) hide();
    });

    // Prevent menu itself from triggering hide
    document.addEventListener('DOMContentLoaded', function() {
        create();
        if (menu) {
            menu.addEventListener('click', function(e) { e.stopPropagation(); });
        }
    });

})();
