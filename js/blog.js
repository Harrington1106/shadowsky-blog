// js/blog.js - 博客列表页面功能
// 视觉升级版 v3.0 - ShadowSky Theme Enhanced

// ===========================================
// 分页配置和状态
// ===========================================
let currentCategory = 'all';
const POSTS_PER_PAGE = 9;
let currentPage = 1;
let totalPages = 1;
let allPosts = [];
let filteredPosts = [];

// ------------------------
// 辅助函数：格式化日期
// ------------------------
function formatDateTime(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return '未知日期';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return '未知日期';
    }
}

// ------------------------
// 异步加载博客文章
// ------------------------
async function loadBlogPosts() {
    const container = document.getElementById('posts-container');
    const paginationContainer = document.getElementById('pagination-container');
    if (!container) return;

    const TIMEOUT_MS = 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p class="text-sm text-gray-500 animate-pulse font-mono">正在加载星空笔记...</p>
        </div>
    `;
    if (paginationContainer) paginationContainer.innerHTML = '';

    try {
        const response = await fetch('public/posts/posts.json', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        allPosts = await response.json();

        // 按日期降序排序
        allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 更新统计数据
        updateStats();

        // 初始渲染
        filteredPosts = allPosts;
        totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

        renderCurrentView();
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Load failed:', error);
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <div class="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                    <i data-lucide="alert-circle" class="w-10 h-10 text-red-500"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">数据加载失败</h3>
                <p class="text-gray-500 mb-6">${error.message}</p>
                <button onclick="location.reload()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50">
                    重新加载
                </button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

// ------------------------
// 更新统计数据
// ------------------------
function updateStats() {
    // 文章数量
    const postCountEl = document.getElementById('post-count');
    if (postCountEl) {
        postCountEl.textContent = allPosts.length;
        animateNumber(postCountEl, 0, allPosts.length, 1000);
    }

    // 标签数量
    const tagSet = new Set();
    allPosts.forEach(post => {
        (post.tags || []).forEach(tag => tagSet.add(tag));
    });
    const tagCountEl = document.getElementById('tag-count');
    if (tagCountEl) {
        animateNumber(tagCountEl, 0, tagSet.size, 1000);
    }

    // 分类数量
    const categorySet = new Set();
    allPosts.forEach(post => {
        categorySet.add(post.category || '未分类');
    });
    const categoryCountEl = document.getElementById('category-count');
    if (categoryCountEl) {
        animateNumber(categoryCountEl, 0, categorySet.size, 1000);
    }
}

// ------------------------
// 数字动画
// ------------------------
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * easeProgress);
        element.textContent = current;
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// ===========================================
// 视图切换功能
// ===========================================
let currentView = 'grid';

function switchView(view) {
    currentView = view;
    currentPage = 1;

    // 更新按钮状态
    document.querySelectorAll('.view-btn').forEach(btn => {
        const btnView = btn.getAttribute('data-view');
        if (btnView === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 渲染对应视图
    const container = document.getElementById('posts-container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';

    setTimeout(() => {
        renderCurrentView();
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 200);
}

function renderCurrentView() {
    const container = document.getElementById('posts-container');
    if (!container || !allPosts) return;

    container.innerHTML = '';

    // 过滤逻辑
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    if (searchTerm) {
        filteredPosts = allPosts.filter(post => {
            const titleMatch = (post.title || '').toLowerCase().includes(searchTerm);
            const excerptMatch = (post.excerpt || '').toLowerCase().includes(searchTerm);
            const tagMatch = (post.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
            return titleMatch || excerptMatch || tagMatch;
        });
    } else if (currentCategory !== 'all') {
        filteredPosts = allPosts.filter(post => (post.category || '未分类') === currentCategory);
    } else {
        filteredPosts = allPosts;
    }

    totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

    switch (currentView) {
        case 'grid':
            renderGridView(container);
            break;
        case 'timeline':
            renderTimelineView(container);
            break;
        case 'directory':
            renderDirectoryView(container);
            break;
        case 'tags':
            renderTagsView(container);
            break;
        default:
            renderGridView(container);
    }

    if (window.lucide) lucide.createIcons();
}

// ------------------------
// 1. 网格视图 (增强版)
// ------------------------
function renderGridView(container) {
    if (filteredPosts.length === 0) {
        renderEmptyState(container);
        return;
    }

    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8';

    // 分页计算
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const currentPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

    currentPosts.forEach((post, index) => {
        const dateStr = formatDateTime(post.date);
        const delay = index * 100;

        // 动态封面生成
        const gradients = [
            'from-blue-600 via-indigo-600 to-purple-600',
            'from-emerald-500 via-teal-600 to-cyan-600',
            'from-rose-500 via-pink-600 to-orange-500',
            'from-amber-500 via-yellow-600 to-orange-500',
            'from-fuchsia-600 via-purple-600 to-pink-600',
            'from-cyan-500 via-blue-600 to-indigo-600'
        ];
        const gradient = gradients[index % gradients.length];

        const coverHtml = post.coverImage
            ? `<div class="h-52 w-full overflow-hidden relative">
                 <img src="${post.coverImage}" alt="${post.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                 <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               </div>`
            : `<div class="h-52 w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden">
                 <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50"></div>
                 <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                 <i data-lucide="file-text" class="w-16 h-16 text-white/70 drop-shadow-lg transform transition-transform duration-500 group-hover:scale-110"></i>
               </div>`;


        const html = `
            <article class="group relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden card-hover hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-900/20 flex flex-col h-full animate-fade-in-up" style="animation-delay: ${delay}ms">
                <a href="post.html?file=${post.file}" class="block flex-1 flex flex-col h-full">
                    ${coverHtml}
                    <div class="p-6 flex flex-col flex-1">
                        <div class="mb-4">
                            <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                                ${post.category || '笔记'}
                            </span>
                        </div>

                        <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                            ${post.title}
                        </h2>

                        <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                            ${post.excerpt || '暂无摘要...'}
                        </p>

                        <div class="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div class="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                                <span class="flex items-center gap-1"><i data-lucide="calendar-days" class="w-3.5 h-3.5"></i> ${dateStr}</span>
                                <span class="flex items-center gap-1"><i data-lucide="tag" class="w-3.5 h-3.5"></i> ${(post.tags || []).length}</span>
                            </div>
                            <div class="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <i data-lucide="arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-0.5"></i>
                            </div>
                        </div>
                    </div>
                </a>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    renderPagination();
}

// ------------------------
// 2. 时间轴视图
// ------------------------
function renderTimelineView(container) {
    if (filteredPosts.length === 0) {
        renderEmptyState(container);
        return;
    }

    container.className = 'max-w-4xl mx-auto px-4';

    // 数据分组
    const grouped = {};
    filteredPosts.forEach(post => {
        const d = new Date(post.date);
        const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(post);
    });

    let html = `<div class="relative pl-8 border-l-2 border-gray-200 dark:border-gray-800 space-y-16 my-8">`;

    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach((key, idx) => {
        const year = key.split('.')[0];
        const month = key.split('.')[1];

        html += `
            <div class="relative animate-fade-in-up" style="animation-delay: ${idx * 150}ms">
                <div class="absolute -left-[41px] top-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full z-10 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                    <i data-lucide="calendar" class="w-4 h-4 text-white"></i>
                </div>
                <h3 class="text-4xl font-black text-gray-200 dark:text-gray-800 absolute -top-2 -left-4 -z-10 select-none opacity-30 scale-125 origin-top-left">${year}</h3>
                <div class="flex items-baseline gap-4 mb-6">
                    <h4 class="text-2xl font-bold text-gray-800 dark:text-gray-100 font-mono">${year}.${month}</h4>
                    <span class="text-xs px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium border border-blue-100 dark:border-blue-800">${grouped[key].length} 篇</span>
                </div>
                <div class="space-y-4">
        `;

        grouped[key].forEach((post, pIdx) => {
            const day = new Date(post.date).getDate();
            html += `
                <a href="post.html?file=${post.file}" class="group block relative pl-6 transition-all hover:pl-8 animate-fade-in" style="animation-delay: ${pIdx * 50}ms">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm hover:shadow-lg transition-all">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h5 class="font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">${post.title}</h5>
                                <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">${post.excerpt || '暂无描述'}</p>
                            </div>
                            <span class="text-sm font-mono text-gray-400 whitespace-nowrap ml-4 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">${day}日</span>
                        </div>
                    </div>
                </a>
            `;
        });

        html += `   </div>
            </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

    // 隐藏分页
    const pag = document.getElementById('pagination-container');
    if (pag) pag.innerHTML = '';
}

// ------------------------
// 3. 目录视图 (IDE 风格)
// ------------------------
function renderDirectoryView(container) {
    if (filteredPosts.length === 0) {
        renderEmptyState(container);
        return;
    }

    container.className = 'max-w-3xl mx-auto';

    const categories = {};
    filteredPosts.forEach(post => {
        const c = post.category || '未分类';
        if (!categories[c]) categories[c] = [];
        categories[c].push(post);
    });

    let html = `
        <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-2xl animate-fade-in-up font-mono text-sm">
            <!-- Header -->
            <div class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#252526] dark:to-[#2d2d2d] px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-[#333]">
                <div class="flex gap-2">
                    <div class="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
                    <div class="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
                    <div class="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 font-medium">PROJECT: SHADOWSKY</div>
            </div>

            <!-- Content -->
            <div class="p-3 dark:text-gray-300">
                <div class="pl-2 py-1 flex items-center gap-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-[#2a2d2e] rounded cursor-default transition-colors">
                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                    <i data-lucide="folder-open" class="w-4 h-4 text-blue-500"></i>
                    <span class="font-semibold">src</span>
                </div>
    `;

    Object.keys(categories).sort().forEach((cat, idx) => {
        const catColor = ['blue', 'purple', 'green', 'orange', 'pink', 'cyan'][idx % 6];
        html += `
            <div class="ml-4 animate-fade-in" style="animation-delay: ${idx * 50}ms">
                <details open class="group">
                    <summary class="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-[#2a2d2e] cursor-pointer select-none transition-colors">
                        <i data-lucide="folder" class="w-4 h-4 text-${catColor}-500 group-open:hidden"></i>
                        <i data-lucide="folder-open" class="w-4 h-4 text-${catColor}-500 hidden group-open:block"></i>
                        <span class="${cat === '未分类' ? 'italic opacity-70' : 'font-medium'}">${cat}</span>
                        <span class="text-xs text-gray-400 ml-1">(${categories[cat].length})</span>
                    </summary>
                    <div class="ml-4 border-l-2 border-gray-200 dark:border-[#444] pl-3 mt-1 space-y-1">
        `;

        categories[cat].forEach((post, pIdx) => {
            html += `
                <a href="post.html?file=${post.file}" class="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-blue-50 dark:hover:bg-[#094771] group/file transition-colors">
                    <i data-lucide="file-code" class="w-4 h-4 text-gray-400 group-hover/file:text-blue-400"></i>
                    <span class="truncate flex-1 hover:underline decoration-blue-500/30">${post.title}</span>
                    <span class="text-xs text-gray-400 opacity-60">${formatDateTime(post.date)}</span>
                </a>
            `;
        });

        html += `   </div>
                </details>
            </div>
        `;
    });

    html += `
            </div>
            <!-- Footer -->
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-xs flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <i data-lucide="git-branch" class="w-3 h-3"></i>
                    <span>master*</span>
                </div>
                <span>Ln ${filteredPosts.length}, Col 1</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
    const pag = document.getElementById('pagination-container');
    if (pag) pag.innerHTML = '';
}

// ------------------------
// 4. 标签视图
// ------------------------
function renderTagsView(container) {
    container.className = 'max-w-5xl mx-auto';

    const tagMap = {};
    filteredPosts.forEach(post => {
        (post.tags || []).forEach(t => {
            if (!tagMap[t]) tagMap[t] = [];
            tagMap[t].push(post);
        });
    });

    const tags = Object.keys(tagMap).sort((a, b) => tagMap[b].length - tagMap[a].length);

    if (tags.length === 0) {
        renderEmptyState(container);
        return;
    }

    let html = `
        <div class="text-center mb-10 animate-fade-in">
            <p class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                <i data-lucide="sparkles" class="w-3 h-3"></i>
                标签知识图谱
            </p>
            <h2 class="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
                通过标签探索内容
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
                点击标签查看相关文章
            </p>
        </div>

        <div class="relative max-w-4xl mx-auto mb-10">
            <div class="pointer-events-none absolute -inset-1 rounded-[32px] bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-pink-500/20 blur-2xl opacity-60"></div>
            <div class="relative flex flex-wrap justify-center gap-3 p-6 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xl backdrop-blur">
    `;

    tags.forEach((tag, idx) => {
        const count = tagMap[tag].length;
        const size = count > 5 ? 'text-base px-5 py-2.5' : count > 2 ? 'text-sm px-4 py-2' : 'text-xs px-3 py-1.5';
        const weight = count > 5 ? 'font-semibold' : 'font-medium';
        const delay = idx * 30;

        // 动态颜色
        const colors = [
            'from-blue-500 to-blue-600',
            'from-purple-500 to-purple-600',
            'from-pink-500 to-rose-500',
            'from-emerald-500 to-teal-500',
            'from-orange-500 to-amber-500',
            'from-indigo-500 to-violet-500'
        ];
        const colorClass = colors[idx % colors.length];

        const isLarge = count > 5;
        const bgClass = isLarge
            ? `bg-gradient-to-r ${colorClass} text-white shadow-lg`
            : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700';

        html += `
            <button onclick="filterByTag('${tag}')" data-tag="${tag}"
                class="tag-btn group relative inline-flex items-center ${size} ${weight} rounded-full border border-gray-200 dark:border-gray-700 ${bgClass} hover:shadow-lg hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style="animation: fadeIn 0.5s ease-out ${delay}ms backwards;">
                <span class="relative flex items-center gap-2">
                    <span>#${tag}</span>
                    <span class="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] rounded-full ${isLarge ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}">
                        ${count}
                    </span>
                </span>
            </button>
        `;
    });

    html += `
            </div>
        </div>
        <div id="tag-results" class="min-h-[200px]">
            <div class="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
                <i data-lucide="mouse-pointer-2" class="w-12 h-12 mb-3 opacity-50"></i>
                <p class="text-sm font-medium">点击上方标签探索相关内容</p>
            </div>
        </div>
    `;

    container.innerHTML = html;
    const pag = document.getElementById('pagination-container');
    if (pag) pag.innerHTML = '';

    // 自动选择第一个标签
    if (tags.length > 0) {
        setTimeout(() => {
            filterByTag(tags[0], false);
        }, 100);
    }
}

// ------------------------
// 标签过滤逻辑
// ------------------------
function filterByTag(tag, scrollTo = true) {
    const resultContainer = document.getElementById('tag-results');
    if (!resultContainer) return;

    const tagButtons = document.querySelectorAll('.tag-btn');
    tagButtons.forEach(btn => {
        const isActive = btn.getAttribute('data-tag') === tag;
        if (isActive) {
            btn.classList.add('ring-2', 'ring-blue-500', 'scale-105');
        } else {
            btn.classList.remove('ring-2', 'ring-blue-500', 'scale-105');
        }
    });

    const filtered = allPosts.filter(p => (p.tags || []).includes(tag));

    let html = `
        <div class="flex flex-wrap items-center gap-3 mb-6 animate-fade-in">
            <span class="h-px w-8 bg-gradient-to-r from-blue-500 to-purple-500"></span>
            <h3 class="text-xl font-bold text-gray-800 dark:text-white">
                <span class="text-blue-500">#${tag}</span> 相关笔记
                <span class="text-sm text-gray-500 font-normal ml-2">(${filtered.length} 篇)</span>
            </h3>
            <span class="flex-1 h-px bg-gray-200 dark:bg-gray-800"></span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;

    filtered.forEach((post, idx) => {
        html += `
            <a href="post.html?file=${post.file}" class="group block bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 animate-fade-in-up" style="animation-delay: ${idx * 50}ms">
                <div class="flex items-start justify-between mb-3">
                    <span class="text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">${post.date.split('T')[0]}</span>
                    <i data-lucide="arrow-up-right" class="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors"></i>
                </div>
                <h4 class="font-bold text-base text-gray-800 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">${post.title}</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">${post.excerpt || ''}</p>
            </a>
        `;
    });

    html += `</div>`;
    resultContainer.innerHTML = html;

    if (scrollTo) {
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (window.lucide) lucide.createIcons();
}

// ------------------------
// 空状态
// ------------------------
function renderEmptyState(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
            <div class="w-24 h-24 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6">
                <i data-lucide="file-x" class="w-12 h-12 text-gray-300 dark:text-gray-600"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">暂无内容</h3>
            <p class="text-gray-500 mb-6">没有找到符合条件的笔记</p>
            <button onclick="resetFilters()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-lg shadow-blue-500/30">
                重置筛选
            </button>
        </div>
    `;
    if (window.lucide) lucide.createIcons();

    const pag = document.getElementById('pagination-container');
    if (pag) pag.innerHTML = '';
}

// ------------------------
// 重置筛选
// ------------------------
function resetFilters() {
    currentCategory = 'all';
    currentPage = 1;
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    renderCurrentView();
}

// ------------------------
// 分页
// ------------------------
function renderPagination() {
    const container = document.getElementById('pagination-container');
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    let html = `
        <div class="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-800">
            <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''} class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <i data-lucide="chevron-left" class="w-5 h-5"></i>
            </button>
    `;

    // 页码
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="goToPage(1)" class="w-10 h-10 flex items-center justify-center rounded-full text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">1</button>`;
        if (startPage > 2) {
            html += `<span class="px-2 text-gray-400">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button onclick="goToPage(${i})" class="w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all ${isActive ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="px-2 text-gray-400">...</span>`;
        }
        html += `<button onclick="goToPage(${totalPages})" class="w-10 h-10 flex items-center justify-center rounded-full text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">${totalPages}</button>`;
    }

    html += `
            <button onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''} class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <i data-lucide="chevron-right" class="w-5 h-5"></i>
            </button>
        </div>
    `;

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        goToPage(newPage);
    }
}

function goToPage(page) {
    currentPage = page;
    renderCurrentView();
    document.getElementById('posts-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ------------------------
// 搜索功能
// ------------------------
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentPage = 1;
            renderCurrentView();
        }, 300);
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

// Global Exports
window.switchView = switchView;
window.filterByTag = filterByTag;
window.changePage = changePage;
window.goToPage = goToPage;
window.resetFilters = resetFilters;

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadBlogPosts();
    setupSearch();

    // 设置默认视图
    document.querySelectorAll('.view-btn').forEach(btn => {
        const view = btn.getAttribute('data-view');
        if (view === currentView) {
            btn.classList.add('active');
        }
        btn.addEventListener('click', () => {
            switchView(view);
        });
    });
});
