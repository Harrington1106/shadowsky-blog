// blog.js - 博客列表页面功能

// 博客数据 - 直接使用JavaScript对象
const blogPosts = [
    { 
        title: "Web开发中的响应式设计哲学", 
        date: "2024-01-15", 
        category: "技术思考", 
        excerpt: "在移动设备普及的今天，响应式设计不仅仅是技术实现，更是一种设计哲学。探讨如何从用户体验角度出发，构建真正适配各种设备的现代网站。", 
        readTime: 8, 
        file: "web-responsive-design.md" 
    },
    { 
        title: "冬季猎户座观测指南", 
        date: "2024-01-18", 
        category: "天文观测", 
        excerpt: "冬季是观测猎户座的最佳时机，这份指南将带你认识这个壮丽的星座及其周边天体，包括著名的猎户座大星云和参宿四等亮星。", 
        readTime: 10, 
        file: "winter-orion-guide.md" 
    },
    { 
        title: "好奇心与生活探索", 
        date: "2024-01-20", 
        category: "生活思考", 
        excerpt: "保持好奇心是驱动我们探索世界的原动力，如何在日常生活中培养和保持这份珍贵品质，让生活充满发现和惊喜。", 
        readTime: 6, 
        file: "curiosity-life.md" 
    }
    // (未来可以在这里添加更多文章对象)
];

/**
 * 渲染博客列表
 */
function renderBlogList() {
    const container = document.querySelector('.blog-list');
    
    if (!container) {
        console.error('找不到博客列表容器 (.blog-list)');
        return;
    }

    // 清空容器
    container.innerHTML = '';

    if (blogPosts.length === 0) {
        // 使用 CSS 中定义的 .no-posts-msg 类
        container.innerHTML = `
            <div class="no-posts-msg">
                <p>📝 正在创作精彩内容，敬请期待...</p>
                <p style="margin-top: 10px; font-size: 0.9rem; opacity: 0.7;">
                    目前还没有发布文章，正在努力准备中！
                </p>
            </div>
        `;
        return;
    }

    // 渲染博客文章
    blogPosts.forEach(post => {
        // 确保 HTML 结构和类名与 css/blog.css 匹配
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

/**
 * 初始化页面
 */
function initBlogPage() {
    // 渲染博客列表
    renderBlogList();

    // 初始化汉堡菜单 (假设 navToggle 和 navbar-menu 在 main.js 或全局处理)
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
                // 使用 768px 作为移动端断点，与 CSS 保持一致
                if (window.innerWidth <= 768) {
                    navMenu.classList.remove('active');
                }
            });
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initBlogPage);