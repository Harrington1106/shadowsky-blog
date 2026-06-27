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

    function itemHTML(it) {
        if (it.type === 'sep') return '<div style="height:1px;background:rgba(255,255,255,.07);margin:5px 10px"></div>';
        if (it.type === 'title') return '<div style="padding:6px 10px 4px;font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.25)">' + it.label + '</div>';
        var icon = it.icon ? '<i data-lucide="' + it.icon + '" style="width:16px;height:16px;opacity:.5;flex-shrink:0"></i>' : '<span style="width:16px;flex-shrink:0"></span>';
        var sc = it.shortcut ? '<span style="margin-left:auto;font-size:.65rem;opacity:.25;padding-left:16px">' + it.shortcut + '</span>' : '';
        return '<div class="ctx-item" style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;color:rgba(255,255,255,.65);transition:all .12s;margin:1px 0" onmouseenter="this.style.background=\'rgba(255,255,255,.06)\';this.style.color=\'#fff\'" onmouseleave="this.style.background=\'transparent\';this.style.color=\'rgba(255,255,255,.65)\'">' + icon + '<span>' + it.label + '</span>' + sc + '</div>';
    }

    function show(x, y, items) {
        create();
        menu.innerHTML = items.map(itemHTML).join('');
        if (window.lucide) lucide.createIcons();

        var els = menu.querySelectorAll('.ctx-item');
        els.forEach(function(el, i) { el.addEventListener('click', function(e) { e.stopPropagation(); hide(); var it = items[i]; if (it && it.action) it.action(); }); });

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
