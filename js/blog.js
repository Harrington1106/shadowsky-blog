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
		const response = await fetch('./posts/posts.json', { signal: controller.signal });
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
// 渲染文章列表
// ------------------------
function renderBlogList() {
	const container = document.querySelector('.blog-list');
	if (!container) return;
	container.innerHTML = '';

	if (!allPosts || allPosts.length === 0) {
		container.innerHTML = `<div class="no-posts-msg"><p>📝 正在创作精彩内容，敬请期待...</p></div>`;
		return;
	}

	const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
	const endIndex = startIndex + POSTS_PER_PAGE;
	const currentPosts = allPosts.slice(startIndex, endIndex);

	currentPosts.forEach(post => {
		const formattedDateTime = formatDateTime(post.date);
		const readTimeText = post.readTime ? `${post.readTime} 分钟阅读` : '未知阅读时间';
		const authorName = post.author || '匿名作者';
		const authorInitial = authorName[0].toUpperCase();
		const tagsHtml = Array.isArray(post.tags) ? post.tags.map(tag => `<span class="post-card__tag">${tag}</span>`).join('') : '';

		const articleHTML = `
<article class="post-card">
    ${post.coverImage ? `<img src="posts/${post.coverImage}" alt="${post.title}" class="post-cover"/>` : ''}
    <div class="post-card__header">
        <div class="post-card__category">${post.category}</div>
    </div>
    <div class="post-card__title-wrapper">
        <h2 class="post-card__title"><a href="post.html?file=${post.file}">${post.title}</a></h2>
    </div>
    <p class="post-card__excerpt">${post.excerpt}</p>
    <div class="post-card__meta">
        <span class="post-card__date">${formattedDateTime}</span>
        <span class="post-card__read-time">${readTimeText}</span>
    </div>
    <div class="post-card__tags"><div class="post-card__tag-list">${tagsHtml}</div></div>
    <div class="post-card__footer">
        <div class="post-card__author"><div class="post-card__author-avatar">${authorInitial}</div><span>${authorName}</span></div>
        <a href="post.html?file=${post.file}" class="post-card__read-more">阅读全文</a>
    </div>
</article>`;
		container.insertAdjacentHTML('beforeend', articleHTML);
	});
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

// ------------------------
// 初始化页面
// ------------------------
function initBlogPage() {
	loadBlogPosts();

	const navToggle = document.getElementById("navToggle");
	const navMenu = document.querySelector(".navbar-menu");

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