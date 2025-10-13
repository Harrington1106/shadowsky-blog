// js/blog.js - 博客列表页面功能（动态加载 posts.json）

// ------------------------
// 异步加载博客文章
// ------------------------
async function loadBlogPosts() {
	const container = document.querySelector('.blog-list');
	if (!container) return;

	try {
		// 加载文章索引
		const response = await fetch('./posts/posts.json');
		if (!response.ok) throw new Error('无法加载文章列表');

		const blogPosts = await response.json();

		// 渲染文章列表
		renderBlogList(blogPosts);

	} catch (error) {
		console.error('加载文章列表失败:', error);
		container.innerHTML = `
			<div class="no-posts-msg">
				<p>❌ 加载文章列表失败，请刷新页面重试</p>
			</div>
		`;
	}
}

// ------------------------
// 渲染文章列表
// ------------------------
function renderBlogList(blogPosts) {
	const container = document.querySelector('.blog-list');
	if (!container) return;

	container.innerHTML = '';

	if (!blogPosts || blogPosts.length === 0) {
		container.innerHTML = `
			<div class="no-posts-msg">
				<p>📝 正在创作精彩内容，敬请期待...</p>
				<p style="margin-top:10px; font-size:0.9rem; opacity:0.7;">
					目前还没有发布文章，正在努力准备中！
				</p>
			</div>
		`;
		return;
	}

	blogPosts.forEach(post => {
		const articleHTML = `
			<article class="blog-post">
				<div class="post-meta">
					<time datetime="${post.date}">${post.date}</time>
					<span class="post-category">${post.category}</span>
				</div>
				<h2 class="post-title">
					<a href="post.html?file=${post.file}">${post.title}</a>
				</h2>
				<p class="post-excerpt">${post.excerpt}</p>
				<div class="post-footer">
					<span class="read-time">📖 ${post.readTime}分钟阅读</span>
					<a href="post.html?file=${post.file}" class="read-more">继续阅读 →</a>
				</div>
			</article>
		`;
		container.insertAdjacentHTML('beforeend', articleHTML);
	});
}
const articleHTML = `
<article class="blog-post">
    ${post.coverImage ? `<img src="posts/${post.coverImage}" alt="${post.title}" class="post-cover"/>` : ''}
    <div class="post-meta">
        <time datetime="${post.date}">${post.date}</time> |
        <span class="post-category">${post.category}</span> |
        <span class="post-author">by ${post.author}</span>
    </div>
    <h2 class="post-title">
        <a href="post.html?file=${post.file}">${post.title}</a>
    </h2>
    <p class="post-excerpt">${post.excerpt}</p>
    <div class="post-tags">
        ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}
    </div>
    <div class="post-footer">
        <span class="read-time">📖 ${post.readTime} min read</span>
        <a href="post.html?file=${post.file}" class="read-more">Read more →</a>
    </div>
</article>
`;

// ------------------------
// 初始化页面
// ------------------------
function initBlogPage() {
	// 加载文章
	loadBlogPosts();

	// 初始化汉堡菜单
	const navToggle = document.getElementById("navToggle");
	const navMenu = document.querySelector(".navbar-menu");

	if (navToggle && navMenu) {
		navToggle.addEventListener("click", () => {
			navMenu.classList.toggle("active");
		});

		// 点击菜单项后关闭菜单（移动端）
		const navLinks = navMenu.querySelectorAll('a');
		navLinks.forEach(link => {
			link.addEventListener('click', () => {
				if (window.innerWidth <= 768) {
					navMenu.classList.remove('active');
				}
			});
		});
	}
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initBlogPage);
