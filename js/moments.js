document.addEventListener('DOMContentLoaded', () => {
    const momentsContainer = document.querySelector('#moments-grid');
    const searchInput = document.querySelector('#search-input');
    const tagFiltersContainer = document.querySelector('#tag-filters');
    
    // Stats Elements
    const statsCount = document.getElementById('stats-count');
    const statsDays = document.getElementById('stats-days');
    const statsLocations = document.getElementById('stats-locations');
    const statsLatest = document.getElementById('stats-latest');

    // Lightbox Elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxContent = document.getElementById('lightbox-content');
    const lightboxDate = document.getElementById('lightbox-date');
    const lightboxLocation = document.getElementById('lightbox-location');
    const lightboxLocationContainer = document.getElementById('lightbox-location-container');
    const lightboxTags = document.getElementById('lightbox-tags');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxShare = document.getElementById('lightbox-share');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    
    // EXIF Elements
    const lightboxExif = document.getElementById('lightbox-exif');
    const exifCamera = document.getElementById('exif-camera');
    const exifLens = document.getElementById('exif-lens');
    const exifIso = document.getElementById('exif-iso');
    const exifAperture = document.getElementById('exif-aperture');
    const exifShutter = document.getElementById('exif-shutter');

    // UI Elements
    const backToTopBtn = document.getElementById('back-to-top');
    const viewGridBtn = document.getElementById('view-grid');
    const viewTimelineBtn = document.getElementById('view-timeline');
    const btnRandom = document.getElementById('btn-random');
    const heatmapContainer = document.getElementById('heatmap-container');

    let allMoments = [];
    let currentLightboxIndex = -1;
    let activeTag = null;
    let currentView = 'grid'; // 'grid' or 'timeline'

    // --- Helper Functions ---
    function safeLucideCreateIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try {
                window.lucide.createIcons();
            } catch (e) {
                console.warn('Lucide createIcons failed:', e);
            }
        }
    }

    function safeDate(dateStr) {
        if (!dateStr) return new Date();
        // First try parsing as is (handles ISO strings correctly)
        let date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
        
        // If failed, try replacing dashes with slashes (for Safari/older formats)
        date = new Date(dateStr.replace(/-/g, '/'));
        return isNaN(date.getTime()) ? new Date() : date;
    }

    function timeSince(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " 年前";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " 个月前";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " 天前";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " 小时前";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " 分钟前";
        return "刚刚";
    }

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 5) return "夜深了，";
        if (hour < 11) return "早上好，";
        if (hour < 13) return "中午好，";
        if (hour < 18) return "下午好，";
        return "晚上好，";
    }

    // --- UI Logic ---
    function initGreeting() {
        const titleDesc = document.querySelector('h1 + p');
        if (titleDesc) {
            const greeting = getGreeting();
            // Don't overwrite completely if it's already set
            if (!titleDesc.textContent.includes(greeting)) {
                titleDesc.innerHTML = `<span class="text-blue-500 font-medium">${greeting}</span> ${titleDesc.textContent}`;
            }
        }
    }

    function initBackToTop() {
        if (!backToTopBtn) return;
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.remove('opacity-0', 'translate-y-10');
            } else {
                backToTopBtn.classList.add('opacity-0', 'translate-y-10');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- Stats & Filters ---
    function updateStats(moments) {
        // Count
        animateValue(statsCount, 0, moments.length, 1000);

        // Days
        const uniqueDays = new Set(moments.map(m => safeDate(m.date).toDateString()));
        animateValue(statsDays, 0, uniqueDays.size, 1000);

        // Locations
        const uniqueLocations = new Set(moments.filter(m => m.location).map(m => m.location));
        animateValue(statsLocations, 0, uniqueLocations.size, 1000);

        // Latest
        if (moments.length > 0) {
            const latestDate = safeDate(moments[0].date);
            statsLatest.textContent = timeSince(latestDate);
        }
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function renderTags(moments) {
        const tagCounts = {};
        moments.forEach(m => {
            if (m.tags) {
                m.tags.forEach(t => {
                    tagCounts[t] = (tagCounts[t] || 0) + 1;
                });
            }
        });

        const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
        
        tagFiltersContainer.innerHTML = `
            <button class="tag-chip px-3 py-1.5 rounded-full text-sm font-medium transition-all ${!activeTag ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}" data-tag="all">
                全部 (${moments.length})
            </button>
            ${sortedTags.map(tag => `
                <button class="tag-chip px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeTag === tag ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}" data-tag="${tag}">
                    #${tag} (${tagCounts[tag]})
                </button>
            `).join('')}
        `;

        // Add event listeners
        document.querySelectorAll('.tag-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.getAttribute('data-tag');
                activeTag = tag === 'all' ? null : tag;
                filterMoments();
                renderTags(allMoments); // Re-render to update active state
            });
        });
    }

    function renderHeatmap(moments) {
        if (!heatmapContainer) return;
        
        // Generate last 52 weeks (approx 364 days)
        const today = new Date();
        const dates = [];
        // Align to previous Sunday
        const dayOfWeek = today.getDay();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + (6 - dayOfWeek)); // Coming Saturday
        
        // Go back 52 weeks
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (52 * 7) + 1);
        
        // Map moment counts
        const counts = {};
        moments.forEach(m => {
            const dateStr = safeDate(m.date).toDateString();
            counts[dateStr] = (counts[dateStr] || 0) + 1;
        });
        
        // Render Weeks
        let html = '';
        let currentDate = new Date(startDate);
        
        // 52 columns
        for (let w = 0; w < 52; w++) {
            let weekHtml = '<div class="flex flex-col gap-1">';
            for (let d = 0; d < 7; d++) {
                const dateStr = currentDate.toDateString();
                const count = counts[dateStr] || 0;
                
                // Color levels
                let colorClass = 'bg-gray-100 dark:bg-gray-800'; // 0
                if (count > 0) colorClass = 'bg-blue-200 dark:bg-blue-900/40'; // 1
                if (count > 1) colorClass = 'bg-blue-400 dark:bg-blue-600'; // 2
                if (count > 2) colorClass = 'bg-blue-600 dark:bg-blue-400'; // 3+
                
                const tooltip = `${currentDate.toLocaleDateString('zh-CN')}: ${count} 个瞬间`;
                
                weekHtml += `<div class="w-2.5 h-2.5 rounded-sm ${colorClass} cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all" title="${tooltip}"></div>`;
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            weekHtml += '</div>';
            html += weekHtml;
        }
        
        // Add gap between weeks
        heatmapContainer.className = "flex justify-between gap-1 overflow-x-auto pb-1 scrollbar-hide";
        heatmapContainer.innerHTML = html;
    }

    function openRandomLightbox() {
        if (allMoments.length === 0) return;
        const randomIndex = Math.floor(Math.random() * allMoments.length);
        openLightboxByIndex(randomIndex);
    }

    // Expose openLightbox to global scope for inline onclick
    window.openLightbox = (id) => {
        const index = allMoments.findIndex(m => String(m.id) === String(id));
        if (index !== -1) {
            openLightboxByIndex(index);
        }
    };

    function filterMoments() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filtered = allMoments.filter(m => {
            const matchesSearch = !searchTerm || 
                m.content.toLowerCase().includes(searchTerm) || 
                (m.tags && m.tags.some(t => t.toLowerCase().includes(searchTerm))) ||
                (m.location && m.location.toLowerCase().includes(searchTerm));
            
            const matchesTag = !activeTag || (m.tags && m.tags.includes(activeTag));
            
            return matchesSearch && matchesTag;
        });
        
        renderMoments(filtered);
    }

    // --- View Switching Logic ---
    function switchView(view) {
        if (currentView === view) return;
        currentView = view;
        
        // Update Buttons
        if (view === 'grid') {
            viewGridBtn.className = "p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 transition-all shadow-sm";
            viewTimelineBtn.className = "p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-all";
        } else {
            viewTimelineBtn.className = "p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 transition-all shadow-sm";
            viewGridBtn.className = "p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-all";
        }

        // Re-render
        filterMoments();
    }

    if (viewGridBtn && viewTimelineBtn) {
        viewGridBtn.addEventListener('click', () => switchView('grid'));
        viewTimelineBtn.addEventListener('click', () => switchView('timeline'));
    }

    // --- Rendering Logic ---

    function renderSkeleton() {
        momentsContainer.className = "columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6";
        momentsContainer.innerHTML = Array(6).fill(0).map((_, i) => `
            <div class="break-inside-avoid bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden h-full animate-pulse mb-6">
                <div class="h-64 bg-gray-200 dark:bg-gray-800"></div>
                <div class="p-6 space-y-4">
                    <div class="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    <div class="h-6 w-3/4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
            </div>
        `).join('');
    }

    async function fetchMoments() {
        renderSkeleton();
        try {
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // 1. Fetch Local Data (Disabled as per user request)
            let localMoments = [];
            /* 
            try {
                const localResponse = await fetch(`public/data/moments.json?v=${Date.now()}`);
                if (localResponse.ok) {
                    localMoments = await localResponse.json();
                }
            } catch (e) {
                console.warn('Failed to fetch local moments:', e);
            }
            */

            // 2. Fetch GitHub Issues (Your "Mobile Cloud Database")
            // TODO: Replace with your actual username and repo name
            const GITHUB_USERNAME = 'Harrington1106'; 
            const GITHUB_REPO = 'blog-add';
            
            let githubMoments = [];
            
            // Only fetch if username is configured (not default placeholder)
            if (GITHUB_USERNAME !== 'your-username') {
                try {
                    const githubResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/issues?labels=moment&state=open&sort=created&direction=desc&per_page=100`);
                    if (githubResponse.ok) {
                        const issues = await githubResponse.json();
                        githubMoments = issues.map(issue => {
                            // Parse body for image
                            const imgMatch = issue.body.match(/!\[.*?\]\((.*?)\)/) || issue.body.match(/<img.*?src="(.*?)".*?>/);
                            const image = imgMatch ? imgMatch[1] : null;
                            
                            // Remove image markdown from content to avoid duplication
                            let content = issue.body.replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img.*?>/g, '').trim();
                            
                            // Parse tags (lines starting with # or words starting with #)
                            const tags = [];
                            // Extract explicit tags like #tag
                            const tagMatches = content.match(/#[\w\u4e00-\u9fa5]+/g);
                            if (tagMatches) {
                                tags.push(...tagMatches.map(t => t.substring(1)));
                                // Remove tags from content if you prefer clean text
                                content = content.replace(/#[\w\u4e00-\u9fa5]+/g, ''); 
                            }
                            
                            return {
                                id: `gh-${issue.number}`, // Unique ID prefix
                                date: issue.created_at,
                                content: content,
                                image: image,
                                location: issue.title, // Use Issue Title as Location (or Date if preferred)
                                tags: tags,
                                fromGithub: true // Flag to identify source
                            };
                        });
                    }
                } catch (ghError) {
                    console.warn('Failed to fetch GitHub moments:', ghError);
                }
            }

            // 3. Merge and Sort
            allMoments = [...githubMoments, ...localMoments];
            
            // Sort by date descending
            allMoments.sort((a, b) => safeDate(b.date) - safeDate(a.date));

            updateStats(allMoments);
            renderHeatmap(allMoments);
            renderTags(allMoments);
            filterMoments(); // This calls renderMoments
            
            // Handle Deep Link
            const params = new URLSearchParams(window.location.search);
            const initialId = params.get('id');
            if (initialId) {
                // Wait for rendering to finish
                setTimeout(() => {
                    const index = allMoments.findIndex(m => String(m.id) === initialId);
                    if (index !== -1) openLightboxByIndex(index);
                }, 500);
            }

        } catch (error) {
            console.error('Error fetching moments:', error);
            momentsContainer.className = "col-span-full";
            momentsContainer.innerHTML = `
                <div class="text-center py-10">
                    <div class="inline-block p-4 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
                        <i data-lucide="alert-circle" class="w-8 h-8 text-red-500"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">加载失败，请稍后重试。</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                        刷新页面
                    </button>
                </div>
            `;
            safeLucideCreateIcons();
        }
    }

    function renderMoments(moments) {
        if (moments.length === 0) {
            momentsContainer.className = "col-span-full";
            momentsContainer.innerHTML = `
                <div class="text-center py-20 animate-fade-in flex flex-col items-center justify-center">
                    <div class="w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                        <i data-lucide="camera-off" class="w-10 h-10 text-gray-400"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">暂无瞬间</h3>
                    <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        没有找到匹配的记录，换个关键词试试？
                    </p>
                </div>
            `;
            safeLucideCreateIcons();
            return;
        }

        if (currentView === 'grid') {
            renderGrid(moments);
        } else {
            renderTimeline(moments);
        }
    }

    function renderGrid(moments) {
        momentsContainer.className = "columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6";
        momentsContainer.innerHTML = moments.map((moment, index) => {
            const date = safeDate(moment.date).toLocaleDateString('zh-CN', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            
            const imageHtml = moment.image ? `
                <div class="relative overflow-hidden rounded-xl mb-4 group cursor-zoom-in" onclick="openLightbox('${moment.id}')">
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
                        <i data-lucide="maximize-2" class="w-8 h-8 text-white drop-shadow-lg transform scale-75 group-hover:scale-100 transition-transform"></i>
                    </div>
                    <img 
                        src="${moment.image}" 
                        alt="Moment" 
                        loading="lazy"
                        class="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    ${moment.exif ? `
                        <div class="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-mono">
                            ${moment.exif.camera || 'Camera'}
                        </div>
                    ` : ''}
                </div>
            ` : '';

            const locationHtml = moment.location ? `
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(moment.location)}" target="_blank" class="flex items-center text-xs text-gray-400 mt-3 hover:text-blue-500 transition-colors" onclick="event.stopPropagation()">
                    <i data-lucide="map-pin" class="w-3 h-3 mr-1"></i>
                    ${moment.location}
                </a>
            ` : '';

            return `
            <div 
                class="break-inside-avoid bg-white dark:bg-neutral-900 rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-800 p-5 transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style="animation-delay: ${index * 0.05}s"
            >
                ${imageHtml}
                
                <div class="relative">
                    <div class="text-xs font-medium text-gray-400 mb-2 flex items-center">
                        <i data-lucide="clock" class="w-3 h-3 mr-1.5 text-blue-500"></i>
                        ${date}
                    </div>
                    
                    <p class="text-gray-700 dark:text-gray-300 leading-relaxed font-serif text-lg">
                        ${moment.content}
                    </p>
                    
                    ${locationHtml}
                    
                    ${moment.tags ? `
                        <div class="flex flex-wrap gap-2 mt-4">
                            ${moment.tags.map(tag => `
                                <span class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 rounded-md">#${tag}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');
        
        safeLucideCreateIcons();
    }

    function renderTimeline(moments) {
        momentsContainer.className = "max-w-3xl mx-auto pl-8 border-l-2 border-blue-100 dark:border-gray-800 space-y-10";
        
        let lastYearMonth = '';
        
        momentsContainer.innerHTML = moments.map((moment, index) => {
            const dateObj = safeDate(moment.date);
            const yearMonth = dateObj.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
            const dateStr = dateObj.toLocaleDateString('zh-CN', { day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            let headerHtml = '';
            if (yearMonth !== lastYearMonth) {
                lastYearMonth = yearMonth;
                headerHtml = `
                    <div class="absolute -left-[41px] top-0 flex items-center animate-fade-in">
                        <div class="h-5 w-5 rounded-full border-4 border-white dark:border-black bg-blue-500 shadow-md z-10"></div>
                        <span class="ml-4 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-500/20 whitespace-nowrap">
                            ${yearMonth}
                        </span>
                    </div>
                `;
            } else {
                 headerHtml = `
                    <div class="absolute -left-[37px] top-6 h-3 w-3 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-black z-10"></div>
                `;
            }

            const imageHtml = moment.image ? `
                <div class="relative w-full md:w-48 h-48 md:h-auto shrink-0 overflow-hidden rounded-xl cursor-zoom-in" onclick="openLightbox('${moment.id}')">
                    <img 
                        src="${moment.image}" 
                        alt="Moment" 
                        loading="lazy"
                        class="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                    />
                </div>
            ` : '';

            return `
            <div class="relative animate-fade-in" style="animation-delay: ${index * 0.05}s">
                ${headerHtml}
                
                <div class="ml-4 mt-8 bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
                    ${imageHtml}
                    
                    <div class="flex-1">
                        <div class="flex items-center text-xs text-gray-400 mb-3">
                            <i data-lucide="clock" class="w-3 h-3 mr-1.5"></i>
                            ${dateStr}
                            ${moment.location ? `
                                <span class="mx-2 text-gray-300 dark:text-gray-700">|</span>
                                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(moment.location)}" target="_blank" class="flex items-center hover:text-blue-500 transition-colors" onclick="event.stopPropagation()">
                                    <i data-lucide="map-pin" class="w-3 h-3 mr-1.5"></i>
                                    ${moment.location}
                                </a>
                            ` : ''}
                        </div>
                        
                        <p class="text-gray-700 dark:text-gray-300 leading-relaxed font-serif text-lg mb-4">
                            ${moment.content}
                        </p>
                        
                        ${moment.tags ? `
                            <div class="flex flex-wrap gap-2">
                                ${moment.tags.map(tag => `
                                    <span class="px-2 py-1 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 rounded-md">#${tag}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        safeLucideCreateIcons();
    }

    // --- Lightbox Logic ---

    function preloadImage(url) {
        if (!url) return;
        const img = new Image();
        img.src = url;
    }

    function openLightboxByIndex(index) {
        currentLightboxIndex = index;
        const moment = allMoments[index];
        if (!moment) return;

        lightboxImg.src = moment.image || '';
        lightboxContent.textContent = moment.content;
        lightboxDate.textContent = safeDate(moment.date).toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
        
        if (moment.location) {
            lightboxLocation.textContent = moment.location;
            lightboxLocationContainer.classList.remove('hidden');
            // Update click handler for map
            lightboxLocationContainer.onclick = () => {
                const query = encodeURIComponent(moment.location);
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
            };
            lightboxLocationContainer.title = "在地图中查看";
        } else {
            lightboxLocationContainer.classList.add('hidden');
            lightboxLocationContainer.onclick = null;
        }

        // Tags
        if (moment.tags && moment.tags.length > 0) {
            lightboxTags.innerHTML = moment.tags.map(tag => 
                `<span class="text-xs font-medium text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-500/20">#${tag}</span>`
            ).join('');
            lightboxTags.classList.remove('hidden');
        } else {
            lightboxTags.classList.add('hidden');
        }

        // EXIF
        if (moment.exif) {
            exifCamera.textContent = moment.exif.camera || '--';
            exifLens.textContent = moment.exif.lens || '--';
            exifIso.textContent = `ISO ${moment.exif.iso || '--'}`;
            exifAperture.textContent = moment.exif.aperture || '--';
            exifShutter.textContent = moment.exif.shutter || '--';
            lightboxExif.classList.remove('hidden');
        } else {
            lightboxExif.classList.add('hidden');
        }

        // Update URL without reloading (Deep Linking)
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('id', moment.id);
        window.history.pushState({}, '', newUrl);

        // Preload next image
        if (index + 1 < allMoments.length && allMoments[index + 1].image) {
            preloadImage(allMoments[index + 1].image);
        }

        // Show Lightbox
        lightbox.classList.remove('hidden');
        // Small delay to allow display:block to apply before opacity transition
        setTimeout(() => {
            lightbox.classList.remove('opacity-0');
        }, 10);
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function closeLightbox() {
        lightbox.classList.add('opacity-0');
        setTimeout(() => {
            lightbox.classList.add('hidden');
            lightboxImg.src = ''; 
        }, 300);
        document.body.style.overflow = '';
        
        // Remove ID from URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('id');
        window.history.pushState({}, '', newUrl);
    }

    function nextImage() {
        let nextIndex = currentLightboxIndex + 1;
        while (nextIndex < allMoments.length && !allMoments[nextIndex].image) {
            nextIndex++;
        }
        if (nextIndex < allMoments.length) {
            openLightboxByIndex(nextIndex);
        }
    }

    function prevImage() {
        let prevIndex = currentLightboxIndex - 1;
        while (prevIndex >= 0 && !allMoments[prevIndex].image) {
            prevIndex--;
        }
        if (prevIndex >= 0) {
            openLightboxByIndex(prevIndex);
        }
    }

    // Event Listeners for Lightbox
    lightboxClose.addEventListener('click', closeLightbox);
    
    // Share Button
    if (lightboxShare) {
        lightboxShare.addEventListener('click', async () => {
            const url = window.location.href;
            try {
                await navigator.clipboard.writeText(url);
                
                // Visual feedback
                const originalIcon = lightboxShare.innerHTML;
                lightboxShare.innerHTML = '<i data-lucide="check" class="w-6 h-6 text-green-600 dark:text-green-400"></i>';
                setTimeout(() => {
                    lightboxShare.innerHTML = originalIcon;
                    safeLucideCreateIcons();
                }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        });
    }

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        nextImage();
    });
    lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        prevImage();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('hidden')) return;
        
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });

    // Touch Gestures (Swipe)
    let touchStartX = 0;
    let touchEndX = 0;
    
    lightboxImg.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    lightboxImg.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        if (touchEndX < touchStartX - 50) nextImage(); // Swipe Left -> Next
        if (touchEndX > touchStartX + 50) prevImage(); // Swipe Right -> Prev
    }

    // --- Search Event Listeners ---
    if (searchInput) {
        searchInput.addEventListener('input', filterMoments);
    }
    
    if (btnRandom) {
        btnRandom.addEventListener('click', openRandomLightbox);
    }

    // Initialization
    initGreeting();
    initBackToTop();
    fetchMoments();
});
