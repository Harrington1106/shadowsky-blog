// js/blog.js - 博客列表页面功能
// Liquid Glass v4 — Apple 液态玻璃风格

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
        <div class="blog-loader">
            <div class="loader-spinner"></div>
            <p class="loader-text">正在加载星空笔记...</p>
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
            <div class="flex flex-col items-center justify-center py-20 fade-in">
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
    const postCountEl = document.getElementById('post-count');
    if (postCountEl) {
        postCountEl.textContent = allPosts.length;
        animateNumber(postCountEl, 0, allPosts.length, 1000);
    }

    const tagSet = new Set();
    allPosts.forEach(post => {
        (post.tags || []).forEach(tag => tagSet.add(tag));
    });
    const tagCountEl = document.getElementById('tag-count');
    if (tagCountEl) {
        animateNumber(tagCountEl, 0, tagSet.size, 1000);
    }

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

    // 更新按钮状态 & data-active
    const switcher = document.querySelector('.view-switcher');
    document.querySelectorAll('.view-btn').forEach((btn, idx) => {
        const btnView = btn.getAttribute('data-view');
        if (btnView === view) {
            btn.classList.add('active');
            if (switcher) switcher.setAttribute('data-active', idx);
        } else {
            btn.classList.remove('active');
        }
    });

    // 过渡动画
    const container = document.getElementById('posts-container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';
    container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

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
// 1. 网格视图 — 完全重构卡片
// ------------------------
function renderGridView(container) {
    if (filteredPosts.length === 0) {
        renderEmptyState(container);
        return;
    }

    container.className = 'posts-grid';

    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const currentPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

    // 无封面渐变
    const gradients = [
        'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
        'linear-gradient(135deg, #059669 0%, #0d9488 50%, #06b6d4 100%)',
        'linear-gradient(135deg, #e11d48 0%, #db2777 50%, #f97316 100%)',
        'linear-gradient(135deg, #d97706 0%, #eab308 50%, #f97316 100%)',
        'linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #ec4899 100%)',
        'linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #4f46e5 100%)'
    ];

    currentPosts.forEach((post, index) => {
        const dateStr = formatDateTime(post.date);
        const delay = index * 80;
        const gradient = gradients[index % gradients.length];

        // 标签列表（最多 3 个）
        const tags = post.tags || [];
        const tagsHtml = tags.slice(0, 3).map(t =>
            `<span class="blog-card-tag">#${t}</span>`
        ).join('');

        // 封面区域 — 徽章浮在封面内部
        const coverHtml = post.coverImage
            ? `<div class="blog-card-media">
                 <img src="/api/image-proxy?url=${encodeURIComponent(post.coverImage)}" alt="" loading="lazy" class="blog-card-img" />
                 <div class="blog-card-media-shade"></div>
                 <span class="blog-card-badge">
                   <i data-lucide="folder"></i>
                   <span>${post.category || '笔记'}</span>
                 </span>
               </div>`
            : `<div class="blog-card-media blog-card-media--placeholder" style="background:${gradient}">
                 <i data-lucide="file-text" class="blog-card-placeholder-icon"></i>
                 <span class="blog-card-badge">
                   <i data-lucide="folder"></i>
                   <span>${post.category || '笔记'}</span>
                 </span>
               </div>`;

        const html = `
            <article class="blog-card animate-in" style="animation-delay:${delay}ms" data-file="${post.file}" data-title="${post.title.replace(/"/g, '&quot;')}">
                <a href="post.html?file=${encodeURIComponent(post.file)}" class="blog-card-link">
                    ${coverHtml}
                    <div class="blog-card-body">
                        <h2 class="blog-card-title">${post.title}</h2>
                        <p class="blog-card-excerpt">${post.excerpt || '暂无摘要...'}</p>
                    </div>
                    <div class="blog-card-footer">
                        <time datetime="${post.date}">${dateStr}</time>
                        ${tagsHtml ? '<span class="footer-dot-sep">·</span>' + tagsHtml : ''}
                        <span class="footer-spacer"></span>
                        <span class="footer-arrow">
                            <i data-lucide="arrow-right"></i>
                        </span>
                    </div>
                </a>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    renderPagination();
}

// ------------------------
// 2. 时间轴视图 — 液态玻璃
// ------------------------
function renderTimelineView(container) {
    if (filteredPosts.length === 0) {
        renderEmptyState(container);
        return;
    }

    container.className = 'timeline-container';

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
            <div class="relative fade-in-up" style="animation-delay: ${idx * 150}ms">
                <div class="absolute -left-[41px] top-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full z-10 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                    <i data-lucide="calendar" class="w-4 h-4 text-white"></i>
                </div>
                <div class="flex items-baseline gap-4 mb-6">
                    <h4 class="text-2xl font-bold text-gray-800 dark:text-gray-100 font-mono">${year}.${month}</h4>
                    <span class="text-xs px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium border border-blue-100 dark:border-blue-800">${grouped[key].length} 篇</span>
                </div>
                <div class="space-y-4">
        `;

        grouped[key].forEach((post, pIdx) => {
            const day = new Date(post.date).getDate();
            html += `
                <a href="post.html?file=${post.file}" class="group block relative fade-in" style="animation-delay: ${pIdx * 50}ms">
                    <div class="timeline-card">
                        <span class="timeline-day">${day}</span>
                        <div class="timeline-content">
                            <div class="timeline-title">${post.title}</div>
                            <div class="timeline-excerpt">${post.excerpt || '暂无描述'}</div>
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

    const pag = document.getElementById('pagination-container');
    if (pag) pag.innerHTML = '';
}

// ------------------------
// 3. 目录视图 — 液态玻璃文件夹
// ------------------------
function renderDirectoryView(container) {
    if (filteredPosts.length === 0) {
        renderEmptyState(container);
        return;
    }

    container.className = 'dir-container';

    const categories = {};
    filteredPosts.forEach(post => {
        const c = post.category || '未分类';
        if (!categories[c]) categories[c] = [];
        categories[c].push(post);
    });

    let html = `<div class="space-y-3 fade-in-up">`;

    // Header
    html += `
        <div class="flex items-center justify-between px-4 py-3 mb-2">
            <div class="flex gap-2">
                <div class="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
                <div class="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div>
            </div>
            <div class="text-xs font-mono opacity-50">PROJECT: SHADOWSKY</div>
        </div>
    `;

    Object.keys(categories).sort().forEach((cat, idx) => {
        const catIcons = ['folder', 'folder', 'folder', 'folder', 'folder', 'folder'];
        html += `
            <div class="dir-folder fade-in" style="animation-delay:${idx * 60}ms">
                <details open>
                    <summary>
                        <i data-lucide="folder" style="width:18px;height:18px;color:var(--color-primary);"></i>
                        <span>${cat}</span>
                        <span style="font-size:var(--text-xs);opacity:0.5;margin-left:auto;">${categories[cat].length} 篇</span>
                    </summary>
        `;

        categories[cat].forEach((post) => {
            html += `
                <a href="post.html?file=${post.file}" class="dir-file">
                    <i data-lucide="file-code"></i>
                    <span class="dir-file-name">${post.title}</span>
                    <span class="dir-file-date">${formatDateTime(post.date)}</span>
                </a>
            `;
        });

        html += `   </details>
            </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

    const pag = document.getElementById('pagination-container');
    if (pag) pag.innerHTML = '';
}

// ------------------------
// 4. 标签视图 — 液态玻璃标签云
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
        <div class="text-center mb-10 fade-in">
            <p class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                <i data-lucide="sparkles" style="width:12px;height:12px;"></i>
                标签知识图谱
            </p>
            <h2 class="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
                通过标签探索内容
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
                点击标签查看相关文章
            </p>
        </div>

        <div class="tags-cloud">
    `;

    tags.forEach((tag, idx) => {
        const count = tagMap[tag].length;
        const delay = idx * 30;
        const isLarge = count > 5;
        const fontSize = count > 5 ? 'var(--text-base)' : count > 2 ? 'var(--text-sm)' : 'var(--text-xs)';

        html += `
            <button onclick="filterByTag('${tag.replace(/'/g, "\\'")}')" data-tag="${tag.replace(/'/g, "\\'")}"
                class="tag-btn fade-in"
                style="animation-delay:${delay}ms;font-size:${fontSize};">
                <span>#${tag}</span>
                <span class="tag-count">${count}</span>
            </button>
        `;
    });

    html += `
        </div>
        <div id="tag-results" class="min-h-[200px]">
            <div class="tag-results-placeholder">
                <i data-lucide="mouse-pointer-2"></i>
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

    // 更新标签按钮状态
    const tagButtons = document.querySelectorAll('.tag-btn');
    tagButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tag') === tag);
    });

    const filtered = allPosts.filter(p => (p.tags || []).includes(tag));

    let html = `
        <div class="flex flex-wrap items-center gap-3 mb-6 fade-in">
            <span class="h-px w-8 bg-gradient-to-r from-blue-500 to-purple-500"></span>
            <h3 class="text-xl font-bold text-gray-800 dark:text-white">
                <span style="color:var(--color-primary);">#${tag}</span> 相关笔记
                <span class="text-sm text-gray-500 font-normal ml-2">(${filtered.length} 篇)</span>
            </h3>
            <span class="flex-1 h-px bg-gray-200 dark:bg-gray-800"></span>
        </div>
        <div class="tag-results-list">
    `;

    filtered.forEach((post, idx) => {
        html += `
            <a href="post.html?file=${post.file}" class="tag-result-card fade-in-up" style="animation-delay:${idx * 50}ms;text-decoration:none;">
                <span class="tag-result-date">${post.date.split('T')[0]}</span>
                <span class="tag-result-title">${post.title}</span>
                <i data-lucide="arrow-up-right" class="tag-result-arrow"></i>
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
        <div class="flex flex-col items-center justify-center py-20 fade-in">
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
// 分页 — 液态玻璃药丸
// ------------------------
function renderPagination() {
    const container = document.getElementById('pagination-container');
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    let html = `<div class="blog-pagination">`;

    // 左箭头
    html += `
        <button onclick="changePage(-1)" class="blog-page-btn" ${currentPage === 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" style="width:18px;height:18px;"></i>
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
        html += `<button onclick="goToPage(1)" class="blog-page-btn">1</button>`;
        if (startPage > 2) {
            html += `<span class="blog-page-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button onclick="goToPage(${i})" class="blog-page-btn${isActive ? ' active' : ''}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="blog-page-ellipsis">...</span>`;
        }
        html += `<button onclick="goToPage(${totalPages})" class="blog-page-btn">${totalPages}</button>`;
    }

    // 右箭头
    html += `
        <button onclick="changePage(1)" class="blog-page-btn" ${currentPage === totalPages ? 'disabled' : ''}>
            <i data-lucide="chevron-right" style="width:18px;height:18px;"></i>
        </button>
    `;

    html += `</div>`;
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

    // 视图切换按钮事件
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            switchView(view);
        });
    });
});
