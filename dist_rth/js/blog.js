// js/blog.js - 博客列表页面功能

// ===========================================
// 分页配置和状态
// ===========================================
const POSTS_PER_PAGE = 5; // 每页显示的文章数量
let currentPage = 1;       // 当前页码
let totalPages = 1;        // 总页数
let allPosts = [];         // 存储所有文章

// ------------------------
// 辅助函数：格式化日期为 YYYY-MM-DD HH:MM
// ------------------------
function formatDateTime(dateString) {
	try {
		const date = new Date(dateString);
		if (isNaN(date)) return '未知日期';
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day} ${hours}:${minutes}`;
	} catch (e) {
		return '未知日期';
	}
}

// ------------------------
// 异步加载博客文章
// ------------------------
async function loadBlogPosts() {
	const container = document.querySelector('.blog-list');
	const paginationContainer = document.querySelector('.pagination');
	if (!container) return;

	const TIMEOUT_MS = 10000;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

	container.innerHTML = `<div class="blog-list__loading">正在加载文章列表...</div>`;
	if (paginationContainer) paginationContainer.innerHTML = '';

	try {
		// Fix: Use correct path to posts.json (in public folder)
		const response = await fetch('public/posts/posts.json', { signal: controller.signal });
		clearTimeout(timeoutId);
		if (!response.ok) throw new Error(`无法加载文章列表 (HTTP ${response.status})`);

		allPosts = await response.json();

		// 按日期降序排序
		allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

		totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

		renderBlogList();
		renderPagination();
	} catch (error) {
		clearTimeout(timeoutId);
		console.error('加载文章列表失败:', error);

		const errorMessage = error.name === 'AbortError'
			? `加载超时 (${TIMEOUT_MS / 1000} 秒)。请检查 posts/posts.json 路径。`
			: error.message;

		container.innerHTML = `<div class="no-posts-msg"><p style="color:red;font-weight:bold;">❌ 加载文章列表失败</p><p>${errorMessage}</p><p style="margin-top:15px;"><a href="javascript:location.reload()" style="text-decoration:underline;color:var(--theme-color);">请刷新页面重试</a></p></div>`;
		if (paginationContainer) paginationContainer.innerHTML = '';
	}
}

// ------------------------
// 渲染文章列表 (根据当前视图模式)
// ------------------------
function renderBlogList() {
	const container = document.querySelector('.blog-list');
	if (!container) return;

	if (!allPosts || allPosts.length === 0) {
		container.innerHTML = `<div class="no-posts-msg text-center py-12 text-slate-400"><p>📝 正在创作精彩内容，敬请期待...</p></div>`;
		return;
	}

	// 使用当前视图模式渲染
	renderCurrentView();
}

// ------------------------
// 分页操作
// ------------------------
function goToPrevPage() {
	if (currentPage > 1) { currentPage--; updateBlogContent(); }
}
function goToNextPage() {
	if (currentPage < totalPages) { currentPage++; updateBlogContent(); }
}
function updateBlogContent() {
	renderBlogList();
	renderPagination();
	window.scrollTo(0, 0);
}

// ------------------------
// 渲染分页控件
// ------------------------
function renderPagination() {
	const container = document.querySelector('.pagination');
	if (!container || allPosts.length === 0) {
		if (container) container.innerHTML = '';
		return;
	}

	totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

	const paginationHTML = `
<div class="pagination__nav">
    <div class="pagination__btn-group">
        <button id="prevBtn" class="pagination__btn" ${currentPage === 1 ? 'disabled' : ''}>← 上一页</button>
    </div>
    <span class="pagination__info">第 ${currentPage} / ${totalPages} 页</span>
    <div class="pagination__btn-group">
        <button id="nextBtn" class="pagination__btn" ${currentPage === totalPages ? 'disabled' : ''}>下一页 →</button>
    </div>
</div>`.trim();

	container.innerHTML = paginationHTML;

	document.getElementById('prevBtn')?.addEventListener('click', goToPrevPage);
	document.getElementById('nextBtn')?.addEventListener('click', goToNextPage);
}

// ===========================================
// 视图切换功能
// ===========================================
let currentView = 'grid'; // 当前视图: grid, timeline, directory, tags

/**
 * 切换视图模式
 * @param {string} view - 视图类型: grid, timeline, directory, tags
 */
function switchView(view) {
    currentView = view;
    
    // 更新按钮状态
    document.querySelectorAll('.view-btn').forEach(btn => {
        const btnView = btn.getAttribute('data-view');
        if (btnView === view) {
            btn.classList.add('active', 'text-blue-600', 'dark:text-blue-400', 'ring-2', 'ring-blue-500');
            btn.classList.remove('text-gray-600', 'dark:text-gray-300');
        } else {
            btn.classList.remove('active', 'text-blue-600', 'dark:text-blue-400', 'ring-2', 'ring-blue-500');
            btn.classList.add('text-gray-600', 'dark:text-gray-300');
        }
    });
    
    // 渲染对应视图
    renderCurrentView();
}

/**
 * 根据当前视图模式渲染内容
 */
function renderCurrentView() {
    const container = document.querySelector('.blog-list');
    if (!container || !allPosts || allPosts.length === 0) return;
    
    container.innerHTML = '';
    
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
    
    // 重新初始化 Lucide 图标
    if (window.lucide) lucide.createIcons();
}

/**
 * 网格视图 (默认)
 */
function renderGridView(container) {
    container.className = 'blog-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const currentPosts = allPosts.slice(startIndex, endIndex);
    
    currentPosts.forEach(post => {
        const formattedDateTime = formatDateTime(post.date);
        const tagsHtml = Array.isArray(post.tags) ? post.tags.slice(0, 3).map(tag => 
            `<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-full">#${tag}</span>`
        ).join('') : '';
        
        const html = `
            <article class="group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <a href="post.html?file=${post.file}" class="block">
                    <div class="p-6">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg">${post.category || '未分类'}</span>
                            <span class="text-xs text-slate-400">${formattedDateTime}</span>
                        </div>
                        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${post.title}</h2>
                        <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">${post.excerpt || ''}</p>
                        <div class="flex flex-wrap gap-2">${tagsHtml}</div>
                    </div>
                </a>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
    
    renderPagination();
}

/**
 * 时间轴视图
 */
function renderTimelineView(container) {
    container.className = 'blog-list max-w-3xl mx-auto';
    
    // 按年月分组
    const grouped = {};
    allPosts.forEach(post => {
        const date = new Date(post.date);
        const yearMonth = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        if (!grouped[yearMonth]) grouped[yearMonth] = [];
        grouped[yearMonth].push(post);
    });
    
    let html = '<div class="relative pl-8 border-l-2 border-blue-200 dark:border-blue-900">';
    
    Object.keys(grouped).forEach(yearMonth => {
        html += `
            <div class="mb-8">
                <div class="absolute -left-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <i data-lucide="calendar" class="w-3 h-3 text-white"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4 ml-4">${yearMonth}</h3>
                <div class="space-y-3 ml-4">
        `;
        
        grouped[yearMonth].forEach(post => {
            const day = new Date(post.date).getDate();
            html += `
                <a href="post.html?file=${post.file}" class="block p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group">
                    <div class="flex items-start gap-3">
                        <span class="text-2xl font-bold text-blue-600 dark:text-blue-400 w-8">${day}</span>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">${post.title}</h4>
                            <p class="text-sm text-slate-500 truncate">${post.excerpt || ''}</p>
                        </div>
                    </div>
                </a>
            `;
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // 隐藏分页
    const paginationContainer = document.querySelector('.pagination');
    if (paginationContainer) paginationContainer.innerHTML = '';
}

/**
 * 目录视图 (按分类)
 */
function renderDirectoryView(container) {
    container.className = 'blog-list max-w-4xl mx-auto';
    
    // 按分类分组
    const categories = {};
    allPosts.forEach(post => {
        const cat = post.category || '未分类';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(post);
    });
    
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';
    
    Object.keys(categories).sort().forEach(cat => {
        const posts = categories[cat];
        html += `
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div class="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <i data-lucide="folder" class="w-5 h-5 text-blue-600 dark:text-blue-400"></i>
                    <h3 class="font-bold text-slate-900 dark:text-white">${cat}</h3>
                    <span class="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">${posts.length}</span>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800">
        `;
        
        posts.slice(0, 5).forEach(post => {
            html += `
                <a href="post.html?file=${post.file}" class="block p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <span class="text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1">${post.title}</span>
                </a>
            `;
        });
        
        if (posts.length > 5) {
            html += `<div class="p-3 text-center text-xs text-slate-400">还有 ${posts.length - 5} 篇文章...</div>`;
        }
        
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // 隐藏分页
    const paginationContainer = document.querySelector('.pagination');
    if (paginationContainer) paginationContainer.innerHTML = '';
}

/**
 * 标签视图
 */
function renderTagsView(container) {
    container.className = 'blog-list max-w-4xl mx-auto';
    
    // 收集所有标签
    const tagMap = {};
    allPosts.forEach(post => {
        (post.tags || []).forEach(tag => {
            if (!tagMap[tag]) tagMap[tag] = [];
            tagMap[tag].push(post);
        });
    });
    
    // 按文章数量排序
    const sortedTags = Object.keys(tagMap).sort((a, b) => tagMap[b].length - tagMap[a].length);
    
    let html = `
        <div class="mb-8">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <i data-lucide="tags" class="w-5 h-5 text-blue-600"></i>
                所有标签 (${sortedTags.length})
            </h3>
            <div class="flex flex-wrap gap-2">
    `;
    
    sortedTags.forEach(tag => {
        const count = tagMap[tag].length;
        const size = count > 5 ? 'text-base px-4 py-2' : count > 2 ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
        html += `
            <button onclick="filterByTag('${tag}')" class="tag-btn ${size} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                #${tag} <span class="text-slate-400 ml-1">${count}</span>
            </button>
        `;
    });
    
    html += '</div></div>';
    
    // 显示所有文章（按标签筛选后会更新）
    html += '<div id="tag-filtered-posts" class="space-y-3"></div>';
    
    container.innerHTML = html;
    
    // 隐藏分页
    const paginationContainer = document.querySelector('.pagination');
    if (paginationContainer) paginationContainer.innerHTML = '';
}

/**
 * 按标签筛选文章
 */
function filterByTag(tag) {
    const container = document.getElementById('tag-filtered-posts');
    if (!container) return;
    
    // 更新按钮状态
    document.querySelectorAll('.tag-btn').forEach(btn => {
        if (btn.textContent.includes(`#${tag}`)) {
            btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
            btn.classList.remove('bg-white', 'dark:bg-slate-900');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            btn.classList.add('bg-white', 'dark:bg-slate-900');
        }
    });
    
    const filtered = allPosts.filter(post => (post.tags || []).includes(tag));
    
    let html = `<h4 class="text-sm font-medium text-slate-500 mb-3">标签 #${tag} 下的文章 (${filtered.length})</h4>`;
    
    filtered.forEach(post => {
        html += `
            <a href="post.html?file=${post.file}" class="block p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all">
                <h4 class="font-medium text-slate-900 dark:text-white mb-1">${post.title}</h4>
                <p class="text-sm text-slate-500 line-clamp-1">${post.excerpt || ''}</p>
            </a>
        `;
    });
    
    container.innerHTML = html;
}

// 暴露到全局
window.switchView = switchView;
window.filterByTag = filterByTag;

// ------------------------
// 初始化页面
// ------------------------
function initBlogPage() {
	loadBlogPosts();

    // 设置视图切换按钮事件
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            if (view) switchView(view);
        });
    });

    const navToggle = document.getElementById("navToggle");
    const navMenu = document.querySelector(".navbar__menu");

	if (navToggle && navMenu) {
		const newNavToggle = navToggle.cloneNode(true);
		navToggle.replaceWith(newNavToggle);

        newNavToggle.addEventListener("click", () => navMenu.classList.toggle("active"));

		navMenu.querySelectorAll('a').forEach(link => {
			link.addEventListener('click', () => {
				if (window.innerWidth <= 768) navMenu.classList.remove('active');
			});
		});
	}
}

document.addEventListener('DOMContentLoaded', initBlogPage);

