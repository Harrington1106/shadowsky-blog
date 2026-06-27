/**
 * Liquid Moments v5 — 摄影画廊
 * 图片即内容。UI 退后。
 */
(function() {
    'use strict';

    /* ═══════ DOM ═══════ */
    var $ = function(s) { return document.querySelector(s); };

    var dom = {};
    function cache() {
        dom.grid = $('#gallery-grid');
        dom.search = $('#search-input');
        dom.tags = $('#tag-filters');
        dom.sCount = $('#stat-count');
        dom.sDays = $('#stat-days');
        dom.sLocs = $('#stat-locs');
        dom.btnGrid = $('#btn-grid');
        dom.btnTL = $('#btn-timeline');
        dom.btnRand = $('#btn-random');
        dom.btt = $('#back-to-top');
        dom.lb = $('#lightbox');
        dom.lbImg = $('#lb-img');
        dom.lbText = $('#lb-text');
        dom.lbDate = $('#lb-date');
        dom.lbLocWrap = $('#lb-loc-wrap');
        dom.lbLoc = $('#lb-loc');
        dom.lbTags = $('#lb-tags');
        dom.lbExif = $('#lb-exif');
        dom.lbClose = $('#lb-close');
        dom.lbShare = $('#lb-share');
        dom.lbPrev = $('#lb-prev');
        dom.lbNext = $('#lb-next');
        dom.lbBg = $('#lb-bg');
    }

    /* ═══════ STATE ═══════ */
    var moments = [];
    var lbIdx = -1;
    var activeTag = null;
    var viewMode = 'grid';
    var searchTimer = 0;

    /* ═══════ UTILS ═══════ */
    function safeDate(s) {
        if (!s) return new Date();
        var d = new Date(s);
        if (!isNaN(d.getTime())) return d;
        d = new Date(s.replace(/-/g, '/'));
        return isNaN(d.getTime()) ? new Date() : d;
    }

    function timeAgo(d) {
        var s = Math.floor((new Date() - d) / 1000);
        var v = s / 31536000; if (v > 1) return ~~v + '年前';
        v = s / 2592000; if (v > 1) return ~~v + '月前';
        v = s / 86400; if (v > 1) return ~~v + '天前';
        v = s / 3600; if (v > 1) return ~~v + '小时前';
        v = s / 60; if (v > 1) return ~~v + '分钟前';
        return '刚刚';
    }

    function cdn(u) {
        if (!u) return u;
        return u.replace('raw.githubusercontent.com', 'cdn.jsdelivr.net/gh')
            .replace('/main/', '@main/').replace('/master/', '@master/');
    }

    function icons() {
        if (window.lucide && lucide.createIcons) {
            try { lucide.createIcons(); } catch(e) {}
        }
    }

    function fmtDate(d, o) {
        return safeDate(d).toLocaleDateString('zh-CN', o);
    }

    /* ═══════ DATA ═══════ */
    function filtered() {
        var q = dom.search ? dom.search.value.toLowerCase().trim() : '';
        return moments.filter(function(m) {
            if (q) {
                var ok = (m.content||'').toLowerCase().indexOf(q) !== -1
                    || (m.location||'').toLowerCase().indexOf(q) !== -1
                    || (m.tags||[]).some(function(t) { return t.toLowerCase().indexOf(q) !== -1; });
                if (!ok) return false;
            }
            if (activeTag && !(m.tags||[]).includes(activeTag)) return false;
            return true;
        });
    }

    /* ═══════ RENDER ═══════ */
    function skeleton() {
        if (!dom.grid) return;
        dom.grid.className = 'gallery-grid';
        dom.grid.innerHTML = Array(8).fill('<div class="skel-card" style="aspect-ratio:' + (3/4 + Math.random()*0.6).toFixed(2) + '"></div>').join('');
    }

    function emptyState() {
        if (!dom.grid) return;
        dom.grid.className = 'gallery-grid';
        dom.grid.innerHTML = '<div class="gallery-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><h3>没有匹配的照片</h3><p>换个关键词试试</p></div>';
    }

    function errorState(msg) {
        if (!dom.grid) return;
        dom.grid.className = 'gallery-grid';
        dom.grid.innerHTML = '<div class="gallery-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><h3>加载失败</h3><p>' + (msg||'请稍后重试') + '</p><button onclick="location.reload()">刷新</button></div>';
    }

    function updateStats(arr) {
        var days = new Set();
        var locs = new Set();
        arr.forEach(function(m) {
            days.add(safeDate(m.date).toDateString());
            if (m.location) locs.add(m.location);
        });
        if (dom.sCount) dom.sCount.textContent = arr.length;
        if (dom.sDays) dom.sDays.textContent = days.size;
        if (dom.sLocs) dom.sLocs.textContent = locs.size;
    }

    function renderTags() {
        if (!dom.tags) return;
        var counts = {};
        moments.forEach(function(m) {
            (m.tags||[]).forEach(function(t) { counts[t] = (counts[t]||0) + 1; });
        });
        var sorted = Object.keys(counts).sort(function(a,b) { return counts[b] - counts[a]; });
        var h = '<span class="g-tag' + (!activeTag ? ' on' : '') + '" data-tag="">全部</span>';
        sorted.forEach(function(t) {
            h += '<span class="g-tag' + (activeTag === t ? ' on' : '') + '" data-tag="' + t + '">' + t + '</span>';
        });
        dom.tags.innerHTML = h;
        Array.prototype.forEach.call(dom.tags.children, function(el) {
            el.addEventListener('click', function() {
                activeTag = this.dataset.tag || null;
                refresh();
            });
        });
    }

    function renderGrid(arr) {
        if (!dom.grid) return;
        dom.grid.className = 'gallery-grid';

        dom.grid.innerHTML = arr.map(function(m, i) {
            var date = fmtDate(m.date, {month:'short',day:'numeric'});
            var hasImg = !!m.image;

            if (hasImg) {
                var ratio = 0.75;
                if (m.imageWidth && m.imageHeight) ratio = m.imageHeight / m.imageWidth;

                return '<div class="photo-card" style="aspect-ratio:' + (1/(ratio||0.75)).toFixed(2) + ';animation-delay:' + (i*0.03) + 's" onclick="Moments.lb(' + i + ')">' +
                    '<img src="' + cdn(m.image) + '" alt="' + (m.content||'') + '" loading="lazy">' +
                    '<div class="photo-overlay">' +
                    (m.content ? '<p>' + m.content + '</p>' : '') +
                    '<div class="photo-meta"><span><i data-lucide="calendar"></i>' + date + '</span>' + (m.location ? '<span><i data-lucide="map-pin"></i>' + m.location + '</span>' : '') + '</div>' +
                    ((m.tags||[]).length ? '<div class="photo-tags">' + m.tags.map(function(t){return '<span class="photo-tag">#'+t+'</span>';}).join('') + '</div>' : '') +
                    '</div></div>';
            }

            return '<div class="photo-card text-only" style="animation-delay:' + (i*0.03) + 's" onclick="Moments.lb(' + i + ')">' +
                '<div class="photo-overlay"><p>' + (m.content||'') + '</p>' +
                '<div class="photo-meta"><span><i data-lucide="calendar"></i>' + date + '</span>' + (m.location ? '<span><i data-lucide="map-pin"></i>' + m.location + '</span>' : '') + '</div>' +
                '</div></div>';
        }).join('');

        icons();
    }

    function renderTimeline(arr) {
        if (!dom.grid) return;
        dom.grid.className = 'timeline-view';

        var lastYM = '';
        dom.grid.innerHTML = arr.map(function(m, i) {
            var d = safeDate(m.date);
            var ym = d.toLocaleDateString('zh-CN', {year:'numeric',month:'long'});
            var day = d.getDate();
            var time = d.toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'});

            var monthH = '';
            if (ym !== lastYM) {
                lastYM = ym;
                monthH = '<div class="tl-month-marker"><div class="tl-month-dot"></div><span class="tl-month-label">'+ym+'</span></div>';
            }

            return '<div class="tl-item" style="animation-delay:' + (i*0.03) + 's">' + monthH +
                '<div class="tl-day-num">' + day + '</div>' +
                (m.image ? '<div class="tl-thumb" onclick="Moments.lb('+i+')"><img src="'+cdn(m.image)+'" alt="" loading="lazy"></div>' : '') +
                '<div class="tl-content"><p>' + (m.content||'') + '</p>' +
                '<div class="tl-foot"><span>' + time + '</span>' +
                (m.location ? '<a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(m.location)+'" target="_blank" onclick="event.stopPropagation()"><i data-lucide="map-pin"></i>'+m.location+'</a>' : '') +
                ((m.tags||[]).length ? '<span>' + m.tags.map(function(t){return '#'+t;}).join(' ') + '</span>' : '') +
                '</div></div></div>';
        }).join('');

        icons();
    }

    function refresh() {
        var arr = filtered();
        updateStats(arr);
        renderTags();
        if (viewMode === 'grid') renderGrid(arr);
        else renderTimeline(arr);
    }

    /* ═══════ LIGHTBOX ═══════ */
    function openLB(idx) {
        lbIdx = idx;
        var m = moments[idx];
        if (!m) return;

        dom.lbImg.src = m.image ? cdn(m.image) : '';
        dom.lbText.textContent = m.content || '';
        dom.lbDate.textContent = fmtDate(m.date, {year:'numeric',month:'long',day:'numeric',weekday:'long'});

        if (m.location) {
            dom.lbLocWrap.style.display = '';
            dom.lbLoc.textContent = m.location;
            dom.lbLocWrap.onclick = function() {
                window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(m.location), '_blank');
            };
        } else {
            dom.lbLocWrap.style.display = 'none';
        }

        if (m.tags && m.tags.length) {
            dom.lbTags.innerHTML = m.tags.map(function(t) { return '<span>#'+t+'</span>'; }).join('');
            dom.lbTags.style.display = '';
        } else {
            dom.lbTags.style.display = 'none';
        }

        if (m.exif) {
            var parts = [];
            if (m.exif.camera) parts.push(m.exif.camera);
            if (m.exif.lens) parts.push(m.exif.lens);
            if (m.exif.iso) parts.push('ISO '+m.exif.iso);
            if (m.exif.aperture) parts.push(m.exif.aperture);
            if (m.exif.shutter) parts.push(m.exif.shutter);
            dom.lbExif.innerHTML = parts.join(' · ');
            dom.lbExif.style.display = '';
        } else {
            dom.lbExif.style.display = 'none';
        }

        // Preload next
        if (idx + 1 < moments.length && moments[idx+1].image) {
            var p = new Image();
            p.src = cdn(moments[idx+1].image);
        }

        dom.lb.classList.add('open');
        document.body.style.overflow = 'hidden';

        // URL
        var u = new URL(window.location);
        u.searchParams.set('id', m.id);
        history.pushState({}, '', u);
    }

    function closeLB() {
        dom.lb.classList.remove('open');
        setTimeout(function() { dom.lbImg.src = ''; }, 300);
        document.body.style.overflow = '';
        var u = new URL(window.location);
        u.searchParams.delete('id');
        history.pushState({}, '', u);
    }

    function nextLB() {
        if (!moments.length) return;
        openLB((lbIdx + 1) % moments.length);
    }

    function prevLB() {
        if (!moments.length) return;
        openLB((lbIdx - 1 + moments.length) % moments.length);
    }

    function shareLB() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href).then(function() {
                var el = dom.lbShare;
                el.innerHTML = '<i data-lucide="check"></i>';
                el.style.color = '#2DD4BF';
                icons();
                setTimeout(function() {
                    el.innerHTML = '<i data-lucide="share-2"></i>';
                    el.style.color = '';
                    icons();
                }, 2000);
            }).catch(function(){});
        }
    }

    /* ═══════ EVENTS ═══════ */
    function bind() {
        if (dom.search) {
            dom.search.addEventListener('input', function() {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(refresh, 250);
            });
        }

        if (dom.btnGrid) dom.btnGrid.addEventListener('click', function() {
            if (viewMode === 'grid') return;
            viewMode = 'grid';
            dom.btnGrid.classList.add('on');
            dom.btnTL.classList.remove('on');
            refresh();
        });

        if (dom.btnTL) dom.btnTL.addEventListener('click', function() {
            if (viewMode === 'timeline') return;
            viewMode = 'timeline';
            dom.btnTL.classList.add('on');
            dom.btnGrid.classList.remove('on');
            refresh();
        });

        if (dom.btnRand) dom.btnRand.addEventListener('click', function() {
            if (!moments.length) return;
            openLB(Math.floor(Math.random() * moments.length));
        });

        // Lightbox
        if (dom.lbClose) dom.lbClose.addEventListener('click', closeLB);
        if (dom.lbBg) dom.lbBg.addEventListener('click', closeLB);
        if (dom.lbShare) dom.lbShare.addEventListener('click', shareLB);
        if (dom.lbPrev) dom.lbPrev.addEventListener('click', function(e) { e.stopPropagation(); prevLB(); });
        if (dom.lbNext) dom.lbNext.addEventListener('click', function(e) { e.stopPropagation(); nextLB(); });

        document.addEventListener('keydown', function(e) {
            if (!dom.lb.classList.contains('open')) return;
            if (e.key === 'Escape') closeLB();
            if (e.key === 'ArrowRight') nextLB();
            if (e.key === 'ArrowLeft') prevLB();
        });

        // Swipe
        var tx = 0;
        if (dom.lbImg) {
            dom.lbImg.addEventListener('touchstart', function(e) { tx = e.changedTouches[0].screenX; }, {passive:true});
            dom.lbImg.addEventListener('touchend', function(e) {
                var d = tx - e.changedTouches[0].screenX;
                if (Math.abs(d) > 50) { if (d > 0) nextLB(); else prevLB(); }
            }, {passive:true});
        }

        // Back to top
        if (dom.btt) {
            window.addEventListener('scroll', function() {
                dom.btt.classList.toggle('visible', window.scrollY > 600);
            });
            dom.btt.addEventListener('click', function() {
                if (window.lenis) lenis.scrollTo(0);
                else window.scrollTo({top:0,behavior:'smooth'});
            });
        }

        // Tag scroll
        if (dom.tags) {
            var down, sx, sl;
            dom.tags.addEventListener('mousedown', function(e) {
                down = true; sx = e.pageX - dom.tags.offsetLeft; sl = dom.tags.scrollLeft;
            });
            dom.tags.addEventListener('mouseleave', function(){down=false;});
            dom.tags.addEventListener('mouseup', function(){down=false;});
            dom.tags.addEventListener('mousemove', function(e) {
                if (!down) return;
                e.preventDefault();
                dom.tags.scrollLeft = sl - (e.pageX - dom.tags.offsetLeft - sx) * 1.5;
            });
        }
    }

    /* ═══════ INIT ═══════ */
    function init() {
        cache();
        bind();
        skeleton();

        fetch('public/data/moments.json?v=' + Date.now())
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
                if (!data || !Array.isArray(data)) {
                    errorState('数据加载失败');
                    return;
                }
                moments = data.sort(function(a,b) { return safeDate(b.date) - safeDate(a.date); });

                // URL params
                var p = new URLSearchParams(window.location.search);
                if (p.get('view') === 'timeline') {
                    viewMode = 'timeline';
                    if (dom.btnTL) dom.btnTL.classList.add('on');
                    if (dom.btnGrid) dom.btnGrid.classList.remove('on');
                }
                if (p.get('tag')) activeTag = p.get('tag');
                if (p.get('q') && dom.search) dom.search.value = p.get('q');

                refresh();
                icons();

                // Clean deep link
                if (window.location.search.indexOf('id=') !== -1) {
                    var u = new URL(window.location);
                    u.searchParams.delete('id');
                    history.replaceState({}, '', u);
                }
            })
            .catch(function() { errorState('网络错误'); });

        // Lenis
        if (typeof Lenis !== 'undefined') {
            var lenis = new Lenis({duration:.5,easing:function(t){return Math.min(1,1.001-Math.pow(2,-6*t));},smooth:true});
            function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
            requestAnimationFrame(raf);
            window.lenis = lenis;
        }
    }

    /* ═══════ PUBLIC ═══════ */
    window.Moments = {
        lb: openLB,
        init: init
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
