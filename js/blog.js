// js/blog.js - 博客列表页面功能
// 视觉升级版 v2.0 - ShadowSky Theme

// ===========================================
// 分页配置和状态
// ===========================================
let currentCategory = 'all';
const POSTS_PER_PAGE = 6; // 增加每页显示数量，适应大屏幕
let currentPage = 1;       // 当前页码
let totalPages = 1;        // 总页数
let allPosts = [];         // 存储所有文章

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
	const container = document.querySelector('.blog-list');
	const paginationContainer = document.querySelector('.pagination');
	if (!container) return;

	const TIMEOUT_MS = 10000;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

	container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20 text-blue-500">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-current mb-4"></div>
            <p class="text-sm font-mono animate-pulse">Downloading interstellar data...</p>
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

		totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

		// renderCategories();
		renderCurrentView(); // 使用当前视图渲染
	} catch (error) {
		clearTimeout(timeoutId);
		console.error('Load failed:', error);
		container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-red-500 text-5xl mb-4">⚠️</div>
                <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">数据链路中断</h3>
                <p class="text-slate-500 mb-6">${error.message}</p>
                <button onclick="location.reload()" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-lg shadow-blue-500/30">
                    重试连接
                </button>
            </div>`;
	}
}

// ===========================================
// 视图切换功能
// ===========================================
let currentView = 'grid'; // grid, timeline, directory, tags

function switchView(view) {
    currentView = view;
    
    // 更新按钮状态
    document.querySelectorAll('.view-btn').forEach(btn => {
        const btnView = btn.getAttribute('data-view');
        if (btnView === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 关键逻辑：在非网格视图下隐藏顶部的一级分类过滤器，避免功能冗余
    /* Removed category filters logic as requested */
    
    // 渲染对应视图
    const container = document.querySelector('.blog-list');
    container.style.opacity = '0';
    setTimeout(() => {
        renderCurrentView(true);
        container.style.opacity = '1';
    }, 200);
}

function renderCurrentView(shouldScroll = false) {
    const container = document.querySelector('.blog-list');
    if (!container || !allPosts) return;
    
    container.innerHTML = '';
    
    // 重置容器类名，根据视图设置不同的布局类
    container.className = 'blog-list transition-opacity duration-300 min-h-[50vh]';
    
    switch (currentView) {
        case 'grid':
            container.classList.add('grid', 'gap-4', 'sm:gap-6', 'lg:gap-8', 'md:grid-cols-2', 'lg:grid-cols-3');
            renderGridView(container);
            break;
        case 'timeline':
            container.classList.add('max-w-4xl', 'mx-auto');
            renderTimelineView(container);
            break;
        case 'directory':
            container.classList.add('max-w-4xl', 'mx-auto');
            renderDirectoryView(container);
            break;
        case 'tags':
            // Tags view usually handles its own internal layout, so we just give it full width
            renderTagsView(container);
            break;
        default:
            container.classList.add('grid', 'gap-4', 'sm:gap-6', 'lg:gap-8', 'md:grid-cols-2', 'lg:grid-cols-3');
            renderGridView(container);
    }
    
    if (window.lucide) lucide.createIcons();
}

// ------------------------
// 1. 网格视图 (增强版)
// ------------------------
function renderGridView(container) {
    container.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6', 'lg:gap-8');
    
    // 过滤逻辑
    let filteredPosts = allPosts;
    if (currentCategory !== 'all') {
        filteredPosts = allPosts.filter(post => (post.category || 'Uncategorized') === currentCategory);
    }

    if (filteredPosts.length === 0) {
        renderEmptyState(container);
        return;
    }

    // 分页计算
    totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const currentPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
    
    currentPosts.forEach((post, index) => {
        const dateStr = formatDateTime(post.date);
        
        // 动态封面生成 (如果没有封面图)
        const gradients = [
            'from-blue-600 to-violet-600',
            'from-emerald-500 to-teal-600',
            'from-rose-500 to-orange-500',
            'from-amber-500 to-yellow-600',
            'from-fuchsia-600 to-pink-600',
            'from-cyan-500 to-blue-600'
        ];
        const gradient = gradients[index % gradients.length];
        
        const coverHtml = post.coverImage 
            ? `<div class="h-48 w-full overflow-hidden relative">
                 <img src="${post.coverImage}" alt="${post.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                 <div class="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500"></div>
               </div>`
            : `<div class="h-48 w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden">
                 <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30"></div>
                 <i data-lucide="sparkles" class="w-12 h-12 text-white/80 drop-shadow-lg transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-125"></i>
               </div>`;

        const tagsHtml = (post.tags || []).slice(0, 3).map(tag => 
            `<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[10px] rounded-md border border-slate-200 dark:border-slate-700/50">${tag}</span>`
        ).join('');

        const html = `
            <article class="group relative bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-900/20 transition-all duration-300 hover:-translate-y-2 flex flex-col h-full animate-fade-in-up" style="animation-delay: ${index * 100}ms">
                <a href="post.html?file=${post.file}" class="block flex-1 flex flex-col h-full">
                    ${coverHtml}
                    <div class="p-5 flex flex-col flex-1">
                        <div class="flex items-center justify-between mb-3">
                            <span class="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-500/30 shadow-sm shadow-blue-500/10">
                                ${post.category || 'Note'}
                            </span>
                            <span class="text-xs text-slate-400 font-mono flex items-center gap-1">
                                <i data-lucide="calendar-clock" class="w-3 h-3"></i> ${dateStr}
                            </span>
                        </div>
                        
                        <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 dark:group-hover:from-blue-400 dark:group-hover:to-purple-400 transition-all">
                            ${post.title}
                        </h2>
                        
                        <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 flex-1 leading-relaxed opacity-90">
                            ${post.excerpt || '暂无摘要...'}
                        </p>
                        
                        <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                             <div class="flex gap-2 flex-wrap">${tagsHtml}</div>
                             <div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-blue-500/50">
                                <i data-lucide="arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-0.5"></i>
                             </div>
                        </div>
                    </div>
                </a>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
    
    renderPagination(filteredPosts.length);
}

// ------------------------
// 2. 时间轴视图 (极简科技风)
// ------------------------
function renderTimelineView(container) {
    container.classList.add('max-w-4xl', 'mx-auto', 'px-4');
    
    // 数据分组
    const grouped = {};
    allPosts.forEach(post => {
        const d = new Date(post.date);
        const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(post);
    });
    
    let html = `<div class="relative pl-8 border-l-2 border-slate-200 dark:border-slate-800 space-y-12 my-8">`;
    
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach((key, idx) => {
        html += `
            <div class="relative animate-fade-in-up" style="animation-delay: ${idx * 150}ms">
                <div class="absolute -left-[41px] top-0 w-6 h-6 bg-white dark:bg-black border-4 border-blue-500 rounded-full z-10 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                <h3 class="text-3xl font-black text-slate-200 dark:text-slate-800 absolute -top-4 -left-6 -z-10 select-none opacity-50 scale-150 origin-top-left">${key.split('.')[0]}</h3>
                <div class="flex items-baseline gap-4 mb-6">
                    <h4 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-mono">${key}</h4>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">${grouped[key].length} posts</span>
                </div>
                <div class="space-y-4">
        `;
        
        grouped[key].forEach((post, pIdx) => {
            html += `
                <a href="post.html?file=${post.file}" class="group block relative pl-6 transition-all hover:pl-8">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-800 to-transparent group-hover:via-blue-500 transition-colors"></div>
                    <div class="bg-white dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/30 shadow-sm hover:shadow-md transition-all">
                        <div class="flex justify-between items-start">
                            <div>
                                <h5 class="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${post.title}</h5>
                                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">${post.excerpt || 'No description'}</p>
                            </div>
                            <span class="text-xs font-mono text-slate-400 whitespace-nowrap ml-4">${new Date(post.date).getDate()}日</span>
                        </div>
                    </div>
                </a>
            `;
        });
        
        html += `</div></div>`;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    // 隐藏分页
    const pag = document.querySelector('.pagination');
    if(pag) pag.innerHTML = '';
}

// ------------------------
// 3. 目录视图 (IDE 风格)
// ------------------------
function renderDirectoryView(container) {
    container.classList.add('max-w-3xl', 'mx-auto');
    
    const categories = {};
    allPosts.forEach(post => {
        const c = post.category || 'Root';
        if (!categories[c]) categories[c] = [];
        categories[c].push(post);
    });
    
    let html = `
        <div class="bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden border border-slate-200 dark:border-[#333] shadow-2xl animate-fade-in-up font-mono text-sm">
            <!-- Header -->
            <div class="bg-slate-100 dark:bg-[#252526] px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-[#333]">
                <div class="flex gap-2">
                    <div class="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm"></div>
                    <div class="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm"></div>
                    <div class="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm"></div>
                </div>
                <div class="text-xs text-slate-500">PROJECT: SHADOWSKY</div>
            </div>
            
            <!-- Sidebar / Content -->
            <div class="p-2 dark:text-[#cccccc]">
                <div class="pl-2 py-1 flex items-center gap-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2a2d2e] rounded cursor-default">
                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                    <span class="font-bold">src</span>
                </div>
    `;
    
    Object.keys(categories).sort().forEach((cat, idx) => {
        html += `
            <div class="ml-4">
                <details open class="group">
                    <summary class="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-[#2a2d2e] cursor-pointer select-none transition-colors">
                        <i data-lucide="folder" class="w-4 h-4 text-blue-500 group-open:hidden"></i>
                        <i data-lucide="folder-open" class="w-4 h-4 text-blue-500 hidden group-open:block"></i>
                        <span class="${cat === 'Uncategorized' ? 'italic opacity-70' : ''}">${cat}</span>
                    </summary>
                    <div class="ml-4 border-l border-slate-200 dark:border-[#444] pl-2 mt-1 space-y-0.5">
        `;
        
        categories[cat].forEach(post => {
            html += `
                <a href="post.html?file=${post.file}" class="flex items-center gap-2 py-1 px-2 rounded hover:bg-blue-50 dark:hover:bg-[#094771] group/file transition-colors">
                    <i data-lucide="file-code" class="w-4 h-4 text-slate-400 group-hover/file:text-blue-400"></i>
                    <span class="truncate hover:underline decoration-blue-500/30">${post.title}</span>
                    <span class="ml-auto text-xs opacity-30 hidden sm:block">.md</span>
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
            <div class="bg-slate-50 dark:bg-[#007acc] text-white px-3 py-1 text-xs flex justify-between items-center">
                <span>master*</span>
                <span>Ln ${allPosts.length}, Col 1</span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    const pag = document.querySelector('.pagination');
    if(pag) pag.innerHTML = '';
}

// ------------------------
// 4. 标签视图 (3D 云风格)
// ------------------------
function renderTagsView(container) {
	container.classList.add('max-w-5xl', 'mx-auto');
	
	const tagMap = {};
	allPosts.forEach(post => {
		(post.tags || []).forEach(t => {
			if (!tagMap[t]) tagMap[t] = [];
			tagMap[t].push(post);
		});
	});
	
	const tags = Object.keys(tagMap).sort((a, b) => tagMap[b].length - tagMap[a].length);
	
	let html = `
		<section class="py-10 sm:py-12">
			<div class="max-w-4xl mx-auto text-center mb-8 animate-fade-in-up">
				<p class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-blue-50/80 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-100/60 dark:border-blue-800/60 mb-3">
					<i data-lucide=\"sparkles\" class="w-3 h-3"></i>
					标签知识图谱
				</p>
				<h2 class="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
					Knowledge Graph
				</h2>
				<p class="text-sm sm:text-base text-slate-500 dark:text-slate-400">
					通过标签快速跳转到常用教程、服务器搭建与效率工具笔记。
				</p>
			</div>
			<div class="relative max-w-4xl mx-auto">
				<div class="pointer-events-none absolute -inset-1 rounded-[32px] bg-gradient-to-r from-blue-500/15 via-purple-500/10 to-pink-500/15 blur-3xl opacity-70"></div>
				<div class="relative flex flex-wrap justify-center gap-3 sm:gap-4 p-5 sm:p-8 bg-white/90 dark:bg-slate-900/80 rounded-3xl border border-slate-100/80 dark:border-slate-800 shadow-xl backdrop-blur">
	`;
	
	tags.forEach((tag, idx) => {
		const count = tagMap[tag].length;
		const size = count > 5 ? 'text-[17px] sm:text-lg px-5 sm:px-6 py-2.5' : count > 2 ? 'text-sm sm:text-base px-4 py-2' : 'text-xs sm:text-sm px-3 py-1.5';
		const weight = count > 5 ? 'font-semibold' : 'font-medium';
		const delay = idx * 50;
		const intensity = count > 5
			? 'bg-blue-600 bg-gradient-to-r from-blue-500/90 via-purple-500/80 to-indigo-500/80 text-white shadow-blue-500/40'
			: count > 2
			? 'bg-blue-50 bg-gradient-to-r from-blue-50/90 via-purple-50/80 to-pink-50/80 dark:from-blue-900/50 dark:via-purple-900/40 dark:to-pink-900/40 text-slate-700 dark:text-slate-50'
			: 'bg-white/95 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300';
		
		html += `
			<button onclick="filterByTag('${tag}')" data-tag="${tag}"
				class="tag-btn group relative inline-flex items-center ${size} ${weight} rounded-full border border-slate-200/70 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:-rotate-1 transition-all duration-300 ${intensity} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950"
				style="animation: fadeIn 0.5s ease-out ${delay}ms backwards;">
				<span class="relative flex items-center gap-2">
					<span class="tracking-wide">#${tag}</span>
					<span class="inline-flex items-center justify-center px-2 py-0.5 text-[10px] rounded-full bg-black/5 dark:bg-white/10 border border-white/40 dark:border-slate-700/80 shadow-sm">
						${count}
					</span>
				</span>
			</button>
		`;
	});
	
	html += `			</div>
			</div>
			<div id="tag-results" class="mt-8 sm:mt-10 min-h-[200px]">
                <!-- Placeholder for initial state or empty state -->
                <div class="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600">
                    <i data-lucide="mouse-pointer-click" class="w-12 h-12 mb-3 opacity-50"></i>
                    <p class="text-sm font-medium">点击上方标签探索相关内容</p>
                </div>
            </div>
		</section>`;
			
	container.innerHTML = html;
	const pag = document.querySelector('.pagination');
	if(pag) pag.innerHTML = '';

    // 自动选择第一个最热门的标签，避免页面下方出现大片空白
    if (tags.length > 0) {
        // 使用 setTimeout 确保 DOM 渲染完成，并且不触发滚动
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
			btn.classList.add('ring-2', 'ring-blue-500/70', 'ring-offset-2', 'ring-offset-slate-50', 'dark:ring-offset-slate-950', 'scale-105');
		} else {
			btn.classList.remove('ring-2', 'ring-blue-500/70', 'ring-offset-2', 'ring-offset-slate-50', 'dark:ring-offset-slate-950', 'scale-105');
		}
	});
	
    const filtered = allPosts.filter(p => (p.tags || []).includes(tag));
    
    let html = `
		<div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 animate-fade-in">
			<span class="hidden sm:inline-block h-px w-10 bg-gradient-to-r from-blue-500 to-purple-500"></span>
			<h3 class="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
				找到 <span class="text-blue-500">${filtered.length}</span> 篇包含 <span class="text-blue-500">#${tag}</span> 的笔记
			</h3>
			<span class="flex-1 h-px bg-slate-200/80 dark:bg-slate-800/80"></span>
		</div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;
    
    filtered.forEach((post, idx) => {
        html += `
            <a href="post.html?file=${post.file}" class="group block bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:-translate-y-1 animate-fade-in-up" style="animation-delay: ${idx * 50}ms">
                <div class="flex items-start justify-between mb-2">
                    <span class="text-xs font-mono text-slate-400">${post.date.split('T')[0]}</span>
                    <i data-lucide="arrow-up-right" class="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors"></i>
                </div>
                <h4 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-500 transition-colors">${post.title}</h4>
                <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">${post.excerpt || ''}</p>
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
// 分类过滤器
// ------------------------
function renderCategories() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    
    const counts = {};
    allPosts.forEach(p => {
        const c = p.category || 'Uncategorized';
        counts[c] = (counts[c] || 0) + 1;
    });
    
    const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    
    let html = `
        <button onclick="filterByCategory('all')" class="category-btn active relative px-5 py-2 rounded-full text-sm font-bold transition-all bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md" data-category="all">
            All
        </button>
    `;
    
    cats.forEach(c => {
        html += `
            <button onclick="filterByCategory('${c}')" class="category-btn relative px-5 py-2 rounded-full text-sm font-medium transition-all bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md" data-category="${c}">
                ${c}
                <span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-[10px] text-blue-600 dark:text-blue-400 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100">
                    ${counts[c]}
                </span>
            </button>
        `;
    });
    
    container.innerHTML = html;
}

function filterByCategory(cat) {
    currentCategory = cat;
    currentPage = 1;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-category') === cat;
        if (isActive) {
            btn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-950', 'text-blue-600', 'dark:text-blue-400');
        } else {
            btn.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-950', 'text-blue-600', 'dark:text-blue-400');
        }
    });
    
    renderCurrentView();
}

function renderEmptyState(container) {
    container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
            <i data-lucide="inbox" class="w-16 h-16 text-slate-300 mb-4"></i>
            <p class="text-slate-500 text-lg">Empty Sector</p>
            <button onclick="filterByCategory('all')" class="mt-4 text-blue-500 hover:underline">Return to Base</button>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderPagination(totalItems) {
    const container = document.querySelector('.pagination');
    if (!container || totalItems <= POSTS_PER_PAGE) {
        if(container) container.innerHTML = '';
        return;
    }
    
    const pages = Math.ceil(totalItems / POSTS_PER_PAGE);
    
    let html = `
        <div class="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-800">
            <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''} class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                <i data-lucide="chevron-left" class="w-5 h-5"></i>
            </button>
            <span class="px-4 font-mono text-sm text-slate-500">${currentPage} / ${pages}</span>
            <button onclick="changePage(1)" ${currentPage === pages ? 'disabled' : ''} class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                <i data-lucide="chevron-right" class="w-5 h-5"></i>
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function changePage(delta) {
    currentPage += delta;
    renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Global Exports
window.switchView = switchView;
window.filterByCategory = filterByCategory;
window.filterByTag = filterByTag;
window.changePage = changePage;

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadBlogPosts();
    
    // 监听视图按钮
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.getAttribute('data-view'));
        });
    });
});
