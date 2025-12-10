document.addEventListener('DOMContentLoaded', () => {
    const postsContainer = document.querySelector('#posts-grid');
    const searchInput = document.querySelector('#search-input');
    const categoryContainer = document.querySelector('#category-filters');
    const viewButtons = document.querySelectorAll('.view-btn');
    
    let allPosts = [];
    let activeCategory = '全部';
    let currentView = 'grid';

    // Map categories to Unsplash images
    const categoryImages = {
        '天文': 'https://images.unsplash.com/photo-1519681393784-d8e5b5a4570e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        '天文观测': 'https://images.unsplash.com/photo-1519681393784-d8e5b5a4570e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        '技术': 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        '技术思考': 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        '博客运维': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        '生活': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        '日记': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        'default': 'https://images.unsplash.com/photo-1499750310159-5b5f2269592b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    };

    // --- SVG Generator ---
    function generateFallbackSVG(seedString) {
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < seedString.length; i++) {
            hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Color palette (vibrant gradients)
        const colors = [
            ['#4F46E5', '#EC4899'], // Indigo to Pink
            ['#059669', '#34D399'], // Emerald
            ['#DC2626', '#F59E0B'], // Red to Amber
            ['#2563EB', '#60A5FA'], // Blue
            ['#7C3AED', '#C4B5FD'], // Violet
            ['#DB2777', '#F472B6']  // Pink
        ];

        const colorIndex = Math.abs(hash) % colors.length;
        const [c1, c2] = colors[colorIndex];
        
        // Generate a simple pattern (circles)
        let pattern = '';
        for(let i=0; i<5; i++) {
            const cx = Math.abs((hash >> i) % 100);
            const cy = Math.abs((hash >> (i+5)) % 100);
            const r = Math.abs((hash >> (i+2)) % 40) + 10;
            const opacity = 0.1 + (Math.abs((hash >> i) % 50) / 100);
            pattern += `<circle cx="${cx}%" cy="${cy}%" r="${r}" fill="white" fill-opacity="${opacity}"/>`;
        }

        const svg = `
        <svg width="100%" height="100%" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${c1};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${c2};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grad${hash})" />
            ${pattern}
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="white" font-weight="bold" opacity="0.9">
                ${seedString.substring(0, 1).toUpperCase()}
            </text>
        </svg>
        `;
        
        // Return data URI
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }

    function getCategoryImage(category) {
        if (category === '博客运维') {
            return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';
        }
        return categoryImages[category] || categoryImages['default'];
    }

    // --- Helper Functions ---
    function escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

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
        // Handle YYYY-MM-DD to ensure consistent parsing
        const date = new Date(dateStr.replace(/-/g, '/'));
        return isNaN(date.getTime()) ? new Date() : date;
    }

    // --- Rendering Logic ---

    function renderSkeleton() {
        postsContainer.className = "grid gap-8 md:grid-cols-2 lg:grid-cols-3";
        postsContainer.innerHTML = Array(6).fill(0).map((_, i) => `
            <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden h-full animate-pulse">
                <div class="h-48 bg-gray-200 dark:bg-gray-800"></div>
                <div class="p-6 space-y-4">
                    <div class="flex space-x-4">
                        <div class="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
                        <div class="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    </div>
                    <div class="h-6 w-3/4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    <div class="space-y-2">
                        <div class="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
                        <div class="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function fetchPosts() {
        console.log('Starting fetchPosts...');
        renderSkeleton();
        try {
            await new Promise(resolve => setTimeout(resolve, 600));
            console.log('Fetching public/posts/posts.json...');
            const response = await fetch(`public/posts/posts.json?v=${Date.now()}`);
            console.log('Fetch response status:', response.status);
            
            if (!response.ok) throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            console.log('Fetched data:', data);
            
            allPosts = data.sort((a, b) => safeDate(b.date) - safeDate(a.date));
            console.log('Sorted posts:', allPosts.length);
            
            // Only render top filters if we are NOT in the new category view mode
            // But user said grid view should not have filters.
            // Actually, the previous implementation called renderCategories() which rendered the top filter buttons.
            // We should remove that call if we want to remove the filters.
            // renderCategories(); // REMOVE THIS as it renders the top filter bar
            
            renderContent(allPosts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            postsContainer.className = "col-span-full";
            postsContainer.innerHTML = `
                <div class="text-center py-10">
                    <div class="inline-block p-4 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
                        <i data-lucide="alert-circle" class="w-8 h-8 text-red-500"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">加载文章失败，请稍后重试。</p>
                    <p class="text-xs text-gray-400 mt-2">${error.message}</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                        刷新页面
                    </button>
                </div>
            `;
            safeLucideCreateIcons();
        }
    }



    function renderContent(posts) {
        if (posts.length === 0) {
            postsContainer.className = "col-span-full";
            postsContainer.innerHTML = `
                <div class="text-center py-20 animate-fade-in flex flex-col items-center justify-center">
                    <div class="w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                        <i data-lucide="search-x" class="w-10 h-10 text-gray-400"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">没有找到相关文章</h3>
                    <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        看起来这里空空如也，换个关键词或分类试试看？
                    </p>
                </div>
            `;
            safeLucideCreateIcons();
            return;
        }

        try {
            // Switch render method based on currentView
            switch (currentView) {
                case 'timeline':
                    renderTimeline(posts);
                    break;
                case 'directory':
                    renderDirectory(posts);
                    break;
                case 'tags':
                    renderTags(posts);
                    break;
                case 'categories':
                    renderCategories(posts);
                    break;
                case 'grid':
                default:
                    renderGrid(posts);
                    break;
            }
        } catch (e) {
            console.error('Error rendering content:', e);
            postsContainer.className = "col-span-full";
            postsContainer.innerHTML = `
                <div class="text-center py-10">
                    <div class="inline-block p-4 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
                        <i data-lucide="alert-triangle" class="w-8 h-8 text-red-500"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">渲染文章内容时发生错误。</p>
                    <p class="text-xs text-gray-400 mt-2">${e.message}</p>
                </div>
            `;
        }
        safeLucideCreateIcons();
    }

    // View: Grid (Default)
    function renderCategoryFilters(posts) {
        // Extract unique categories and group them
        const groupMap = {};
        posts.forEach(p => {
            const g = p.group || '其他';
            const c = p.category || '未分类';
            if (!groupMap[g]) groupMap[g] = new Set();
            groupMap[g].add(c);
        });

        // Define Group Order
        const groupOrder = ['技术开发', '效率工具', '生活记录', '其他'];
        const sortedGroups = Object.keys(groupMap).sort((a, b) => {
             const ia = groupOrder.indexOf(a);
             const ib = groupOrder.indexOf(b);
             if (ia !== -1 && ib !== -1) return ia - ib;
             if (ia !== -1) return -1;
             if (ib !== -1) return 1;
             return a.localeCompare(b, 'zh-CN');
        });

        // Flatten to sorted categories
        const uniqueCats = new Set();
        const categories = ['全部'];
        
        sortedGroups.forEach(g => {
             const cats = Array.from(groupMap[g]).sort((a, b) => a.localeCompare(b, 'zh-CN'));
             cats.forEach(c => {
                 if (!uniqueCats.has(c)) {
                     uniqueCats.add(c);
                     categories.push(c);
                 }
             });
        });
        
        categoryContainer.className = "flex flex-wrap gap-2 mb-8 animate-fade-in";
        categoryContainer.innerHTML = categories.map(cat => `
            <button 
                onclick="filterByCategory('${cat}')"
                class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeCategory === cat 
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-black' 
                        : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
                }"
            >
                ${cat}
            </button>
        `).join('');

        if (activeCategory === '全部') {
             // Keep consistent
        }
    }

    function renderGrid(posts) {
        console.log('Rendering grid with', posts.length, 'posts');
        
        // Show filters if we have an active category filter (not '全部')
        // Or if we just want them always available in Grid view
        if (activeCategory !== '全部') {
            renderCategoryFilters(allPosts);
        } else {
            // If showing all posts (default grid), maybe hide filters to keep it clean?
            // Or show them? Let's show them for better UX.
             renderCategoryFilters(allPosts);
        }
        
        postsContainer.className = "grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-3";
        
        const htmlParts = posts.map((post, index) => {
            try {
                const date = safeDate(post.date).toLocaleDateString('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit'
                });
                
                // Explicitly handle coverImage
                let image = post.coverImage;
                if (!image || typeof image !== 'string' || image.trim() === '') {
                     image = getCategoryImage(post.category);
                }
                
                const link = `post.html?file=${post.file}`;
                const fallback = generateFallbackSVG(post.title || 'No Title');

                // Render Tags (Max 3)
                let tagsHtml = '';
                if (post.tags && Array.isArray(post.tags) && post.tags.length > 0) {
                    tagsHtml = `
                    <div class="mt-4 flex flex-wrap gap-2">
                        ${post.tags.slice(0, 3).map(tag => `
                            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                <i data-lucide="hash" class="w-3 h-3 mr-1 opacity-50"></i>${tag}
                            </span>
                        `).join('')}
                    </div>`;
                }

                return `
                <article 
                    class="blog-post-card group bg-white dark:bg-neutral-900 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden card-hover flex flex-col h-full transition-all duration-300 hover:-translate-y-1 relative cursor-pointer"
                    onclick="window.location.href='${link}'"
                >
                    <div class="relative h-52 overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img 
                            src="${image}" 
                            alt="${escapeHtml(post.title)}" 
                            loading="lazy"
                            onerror="this.onerror=null; this.src='${fallback}'"
                            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 relative z-10"
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"></div>
                    </div>
                    
                    <div class="p-6 flex-grow flex flex-col relative">
                        <div class="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-4 space-x-4">
                            <div class="flex items-center">
                                <i data-lucide="calendar" class="mr-1.5 w-3.5 h-3.5 text-blue-500"></i>
                                ${date}
                            </div>
                            <div class="flex items-center">
                                <i data-lucide="clock" class="mr-1.5 w-3.5 h-3.5 text-blue-500"></i>
                                ${post.readTime || 5} min read
                            </div>
                        </div>
                        
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                ${escapeHtml(post.title)}
                            </h3>
                            
                            <p class="text-gray-600 dark:text-gray-400 flex-grow line-clamp-3 leading-relaxed text-sm">
                                ${escapeHtml(post.excerpt) || '暂无摘要'}
                            </p>
                        
                        ${tagsHtml}
                    </div>
                </article>
                `;
            } catch (e) {
                console.error('Error rendering post:', post.title, e);
                return '';
            }
        });

        postsContainer.innerHTML = htmlParts.join('');
    }

    // View: Timeline
    function renderTimeline(posts) {
        // Clear top filters if any
        categoryContainer.innerHTML = '';
        categoryContainer.className = "hidden";
        
        postsContainer.className = "max-w-4xl mx-auto px-4";
        
        // Group by Year -> Month
        const grouped = {};
        posts.forEach(post => {
            const date = safeDate(post.date);
            const year = date.getFullYear();
            // Fix: Use getMonth() for consistent numeric month strings (01-12)
            // toLocaleString can return inconsistent formats (e.g., "12月" vs "12") causing sort bugs
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            
            if (!grouped[year]) grouped[year] = {};
            if (!grouped[year][month]) grouped[year][month] = [];
            grouped[year][month].push(post);
        });


        const years = Object.keys(grouped).sort((a,b) => b-a);

        postsContainer.innerHTML = `
            <div class="relative py-8">
                <!-- Vertical Line -->
                <div class="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-gray-200 to-gray-200 dark:from-blue-600 dark:via-gray-800 dark:to-gray-800"></div>
                
                <div class="space-y-16">
                    ${years.map(year => `
                        <div class="relative animate-fade-in">
                            <!-- Year Marker -->
                            <div class="flex items-center mb-10">
                                <div class="z-10 flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-white dark:bg-neutral-900 border-4 border-blue-500 rounded-full shadow-lg shadow-blue-500/20">
                                    <span class="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">${year}</span>
                                </div>
                                <div class="h-0.5 flex-grow bg-gradient-to-r from-blue-500/50 to-transparent ml-4"></div>
                            </div>

                            <div class="space-y-12 pl-12 md:pl-24">
                                ${Object.keys(grouped[year]).sort((a,b) => b-a).map(month => `
                                    <div class="relative group">
                                        <!-- Month Label -->
                                        <div class="absolute -left-[3.5rem] md:-left-[6.5rem] top-0 flex flex-col items-center">
                                            <span class="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md mb-2 shadow-sm">${month}月</span>
                                            <div class="w-3 h-3 rounded-full bg-blue-400 dark:bg-blue-600 ring-4 ring-white dark:ring-neutral-900 shadow-sm group-hover:scale-125 transition-transform duration-300"></div>
                                        </div>

                                        <div class="grid gap-6">
                                            ${grouped[year][month].map(post => `
                                                <article 
                                                    class="group/card relative bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
                                                    onclick="window.location.href='post.html?file=${post.file}'"
                                                >
                                                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover/card:opacity-20 transition-opacity">
                                                        <i data-lucide="arrow-right" class="w-12 h-12 -rotate-45"></i>
                                                    </div>

                                                    <div class="flex flex-col md:flex-row md:items-start gap-5 justify-between relative z-10">
                                                        <div class="flex-grow">
                                                            <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                                <span class="flex items-center bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">
                                                                    <i data-lucide="calendar" class="w-3.5 h-3.5 mr-1.5 text-blue-500"></i>
                                                                    ${safeDate(post.date).getDate()}日
                                                                </span>
                                                                <span class="flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md">
                                                                    <i data-lucide="folder" class="w-3.5 h-3.5 mr-1.5"></i>
                                                                    ${post.category || '未分类'}
                                                                </span>
                                                            </div>
                                                            <h3 class="text-xl font-bold text-gray-900 dark:text-white group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors mb-2 leading-tight">
                                                                ${escapeHtml(post.title)}
                                                            </h3>
                                                            ${post.excerpt ? `
                                                                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                                                    ${escapeHtml(post.excerpt)}
                                                                </p>
                                                            ` : ''}
                                                        </div>
                                                        
                                                        ${post.tags ? `
                                                            <div class="flex flex-wrap gap-2 md:flex-col md:items-end md:min-w-[140px]">
                                                                ${post.tags.slice(0, 3).map(tag => `
                                                                    <span class="px-2.5 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs rounded-full border border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">#${tag}</span>
                                                                `).join('')}
                                                                ${post.tags.length > 3 ? `<span class="text-xs text-gray-400 px-2">+${post.tags.length - 3}</span>` : ''}
                                                            </div>
                                                        ` : ''}
                                                    </div>
                                                </article>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- End Marker -->
                <div class="absolute left-4 md:left-8 bottom-0 w-3 h-3 -ml-[5px] rounded-full bg-gray-300 dark:bg-gray-700"></div>
            </div>
        `;
    }

    // View: Directory (This is now redundant or can be an alias to categories, but user said "Directory means... big classes")
    function renderDirectory(posts) {
        renderCategories(posts);
    }

    // View: Categories (The main "Directory" view)
    function renderCategories(posts) {
        // Clear top filters if any
        categoryContainer.innerHTML = '';
        categoryContainer.className = "hidden";

        postsContainer.className = "space-y-16 max-w-6xl mx-auto px-4";

        // Group by Group -> Category
        const grouped = {};
        posts.forEach(post => {
            const groupName = post.group || '其他';
            const categoryName = post.category || '未分类';
            
            if (!grouped[groupName]) grouped[groupName] = {};
            if (!grouped[groupName][categoryName]) grouped[groupName][categoryName] = [];
            
            grouped[groupName][categoryName].push(post);
        });

        // Sort groups (optional: define priority)
        const groupOrder = ['技术开发', '效率工具', '生活记录', '其他'];
        const sortedGroups = Object.keys(grouped).sort((a, b) => {
            const indexA = groupOrder.indexOf(a);
            const indexB = groupOrder.indexOf(b);
            // If both are in the list, sort by index
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            // If only A is in list, A comes first
            if (indexA !== -1) return -1;
            // If only B is in list, B comes first
            if (indexB !== -1) return 1;
            // Otherwise sort alphabetically
            return a.localeCompare(b, 'zh-CN');
        });

        postsContainer.innerHTML = sortedGroups.map(groupName => {
            const categories = grouped[groupName];
            const categoryNames = Object.keys(categories).sort((a, b) => categories[b].length - categories[a].length);

            return `
                <div class="animate-fade-in">
                    <!-- Group Header -->
                    <div class="flex items-center mb-8">
                        <div class="w-1.5 h-8 bg-blue-600 dark:bg-blue-500 rounded-full mr-4"></div>
                        <h2 class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">${groupName}</h2>
                        <div class="ml-4 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400">
                            ${Object.values(categories).reduce((acc, curr) => acc + curr.length, 0)} 篇文章
                        </div>
                    </div>

                    <!-- Categories Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        ${categoryNames.map(catName => {
                            const catPosts = categories[catName];
                            const coverImage = getCategoryImage(catName);
                            
                            return `
                                <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                                    <!-- Category Header Image -->
                                    <div class="h-32 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                                        <img src="${coverImage}" class="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" alt="${catName}">
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div class="absolute bottom-0 left-0 p-4">
                                            <h3 class="text-xl font-bold text-white mb-0.5">${catName}</h3>
                                            <span class="text-xs text-white/80 font-medium bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
                                                ${catPosts.length} 篇
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Recent Posts List -->
                                    <div class="p-4 flex-grow bg-white dark:bg-neutral-900">
                                        <div class="space-y-3">
                                            ${catPosts.slice(0, 3).map(post => `
                                                <a href="post.html?file=${post.file}" class="block group/item">
                                                    <div class="flex items-start justify-between gap-2">
                                                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 line-clamp-1 transition-colors">
                                                            ${escapeHtml(post.title)}
                                                        </span>
                                                        <span class="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                                                            ${safeDate(post.date).getMonth() + 1}/${safeDate(post.date).getDate()}
                                                        </span>
                                                    </div>
                                                </a>
                                            `).join('')}
                                        </div>
                                    </div>

                                    <!-- Footer / View All -->
                                    <div class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 flex justify-between items-center">
                                        <span class="text-xs text-gray-500 dark:text-gray-400">最近更新: ${safeDate(catPosts[0].date).toLocaleDateString()}</span>
                                        <button onclick="filterByCategory('${catName}')" class="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center hover:underline">
                                            查看全部 <i data-lucide="arrow-right" class="w-3 h-3 ml-1"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('<div class="h-px bg-gray-100 dark:bg-gray-800 my-12"></div>');
    }

    // Helper to switch to grid view filtered by category
    window.filterByCategory = function(category) {
        // Find the 'Grid' button and click it, or manually set state
        currentView = 'grid';
        activeCategory = category;
        
        // Update UI buttons
        viewButtons.forEach(btn => {
            if(btn.dataset.view === 'grid') {
                btn.classList.add('bg-white', 'dark:bg-neutral-800', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
                btn.classList.remove('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-900', 'dark:hover:text-gray-200');
            } else {
                btn.classList.remove('bg-white', 'dark:bg-neutral-800', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
                btn.classList.add('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-900', 'dark:hover:text-gray-200');
            }
        });

        // Filter and render
        const filtered = allPosts.filter(p => p.category === category);
        
        // Update Category Filter UI
        renderCategoryFilters(allPosts); // Re-render to show active state
        
        // Update Posts
        renderGrid(filtered);
    };



    // View: Tags
    function renderTags(posts) {
        // Clear top filters if any
        categoryContainer.innerHTML = '';
        categoryContainer.className = "hidden";

        postsContainer.className = "space-y-12 max-w-6xl mx-auto";
        
        // Group by tags
        const grouped = {};
        posts.forEach(post => {
            if (post.tags && Array.isArray(post.tags) && post.tags.length > 0) {
                post.tags.forEach(tag => {
                    if (!grouped[tag]) grouped[tag] = [];
                    grouped[tag].push(post);
                });
            } else {
                if (!grouped['无标签']) grouped['无标签'] = [];
                grouped['无标签'].push(post);
            }
        });

        // 1. Tag Cloud / Overview
        const sortedTags = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);
        
        const overviewHtml = `
            <div class="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-none mb-12 animate-fade-in relative overflow-hidden">
                <div class="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                    <i data-lucide="tags" class="w-64 h-64"></i>
                </div>
                
                <div class="relative z-10">
                    <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                        <span class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-3 text-blue-600 dark:text-blue-400">
                            <i data-lucide="hash" class="w-6 h-6"></i>
                        </span>
                        标签云
                        <span class="ml-3 text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">${sortedTags.length} 个标签</span>
                    </h3>
                    
                    <div class="flex flex-wrap gap-3 justify-center">
                        ${sortedTags.map(tag => {
                            const count = grouped[tag].length;
                            // Calculate size: base 1rem + (count * 0.1) limited to 2.5rem
                            const fontSize = Math.min(1 + (count * 0.15), 2) + 'rem';
                            const opacity = Math.min(0.6 + (count * 0.1), 1);
                            
                            return `
                                <button onclick="document.getElementById('tag-${tag}').scrollIntoView({behavior: 'smooth', block: 'center'})" 
                                    class="group relative px-4 py-2 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:z-10 flex items-center gap-2
                                    ${count > 5 
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'}"
                                >
                                    <span class="font-bold">#${tag}</span>
                                    <span class="${count > 5 ? 'bg-white/20 text-white' : 'bg-white dark:bg-black text-gray-500'} text-xs px-1.5 py-0.5 rounded-md min-w-[1.2em] text-center">
                                        ${count}
                                    </span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        // 2. Tag Sections (Masonry-like)
        const sectionsHtml = `
            <div class="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                ${sortedTags.map(tag => `
                    <div id="tag-${tag}" class="break-inside-avoid group bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 animate-fade-in flex flex-col">
                        <div class="p-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-neutral-900 flex justify-between items-center relative overflow-hidden">
                             <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             
                            <h4 class="font-bold text-gray-900 dark:text-white flex items-center text-lg relative z-10">
                                <span class="text-blue-500 mr-1">#</span> ${tag}
                            </h4>
                            <span class="relative z-10 text-xs font-bold bg-white dark:bg-black px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 shadow-sm">
                                ${grouped[tag].length} 篇文章
                            </span>
                        </div>
                        
                        <div class="p-3 bg-gray-50/30 dark:bg-black/20">
                            ${grouped[tag].map(post => `
                                <a href="post.html?file=${post.file}" class="flex flex-col p-3 rounded-2xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group/item border border-transparent hover:border-gray-100 dark:hover:border-gray-700 hover:shadow-md mb-2 last:mb-0">
                                    <h5 class="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 line-clamp-2 mb-1.5">
                                        ${escapeHtml(post.title)}
                                    </h5>
                                    <div class="flex items-center justify-between text-xs text-gray-400">
                                        <div class="flex items-center">
                                            <i data-lucide="clock" class="w-3 h-3 mr-1"></i>
                                            ${safeDate(post.date).toLocaleDateString()}
                                        </div>
                                        <i data-lucide="arrow-right" class="w-3 h-3 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all text-blue-500"></i>
                                    </div>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        postsContainer.innerHTML = overviewHtml + sectionsHtml;
    }

    function filterPosts() {
        const searchTerm = searchInput.value.toLowerCase();
        
        const filtered = allPosts.filter(post => {
            return post.title.toLowerCase().includes(searchTerm) || 
                   (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm));
        });
        
        renderContent(filtered);
    }

    // --- Event Listeners ---
    
    // Search
    searchInput.addEventListener('input', filterPosts);

    // View Switching
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update UI
            viewButtons.forEach(b => {
                b.classList.remove('active', 'text-blue-600', 'dark:text-blue-400', 'ring-2', 'ring-blue-500', 'shadow-sm');
                b.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
            });
            const target = e.currentTarget; // Use currentTarget to get the button, not icon
            target.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
            target.classList.add('active', 'text-blue-600', 'dark:text-blue-400', 'ring-2', 'ring-blue-500', 'shadow-sm');
            
            // Update State & Render
            currentView = target.dataset.view;
            filterPosts();
        });
    });

    // Initial load
    fetchPosts();
});
