/**
 * Liquid Bookmarks v5 — 收藏资源库
 * 设计语言与 moments v5 统一
 */
(function() {
    'use strict';

    /* ═══════ DOM ═══════ */
    var $ = function(s) { return document.querySelector(s); };
    var dom = {};

    function cache() {
        dom.grid = $('#bk-grid');
        dom.search = $('#search-input');
        dom.cats = $('#cat-filters');
        dom.sTotal = $('#stat-total');
        dom.sCats = $('#stat-cats');
        dom.btt = $('#back-to-top');
    }

    /* ═══════ STATE ═══════ */
    var bookmarks = [];
    var categories = {};
    var activeCat = null;
    var searchTimer = 0;

    /* ═══════ ENGLISH → CHINESE MAPPING ═══════ */
    function catName(key) {
        var c = categories[key];
        if (c && c.name) return c.name;
        // Hardcoded fallbacks for known keys
        var fallbacks = {
            'dev_tech': '开发与技术',
            'ai_tools': 'AI与工具类',
            'resources': '资源下载与搜索',
            'life_tools': '生活实用工具',
            'my_favorites': '我的收藏',
            'entertainment': '休闲娱乐',
            'literature_reading': '文献与阅读',
            'education': '学习与教育',
            'blogs_tutorials': '博客与教程',
            'system_resources': '系统与资源',
            'video_editing': '视频与剪辑',
            'personal': '个人',
            'others': '其他'
        };
        return fallbacks[key] || key;
    }

    function subName(key, parentCat) {
        var c = categories[parentCat];
        if (c && c.children) {
            for (var i = 0; i < c.children.length; i++) {
                if (c.children[i].id === key) return c.children[i].name;
            }
        }
        return key;
    }

    /* ═══════ UTILS ═══════ */
    function icons() {
        if (window.lucide && lucide.createIcons) {
            try { lucide.createIcons(); } catch(e) {}
        }
    }

    function domain(url) {
        try { return new URL(url).hostname.replace('www.', ''); }
        catch(e) { return url; }
    }

    function favicon(url) {
        try {
            var host = new URL(url).hostname;
            return 'https://www.google.com/s2/favicons?domain=' + host + '&sz=32';
        } catch(e) { return ''; }
    }

    /* ═══════ DATA ═══════ */
    function filtered() {
        var q = dom.search ? dom.search.value.toLowerCase().trim() : '';
        return bookmarks.filter(function(b) {
            if (activeCat && b.category !== activeCat) return false;
            if (q) {
                var title = (b.title || '').toLowerCase();
                var desc = (b.description || '').toLowerCase();
                var url = (b.url || '').toLowerCase();
                var cat = catName(b.category).toLowerCase();
                var sub = subName(b.subcategory, b.category).toLowerCase();
                var txt = title + ' ' + desc + ' ' + url + ' ' + cat + ' ' + sub;
                if (txt.indexOf(q) === -1) return false;
            }
            return true;
        });
    }

    function groupByCategory(arr) {
        var groups = {};
        arr.forEach(function(b) {
            var key = b.category || 'others';
            if (!groups[key]) groups[key] = { bookmarks: [], subcategories: {} };
            groups[key].bookmarks.push(b);
            var sub = b.subcategory || '_none';
            if (!groups[key].subcategories[sub]) groups[key].subcategories[sub] = [];
            groups[key].subcategories[sub].push(b);
        });

        // Sort by category order
        var entries = Object.entries(groups);
        entries.sort(function(a, b) {
            var oa = (categories[a[0]] && categories[a[0]].order) || 99;
            var ob = (categories[b[0]] && categories[b[0]].order) || 99;
            return oa - ob;
        });

        return entries;
    }

    /* ═══════ RENDER ═══════ */
    function skeleton() {
        if (!dom.grid) return;
        dom.grid.className = 'bk-grid';
        var h = '';
        for (var i = 0; i < 8; i++) {
            h += '<div class="bk-skel"><div class="bk-skel-line"></div><div class="bk-skel-line" style="width:70%"></div><div class="bk-skel-line" style="width:40%"></div></div>';
        }
        dom.grid.innerHTML = h;
    }

    function emptyState() {
        if (!dom.grid) return;
        dom.grid.innerHTML = '<div class="bk-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><h3>没有匹配的收藏</h3><p>换个关键词试试</p></div>';
    }

    function errorState(msg) {
        if (!dom.grid) return;
        dom.grid.innerHTML = '<div class="bk-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><h3>加载失败</h3><p>' + (msg||'请稍后重试') + '</p><button onclick="location.reload()">刷新</button></div>';
    }

    function renderStats(arr) {
        var cats = {};
        arr.forEach(function(b) { cats[b.category||'others'] = true; });
        if (dom.sTotal) dom.sTotal.textContent = arr.length;
        if (dom.sCats) dom.sCats.textContent = Object.keys(cats).length;
    }

    function renderCatNav(arr) {
        if (!dom.cats) return;
        var counts = {};
        arr.forEach(function(b) { var k = b.category||'others'; counts[k] = (counts[k]||0) + 1; });

        var sorted = Object.entries(counts).sort(function(a, b) {
            var oa = (categories[a[0]] && categories[a[0]].order) || 99;
            var ob = (categories[b[0]] && categories[b[0]].order) || 99;
            return oa - ob;
        });

        var h = '<span class="bk-cat-pill' + (!activeCat ? ' on' : '') + '" data-cat="">全部 <span style="opacity:.5">' + arr.length + '</span></span>';
        sorted.forEach(function(e) {
            h += '<span class="bk-cat-pill' + (activeCat === e[0] ? ' on' : '') + '" data-cat="' + e[0] + '">' + catName(e[0]) + ' <span style="opacity:.5">' + e[1] + '</span></span>';
        });
        dom.cats.innerHTML = h;

        Array.prototype.forEach.call(dom.cats.children, function(el) {
            el.addEventListener('click', function() {
                activeCat = this.dataset.cat || null;
                refresh();
            });
        });
    }

    function renderGrid(arr) {
        if (!dom.grid) return;
        dom.grid.className = 'bk-grid';
        if (arr.length === 0) { emptyState(); return; }

        var groups = groupByCategory(arr);
        var html = '';
        var idx = 0;

        groups.forEach(function(g) {
            var catKey = g[0];
            var data = g[1];

            // Category heading
            html += '<div class="bk-cat-head"><div class="bk-cat-accent"></div><h2>' + catName(catKey) + '</h2><span class="bk-cat-count">' + data.bookmarks.length + '个</span></div>';

            // Subcategory groups
            var subKeys = Object.keys(data.subcategories);

            // Sort subcategories: named ones first alphabetically, then _none last
            subKeys.sort(function(a, b) {
                if (a === '_none') return 1;
                if (b === '_none') return -1;
                return a.localeCompare(b);
            });

            subKeys.forEach(function(subKey) {
                if (subKey !== '_none') {
                    html += '<div class="bk-sub-head">' + subName(subKey, catKey) + '</div>';
                }

                data.subcategories[subKey].forEach(function(b) {
                    var tagsHtml = (b.tags && b.tags.length)
                        ? '<div class="bk-tags">' + b.tags.map(function(t) { return '<span class="bk-tag">#' + t + '</span>'; }).join('') + '</div>'
                        : '';

                    html += '<div class="bk-card" style="animation-delay:' + (idx * 0.02) + 's" onclick="window.open(\'' + b.url.replace(/'/g, "\\'") + '\',\'_blank\')">' +
                        '<div class="bk-card-top">' +
                        '<div class="bk-favicon"><img src="' + favicon(b.url) + '" alt="" loading="lazy" onerror="this.parentElement.innerHTML=\'<svg viewBox=\\\'0 0 24 24\\\' fill=\\\'none\\\' stroke=\\\'currentColor\\\' stroke-width=\\\'1.5\\\'><rect x=\\\'3\\\' y=\\\'3\\\' width=\\\'18\\\' height=\\\'18\\\' rx=\\\'3\\\'/><line x1=\\\'9\\\' y1=\\\'9\\\' x2=\\\'15\\\' y2=\\\'15\\\'/><line x1=\\\'15\\\' y1=\\\'9\\\' x2=\\\'9\\\' y2=\\\'15\\\'/></svg>\'"></div>' +
                        '<span class="bk-domain">' + domain(b.url) + '</span>' +
                        '<div class="bk-card-acts" onclick="event.stopPropagation()">' +
                        '<button class="bk-card-act" title="复制链接" onclick="navigator.clipboard.writeText(\'' + b.url.replace(/'/g, "\\'") + '\')"><i data-lucide="copy"></i></button>' +
                        '<button class="bk-card-act" title="打开" onclick="window.open(\'' + b.url.replace(/'/g, "\\'") + '\',\'_blank\')"><i data-lucide="external-link"></i></button>' +
                        '</div></div>' +
                        '<h3 class="bk-title">' + (b.title || domain(b.url)) + '</h3>' +
                        (b.description ? '<p class="bk-desc">' + b.description + '</p>' : '') +
                        tagsHtml +
                        '</div>';
                    idx++;
                });
            });
        });

        dom.grid.innerHTML = html;
        icons();
    }

    function refresh() {
        var arr = filtered();
        renderStats(bookmarks);
        renderCatNav(bookmarks);
        renderGrid(arr);
    }

    /* ═══════ EVENTS ═══════ */
    function bind() {
        if (dom.search) {
            dom.search.addEventListener('input', function() {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(refresh, 200);
            });
        }

        if (dom.cats) {
            var down, sx, sl;
            dom.cats.addEventListener('mousedown', function(e) {
                down = true; sx = e.pageX - dom.cats.offsetLeft; sl = dom.cats.scrollLeft;
            });
            dom.cats.addEventListener('mouseleave', function(){down=false;});
            dom.cats.addEventListener('mouseup', function(){down=false;});
            dom.cats.addEventListener('mousemove', function(e) {
                if (!down) return; e.preventDefault();
                dom.cats.scrollLeft = sl - (e.pageX - dom.cats.offsetLeft - sx) * 1.5;
            });
        }

        if (dom.btt) {
            window.addEventListener('scroll', function() {
                dom.btt.classList.toggle('visible', window.scrollY > 600);
            });
            dom.btt.addEventListener('click', function() {
                if (window.lenis) lenis.scrollTo(0);
                else window.scrollTo({top:0,behavior:'smooth'});
            });
        }
    }

    /* ═══════ INIT ═══════ */
    function init() {
        cache();
        bind();
        skeleton();

        // Load categories first, then bookmarks
        var catPromise = fetch('public/data/categories.json?v=' + Date.now())
            .then(function(r) { return r.ok ? r.json() : {}; })
            .catch(function() { return {}; });

        var bmPromise = fetch('public/data/bookmarks.json?v=' + Date.now())
            .then(function(r) { return r.ok ? r.json() : null; })
            .catch(function() { return null; });

        Promise.all([catPromise, bmPromise]).then(function(results) {
            categories = results[0] || {};
            var data = results[1];

            if (!data || !Array.isArray(data)) {
                errorState('数据加载失败');
                return;
            }

            bookmarks = data.sort(function(a, b) {
                var ca = catName(a.category);
                var cb = catName(b.category);
                if (ca !== cb) return ca.localeCompare(cb);
                return (a.title||'').localeCompare(b.title||'');
            });

            refresh();
            icons();
        }).catch(function() {
            errorState('网络错误');
        });

        // Lenis
        if (typeof Lenis !== 'undefined') {
            var lenis = new Lenis({duration:.5,easing:function(t){return Math.min(1,1.001-Math.pow(2,-6*t));},smooth:true});
            function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
            requestAnimationFrame(raf);
            window.lenis = lenis;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
