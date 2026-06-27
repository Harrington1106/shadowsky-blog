/**
 * Liquid Moments v4 — Professional Photography Gallery
 * 模块化 IIFE 架构，与全站 unified.css 设计系统集成
 * 数据源: public/data/moments.json (admin 后台共享)
 */
const MomentsApp = (function() {
    'use strict';

    /* ═══════════════════════════════════════════════
       STATE
       ═══════════════════════════════════════════════ */
    let allMoments = [];
    let currentLightboxIndex = -1;
    let activeTag = null;
    let currentView = 'grid';
    let currentHeatmapYear = new Date().getFullYear();
    let heatmapInstance = null;
    let searchDebounceTimer = null;

    /* ═══════════════════════════════════════════════
       DOM REFS (lazy — grabbed on init)
       ═══════════════════════════════════════════════ */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    let dom = {};

    function cacheDom() {
        dom.gallery = $('#moments-grid');
        dom.searchInput = $('#search-input');
        dom.tagFilters = $('#tag-filters');
        dom.statsCount = $('#stat-count');
        dom.statsDays = $('#stat-days');
        dom.statsLocations = $('#stat-locations');
        dom.statsLatest = $('#stat-latest');
        dom.lightbox = $('#lightbox');
        dom.lightboxImg = $('#lightbox-img');
        dom.lightboxContent = $('#lightbox-content');
        dom.lightboxDate = $('#lightbox-date');
        dom.lightboxLocation = $('#lightbox-location');
        dom.lightboxLocationWrap = $('#lightbox-location-wrap');
        dom.lightboxTags = $('#lightbox-tags');
        dom.lightboxInfoCard = $('#lightbox-info-card');
        dom.lightboxExif = $('#lightbox-exif');
        dom.exifCamera = $('#exif-camera');
        dom.exifLens = $('#exif-lens');
        dom.exifIso = $('#exif-iso');
        dom.exifAperture = $('#exif-aperture');
        dom.exifShutter = $('#exif-shutter');
        dom.btnGrid = $('#view-grid');
        dom.btnTimeline = $('#view-timeline');
        dom.btnRandom = $('#btn-random');
        dom.btt = $('#back-to-top');
        dom.activityContainer = $('#activity-container');
        dom.heatmapContainer = $('#heatmap-container');
        dom.heatmapYears = $('#heatmap-years');
        dom.lbClose = $('#lightbox-close');
        dom.lbShare = $('#lightbox-share');
        dom.lbPrev = $('#lightbox-prev');
        dom.lbNext = $('#lightbox-next');
    }

    /* ═══════════════════════════════════════════════
       UTILITIES
       ═══════════════════════════════════════════════ */

    /** Safari 兼容日期解析 */
    function safeDate(dateStr) {
        if (!dateStr) return new Date();
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
        d = new Date(dateStr.replace(/-/g, '/'));
        return isNaN(d.getTime()) ? new Date() : d;
    }

    /** 中文相对时间 */
    function timeSince(date) {
        var seconds = Math.floor((new Date() - date) / 1000);
        var interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' 年前';
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' 个月前';
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' 天前';
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' 小时前';
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' 分钟前';
        return '刚刚';
    }

    /** GitHub raw → jsDelivr CDN 优化 */
    function optimizeImage(url) {
        if (!url) return url;
        if (url.includes('raw.githubusercontent.com')) {
            return url.replace('raw.githubusercontent.com', 'cdn.jsdelivr.net/gh')
                .replace('/main/', '@main/')
                .replace('/master/', '@master/');
        }
        return url;
    }

    /** 防抖 */
    function debounce(fn, ms) {
        return function() {
            var ctx = this, args = arguments;
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(function() { fn.apply(ctx, args); }, ms);
        };
    }

    /** 安全的 Lucide 图标刷新 */
    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try { window.lucide.createIcons(); } catch (e) { /* ignore */ }
        }
    }

    /** 数字滚动动画 */
    function animateValue(el, start, end, duration) {
        var startTime = null;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            el.textContent = Math.floor(progress * (end - start) + start);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /** 格式化日期 */
    function formatDate(dateStr, options) {
        return safeDate(dateStr).toLocaleDateString('zh-CN', options);
    }

    /* ═══════════════════════════════════════════════
       DATA LAYER
       ═══════════════════════════════════════════════ */

    async function fetchMoments() {
        try {
            var resp = await fetch('public/data/moments.json?v=' + Date.now());
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            var data = await resp.json();
            if (!Array.isArray(data)) data = [];
            // 按日期倒序
            data.sort(function(a, b) { return safeDate(b.date) - safeDate(a.date); });
            return data;
        } catch (e) {
            console.error('Failed to fetch moments:', e);
            return null;
        }
    }

    function getFilteredMoments() {
        var searchTerm = dom.searchInput ? dom.searchInput.value.toLowerCase().trim() : '';
        return allMoments.filter(function(m) {
            var matchSearch = !searchTerm ||
                (m.content && m.content.toLowerCase().indexOf(searchTerm) !== -1) ||
                (m.tags && m.tags.some(function(t) { return t.toLowerCase().indexOf(searchTerm) !== -1; })) ||
                (m.location && m.location.toLowerCase().indexOf(searchTerm) !== -1);

            var matchTag = !activeTag || (m.tags && m.tags.indexOf(activeTag) !== -1);

            return matchSearch && matchTag;
        });
    }

    function getStats(moments) {
        var uniqueDays = new Set();
        var uniqueLocations = new Set();
        moments.forEach(function(m) {
            uniqueDays.add(safeDate(m.date).toDateString());
            if (m.location) uniqueLocations.add(m.location);
        });
        return {
            count: moments.length,
            days: uniqueDays.size,
            locations: uniqueLocations.size,
            latest: moments.length > 0 ? timeSince(safeDate(moments[0].date)) : '--'
        };
    }

    function getTagCounts(moments) {
        var counts = {};
        moments.forEach(function(m) {
            if (m.tags) {
                m.tags.forEach(function(t) {
                    counts[t] = (counts[t] || 0) + 1;
                });
            }
        });
        return counts;
    }

    /* ═══════════════════════════════════════════════
       UI RENDERING
       ═══════════════════════════════════════════════ */

    function renderSkeleton() {
        if (!dom.gallery) return;
        dom.gallery.className = 'mm-gallery';
        dom.gallery.innerHTML = Array(6).fill(0).map(function() {
            return '<div class="mm-skeleton-card">' +
                '<div class="mm-skeleton-img"></div>' +
                '<div class="mm-skeleton-body">' +
                '<div class="mm-skeleton-line mm-skeleton-line--medium"></div>' +
                '<div class="mm-skeleton-line mm-skeleton-line--short"></div>' +
                '</div></div>';
        }).join('');
    }

    function renderEmpty() {
        if (!dom.gallery) return;
        dom.gallery.className = 'mm-gallery';
        dom.gallery.innerHTML =
            '<div class="mm-empty">' +
            '<div class="mm-empty-icon"><i data-lucide="camera-off"></i></div>' +
            '<h3>暂无瞬间</h3>' +
            '<p>没有找到匹配的记录，换个关键词试试？</p>' +
            '</div>';
        refreshIcons();
    }

    function renderError(msg) {
        if (!dom.gallery) return;
        dom.gallery.className = 'mm-gallery';
        dom.gallery.innerHTML =
            '<div class="mm-empty">' +
            '<div class="mm-empty-icon"><i data-lucide="alert-circle"></i></div>' +
            '<h3>加载失败</h3>' +
            '<p>' + (msg || '数据加载出错，请稍后重试') + '</p>' +
            '<button class="mm-error-btn" onclick="location.reload()">刷新页面</button>' +
            '</div>';
        refreshIcons();
    }

    function renderStats(stats) {
        if (dom.statsCount) animateValue(dom.statsCount, 0, stats.count, 800);
        if (dom.statsDays) animateValue(dom.statsDays, 0, stats.days, 800);
        if (dom.statsLocations) animateValue(dom.statsLocations, 0, stats.locations, 800);
        if (dom.statsLatest) dom.statsLatest.textContent = stats.latest;
    }

    function renderTags(tagCounts, totalCount) {
        if (!dom.tagFilters) return;
        var sorted = Object.keys(tagCounts).sort(function(a, b) { return tagCounts[b] - tagCounts[a]; });

        var html = '<button class="mm-tag-chip' + (!activeTag ? ' active' : '') + '" data-tag="">全部 <span>(' + totalCount + ')</span></button>';

        sorted.forEach(function(tag) {
            html += '<button class="mm-tag-chip' + (activeTag === tag ? ' active' : '') + '" data-tag="' + tag + '">#' + tag + ' <span>(' + tagCounts[tag] + ')</span></button>';
        });

        dom.tagFilters.innerHTML = html;

        // 绑定点击事件
        Array.prototype.forEach.call(dom.tagFilters.querySelectorAll('.mm-tag-chip'), function(btn) {
            btn.addEventListener('click', function() {
                var tag = this.getAttribute('data-tag');
                activeTag = tag || null;
                refresh();
            });
        });
    }

    function renderGrid(moments) {
        if (!dom.gallery) return;
        dom.gallery.className = 'mm-gallery';

        dom.gallery.innerHTML = moments.map(function(m, i) {
            var date = formatDate(m.date, { month: 'short', day: 'numeric' });
            var hasImage = !!m.image;
            var imgSrc = optimizeImage(m.image || '');
            var tagsHtml = (m.tags || []).map(function(t) {
                return '<span class="mm-card-tag">#' + t + '</span>';
            }).join('');

            // 每 6 张中有一张跨两行（仅当有图片时）
            var spanClass = (hasImage && i % 6 === 0) ? ' mm-card-span' : '';

            if (hasImage) {
                return '<div class="mm-card' + spanClass + '" style="animation-delay:' + (i * 0.04) + 's" onclick="MomentsApp.openLightbox(\'' + m.id + '\')">' +
                    '<img src="' + imgSrc + '" alt="' + (m.content || '') + '" loading="lazy">' +
                    '<div class="mm-card-overlay">' +
                    (m.content ? '<p>' + m.content + '</p>' : '') +
                    '<div class="mm-card-meta">' +
                    '<span><i data-lucide="calendar"></i>' + date + '</span>' +
                    (m.location ? '<span><i data-lucide="map-pin"></i>' + m.location + '</span>' : '') +
                    '</div>' +
                    (tagsHtml ? '<div class="mm-card-tags">' + tagsHtml + '</div>' : '') +
                    '</div></div>';
            }

            // 无图片文字卡
            return '<div class="mm-card mm-card--text" style="animation-delay:' + (i * 0.04) + 's" onclick="MomentsApp.openLightbox(\'' + m.id + '\')">' +
                '<div class="mm-card-overlay">' +
                (m.content ? '<p>' + m.content + '</p>' : '<p style="opacity:.5">无内容</p>') +
                '<div class="mm-card-meta">' +
                '<span><i data-lucide="calendar"></i>' + date + '</span>' +
                (m.location ? '<span><i data-lucide="map-pin"></i>' + m.location + '</span>' : '') +
                '</div>' +
                (tagsHtml ? '<div class="mm-card-tags">' + tagsHtml + '</div>' : '') +
                '</div></div>';
        }).join('');

        refreshIcons();
    }

    function renderTimeline(moments) {
        if (!dom.gallery) return;
        dom.gallery.className = 'mm-timeline';

        var lastYearMonth = '';

        dom.gallery.innerHTML = moments.map(function(m, i) {
            var dateObj = safeDate(m.date);
            var yearMonth = dateObj.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
            var day = dateObj.getDate();
            var timeStr = dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            var imgSrc = optimizeImage(m.image || '');
            var tagsHtml = (m.tags || []).map(function(t) { return '#' + t; }).join(' ');

            var monthHtml = '';
            if (yearMonth !== lastYearMonth) {
                lastYearMonth = yearMonth;
                monthHtml = '<div class="mm-tl-month"><div class="mm-tl-month-dot"></div><span class="mm-tl-month-label">' + yearMonth + '</span></div>';
            }

            return '<div class="mm-tl-item" style="animation-delay:' + (i * 0.03) + 's">' +
                monthHtml +
                '<div class="mm-tl-card">' +
                '<div class="mm-tl-day">' + day + '</div>' +
                (m.image ? '<div class="mm-tl-thumb" onclick="MomentsApp.openLightbox(\'' + m.id + '\')"><img src="' + imgSrc + '" alt="" loading="lazy"></div>' : '') +
                '<div class="mm-tl-body">' +
                '<p>' + (m.content || '') + '</p>' +
                '<div class="mm-tl-foot">' +
                '<span class="mm-tl-time">' + timeStr + '</span>' +
                (m.location ? '<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(m.location) + '" target="_blank" class="mm-tl-loc" onclick="event.stopPropagation()"><i data-lucide="map-pin"></i>' + m.location + '</a>' : '') +
                (m.tags && m.tags.length ? '<span class="mm-tl-tags">' + tagsHtml + '</span>' : '') +
                '</div></div></div></div>';
        }).join('');

        refreshIcons();
    }

    function renderGallery(moments) {
        if (moments.length === 0) {
            renderEmpty();
            return;
        }
        if (currentView === 'grid') {
            renderGrid(moments);
        } else {
            renderTimeline(moments);
        }
    }

    /* ═══════════════════════════════════════════════
       CHARTS
       ═══════════════════════════════════════════════ */

    function renderActivityChart(moments) {
        if (!dom.activityContainer || !window.ActivityChart) return;
        var chart = new window.ActivityChart(dom.activityContainer, { height: 48 });
        chart.render(moments);
    }

    function renderHeatmap(moments, yearOverride) {
        if (!dom.heatmapContainer || !window.HeatmapChart) return;
        var year = typeof yearOverride !== 'undefined' ? yearOverride : currentHeatmapYear;

        if (!heatmapInstance) {
            heatmapInstance = new window.HeatmapChart(dom.heatmapContainer, {
                year: year,
                onClick: null,
                tooltipFn: null
            });
        }

        if (typeof heatmapInstance.render === 'function') {
            heatmapInstance.render(moments, year);
        }
    }

    function renderHeatmapControls(moments) {
        if (!dom.heatmapYears) return;
        var yearsSet = new Set();
        moments.forEach(function(m) { yearsSet.add(safeDate(m.date).getFullYear()); });
        yearsSet.add(new Date().getFullYear());

        var years = Array.from(yearsSet).sort(function(a, b) { return b - a; });
        dom.heatmapYears.innerHTML = years.map(function(y) {
            return '<button class="' + (y === currentHeatmapYear ? 'active' : '') + '" data-year="' + y + '">' + y + '</button>';
        }).join('');

        Array.prototype.forEach.call(dom.heatmapYears.querySelectorAll('button'), function(btn) {
            btn.addEventListener('click', function() {
                currentHeatmapYear = parseInt(this.getAttribute('data-year'));
                renderHeatmap(allMoments, currentHeatmapYear);
                renderHeatmapControls(allMoments);
            });
        });
    }

    /* ═══════════════════════════════════════════════
       LIGHTBOX
       ═══════════════════════════════════════════════ */

    function openLightbox(id) {
        var index = -1;
        for (var i = 0; i < allMoments.length; i++) {
            if (String(allMoments[i].id) === String(id)) { index = i; break; }
        }
        if (index === -1) return;
        openLightboxByIndex(index);
    }

    function openLightboxByIndex(index) {
        currentLightboxIndex = index;
        var m = allMoments[index];
        if (!m) return;

        // 图片
        dom.lightboxImg.src = m.image ? optimizeImage(m.image) : '';

        // 内容
        dom.lightboxContent.textContent = m.content || '';
        dom.lightboxDate.textContent = formatDate(m.date, {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });

        // 地点
        if (m.location) {
            dom.lightboxLocation.textContent = m.location;
            dom.lightboxLocationWrap.classList.remove('mm-hidden');
            dom.lightboxLocationWrap.onclick = function() {
                window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(m.location), '_blank');
            };
            dom.lightboxLocationWrap.title = '在地图中查看';
        } else {
            dom.lightboxLocationWrap.classList.add('mm-hidden');
        }

        // 标签
        if (m.tags && m.tags.length > 0) {
            dom.lightboxTags.innerHTML = m.tags.map(function(t) {
                return '<span>#' + t + '</span>';
            }).join('');
            dom.lightboxTags.classList.remove('mm-hidden');
        } else {
            dom.lightboxTags.classList.add('mm-hidden');
        }

        // EXIF
        if (m.exif && (m.exif.camera || m.exif.lens || m.exif.iso || m.exif.aperture || m.exif.shutter)) {
            dom.exifCamera.textContent = m.exif.camera || '--';
            dom.exifLens.textContent = m.exif.lens || '--';
            dom.exifIso.textContent = m.exif.iso ? 'ISO ' + m.exif.iso : '--';
            dom.exifAperture.textContent = m.exif.aperture || '--';
            dom.exifShutter.textContent = m.exif.shutter || '--';
            dom.lightboxExif.classList.remove('mm-hidden');
        } else {
            dom.lightboxExif.classList.add('mm-hidden');
        }

        // URL 更新
        var url = new URL(window.location);
        url.searchParams.set('id', m.id);
        window.history.pushState({}, '', url);

        // 预加载下一张
        if (index + 1 < allMoments.length && allMoments[index + 1].image) {
            var preload = new Image();
            preload.src = optimizeImage(allMoments[index + 1].image);
        }

        // 显示
        dom.lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        dom.lightbox.classList.remove('open');
        setTimeout(function() {
            dom.lightboxImg.src = '';
        }, 300);
        document.body.style.overflow = '';

        var url = new URL(window.location);
        url.searchParams.delete('id');
        window.history.pushState({}, '', url);
    }

    function nextImage() {
        if (allMoments.length === 0) return;
        var next = (currentLightboxIndex + 1) % allMoments.length;
        openLightboxByIndex(next);
    }

    function prevImage() {
        if (allMoments.length === 0) return;
        var prev = (currentLightboxIndex - 1 + allMoments.length) % allMoments.length;
        openLightboxByIndex(prev);
    }

    function shareLightbox() {
        var url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                var btn = dom.lbShare;
                var orig = btn.innerHTML;
                btn.innerHTML = '<i data-lucide="check"></i>';
                btn.style.color = '#2DD4BF';
                refreshIcons();
                setTimeout(function() {
                    btn.innerHTML = orig;
                    btn.style.color = '';
                    refreshIcons();
                }, 2000);
            }).catch(function() { /* ignore */ });
        }
    }

    function isLightboxOpen() {
        return dom.lightbox && dom.lightbox.classList.contains('open');
    }

    /* ═══════════════════════════════════════════════
       VIEW MANAGEMENT
       ═══════════════════════════════════════════════ */

    function switchView(view) {
        if (currentView === view) return;
        currentView = view;

        if (dom.btnGrid) dom.btnGrid.classList.toggle('active', view === 'grid');
        if (dom.btnTimeline) dom.btnTimeline.classList.toggle('active', view === 'timeline');

        var url = new URL(window.location);
        url.searchParams.set('view', view);
        window.history.replaceState({}, '', url);

        refresh();
    }

    /* ═══════════════════════════════════════════════
       REFRESH (main render pipeline)
       ═══════════════════════════════════════════════ */

    function refresh() {
        var filtered = getFilteredMoments();
        var stats = getStats(filtered);
        var tagCounts = getTagCounts(allMoments);

        renderStats(stats);
        renderTags(tagCounts, allMoments.length);
        renderGallery(filtered);
        renderActivityChart(filtered);
        renderHeatmap(filtered);
    }

    /* ═══════════════════════════════════════════════
       EVENT BINDING
       ═══════════════════════════════════════════════ */

    function bindToolbar() {
        // 搜索 (防抖)
        if (dom.searchInput) {
            dom.searchInput.addEventListener('input', debounce(function() {
                refresh();
            }, 300));
        }

        // 视图切换
        if (dom.btnGrid) {
            dom.btnGrid.addEventListener('click', function() { switchView('grid'); });
        }
        if (dom.btnTimeline) {
            dom.btnTimeline.addEventListener('click', function() { switchView('timeline'); });
        }

        // 随机漫游
        if (dom.btnRandom) {
            dom.btnRandom.addEventListener('click', function() {
                if (allMoments.length === 0) return;
                var idx = Math.floor(Math.random() * allMoments.length);
                openLightboxByIndex(idx);
            });
        }

        // 标签拖动滚动
        if (dom.tagFilters) {
            var isDown = false, startX, scrollLeft;
            dom.tagFilters.addEventListener('mousedown', function(e) {
                isDown = true;
                startX = e.pageX - dom.tagFilters.offsetLeft;
                scrollLeft = dom.tagFilters.scrollLeft;
            });
            dom.tagFilters.addEventListener('mouseleave', function() { isDown = false; });
            dom.tagFilters.addEventListener('mouseup', function() { isDown = false; });
            dom.tagFilters.addEventListener('mousemove', function(e) {
                if (!isDown) return;
                e.preventDefault();
                dom.tagFilters.scrollLeft = scrollLeft - (e.pageX - dom.tagFilters.offsetLeft - startX) * 1.5;
            });
        }
    }

    function bindLightbox() {
        if (dom.lbClose) dom.lbClose.addEventListener('click', closeLightbox);
        if (dom.lbShare) dom.lbShare.addEventListener('click', shareLightbox);
        if (dom.lbPrev) dom.lbPrev.addEventListener('click', function(e) { e.stopPropagation(); prevImage(); });
        if (dom.lbNext) dom.lbNext.addEventListener('click', function(e) { e.stopPropagation(); nextImage(); });

        // 点击背景关闭
        if (dom.lightbox) {
            dom.lightbox.addEventListener('click', function(e) {
                if (e.target === dom.lightbox) closeLightbox();
            });
        }

        // 键盘导航
        document.addEventListener('keydown', function(e) {
            if (!isLightboxOpen()) return;
            if (e.key === 'Escape') { closeLightbox(); return; }
            if (e.key === 'ArrowRight') { nextImage(); return; }
            if (e.key === 'ArrowLeft') { prevImage(); return; }
        });

        // 触摸滑动
        var touchStartX = 0, touchEndX = 0;
        if (dom.lightboxImg) {
            dom.lightboxImg.addEventListener('touchstart', function(e) {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            dom.lightboxImg.addEventListener('touchend', function(e) {
                touchEndX = e.changedTouches[0].screenX;
                var diff = touchStartX - touchEndX;
                if (Math.abs(diff) > 50) {
                    if (diff > 0) nextImage();
                    else prevImage();
                }
            }, { passive: true });
        }
    }

    function bindBackToTop() {
        if (!dom.btt) return;

        // 滚动监听：显示/隐藏按钮
        function onScroll(scrollTop) {
            if (!scrollTop) scrollTop = window.scrollY || document.documentElement.scrollTop;
            if (dom.btt.classList.contains('launching')) return;
            dom.btt.classList.toggle('visible', scrollTop > 500);
        }
        window.addEventListener('scroll', function() { onScroll(); });

        // Lenis 支持
        if (window.lenis) {
            window.lenis.on('scroll', function(e) { onScroll(e.scroll); });
        }

        // 点击：火箭动画 + 回到顶部
        dom.btt.addEventListener('click', function() {
            dom.btt.classList.add('launching');
            setTimeout(function() {
                if (window.lenis) {
                    window.lenis.scrollTo(0, { duration: 1.2 });
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 300);
            setTimeout(function() {
                dom.btt.classList.remove('launching', 'visible');
            }, 1000);
        });
    }

    function initLenis() {
        if (typeof Lenis === 'undefined') return;
        var lenis = new Lenis({
            duration: 0.5,
            easing: function(t) { return Math.min(1, 1.001 - Math.pow(2, -6 * t)); },
            smooth: true,
            smoothTouch: false,
            touchMultiplier: 2
        });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        window.lenis = lenis;
    }

    function readURLParams() {
        var params = new URLSearchParams(window.location.search);
        var view = params.get('view');
        var tag = params.get('tag');
        var q = params.get('q');

        if (view === 'timeline' || view === 'grid') {
            currentView = view;
            if (dom.btnGrid) dom.btnGrid.classList.toggle('active', view === 'grid');
            if (dom.btnTimeline) dom.btnTimeline.classList.toggle('active', view === 'timeline');
        }
        if (tag) activeTag = tag;
        if (q && dom.searchInput) dom.searchInput.value = q;
    }

    /* ═══════════════════════════════════════════════
       INIT
       ═══════════════════════════════════════════════ */

    async function init() {
        cacheDom();

        // 读取 URL 参数
        readURLParams();

        // 绑定事件
        bindToolbar();
        bindLightbox();
        bindBackToTop();

        // Lenis 平滑滚动
        initLenis();

        // 显示骨架屏
        renderSkeleton();

        // 加载数据
        var data = await fetchMoments();
        if (data === null) {
            renderError('数据加载失败，请稍后重试。');
            return;
        }

        allMoments = data;

        // 渲染热力图年份选择器
        renderHeatmapControls(data);

        // 首次渲染
        refresh();

        // 清理 URL 残留的 id 参数（不自动打开 lightbox）
        if (window.location.search.indexOf('id=') !== -1) {
            var url = new URL(window.location);
            url.searchParams.delete('id');
            window.history.replaceState({}, '', url);
        }

        // 初始图标渲染
        refreshIcons();
    }

    /* ═══════════════════════════════════════════════
       PUBLIC API
       ═══════════════════════════════════════════════ */

    return {
        init: init,
        openLightbox: openLightbox,
        closeLightbox: closeLightbox,
        nextImage: nextImage,
        prevImage: prevImage
    };

})();

// 自动启动
document.addEventListener('DOMContentLoaded', MomentsApp.init);

// 暴露到全局（供 HTML onclick 调用）
window.MomentsApp = MomentsApp;
