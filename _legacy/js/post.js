/**
 * post.js - 单篇文章渲染（完整版）
 */

/** 获取 URL 参数 */
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || 'sample_post.md'; 
}

/** 格式化日期 YYYY-MM-DD */
function formatDate(dateString) {
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

/** 估算阅读时间 */
function estimateReadTime(text) {
    if (!text) return 1;
    const wordsPerMinute = 200;
    const plainText = text.replace(/[\s\n]+/g, ' ').trim();
    const wordCount = plainText.split(' ').length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

/** 更新文章头部信息 */
function updateHeaderMetadata(metadata, content) {
    const title = metadata.title || '无标题';
    const dateStr = metadata.date ? formatDate(metadata.date) : '未知日期';
    const categoryStr = metadata.category || '未分类';
    const authorStr = metadata.author || '匿名作者';
    const readTime = metadata.readTime || estimateReadTime(content);

    document.title = `${title} | 星空笔记`;

    const titleEl = document.getElementById('post-title');
    if (titleEl) titleEl.textContent = title;

    const dateEl = document.getElementById('post-date');
    if (dateEl) dateEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> ${dateStr}`;

    const categoryEl = document.getElementById('post-category');
    if (categoryEl) categoryEl.innerHTML = `<i class="fa-solid fa-bookmark"></i> ${categoryStr}`;

    const authorEl = document.getElementById('post-author');
    if (authorEl) authorEl.innerHTML = `<i class="fa-solid fa-user"></i> ${authorStr}`;

    const readTimeEl = document.getElementById('post-read-time');
    if (readTimeEl) readTimeEl.innerHTML = `<i class="fa-solid fa-clock"></i> 阅读时间：${readTime} 分钟`;

    // 标签处理
    const tagsContainer = document.getElementById('post-tags-container');
    if (tagsContainer && metadata.tags) {
        let tagsArray = Array.isArray(metadata.tags) ? metadata.tags : 
                        (typeof metadata.tags === 'string' ? metadata.tags.split(',').map(t => t.trim()) : []);
        const tagsHtml = tagsArray.filter(t => t).map(t => `<a href="blog.html?tag=${encodeURIComponent(t)}" class="meta-tag-link">${t}</a>`).join(' ');
        if (tagsHtml) {
            tagsContainer.innerHTML = `<i class="fa-solid fa-tags"></i> 标签: ${tagsHtml}`;
            tagsContainer.style.display = 'flex';
        } else tagsContainer.style.display = 'none';
    } else if (tagsContainer) tagsContainer.style.display = 'none';
}

/** 规范化单行 YAML Front Matter */
function normalizeFrontMatter(text) {
    try {
        const t = String(text || '').trim();
        if (!t) return '';
        if (t.indexOf('\n') !== -1) return t;
        return t.replace(/\s+([A-Za-z_][\w-]*):\s/g, '\n$1: ').trim();
    } catch { return String(text || ''); }
}

/** 切换页面显示博客列表或文章详情 */
function togglePageSections() {
    const blogList = document.querySelector('.blog-list');
    const postArticle = document.querySelector('.post-article');
    const hasFileParam = window.location.search.includes('file=');
    if (blogList && postArticle) {
        if (hasFileParam) {
            blogList.style.display = 'none';
            postArticle.style.display = 'block';
        } else {
            blogList.style.display = 'block';
            postArticle.style.display = 'none';
        }
    }
}

/** 添加代码复制按钮 */
function addCopyButtons() {
    document.querySelectorAll('#article-content pre').forEach(pre => {
        if (pre.querySelector('.copy-btn')) return;

        const button = document.createElement('button');
        button.className = 'copy-btn';
        button.innerText = '复制';
        button.title = '复制代码';

        button.addEventListener('click', async () => {
            try {
                const code = pre.querySelector('code')?.innerText;
                if (!code) return;
                await navigator.clipboard.writeText(code);
                button.innerText = '已复制';
                setTimeout(() => button.innerText = '复制', 1500);
            } catch (err) {
                console.error('复制失败:', err);
                button.innerText = '失败';
                setTimeout(() => button.innerText = '复制', 1500);
            }
        });

        pre.style.position = 'relative';
        button.style.position = 'absolute';
        button.style.top = '8px';
        button.style.right = '8px';
        button.style.padding = '2px 6px';
        button.style.fontSize = '12px';
        button.style.cursor = 'pointer';
        button.style.border = 'none';
        button.style.borderRadius = '3px';
        button.style.background = 'var(--theme-color)';
        button.style.color = '#fff';

        pre.appendChild(button);
    });
}

/** 渲染文章 */
async function renderPost() {
    togglePageSections();
    const file = getQueryParam('file');
    const container = document.getElementById('article-content');
    const TIMEOUT_MS = 10000;

    if (!container) return;
    if (typeof marked === 'undefined' || typeof jsyaml === 'undefined' || typeof DOMPurify === 'undefined') {
        container.innerHTML = '<p class="error-message">初始化失败：请确保 marked.js, jsyaml.js, 和 DOMPurify 已加载。</p>';
        return;
    }

    container.innerHTML = '<div class="loading">正在加载文章...</div>';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(`./posts/${file}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`文章未找到 (HTTP ${res.status})`);
        const text = await res.text();

        // 解析 YAML Front Matter（若存在）
        const yamlMatch = text.match(/^---\s*([\s\S]+?)\s*---/);
        let metadata = {};
        let content = text;
        if (yamlMatch) {
            try {
                metadata = jsyaml.load(normalizeFrontMatter(yamlMatch[1])) || {};
                content = text.substring(yamlMatch[0].length).trim();
            } catch (e) {
                console.warn('YAML 解析失败', e);
                content = text;
            }
        }

        updateHeaderMetadata(metadata, content);

        // 根据扩展名选择解析策略，统一格式
        const isHtml = /\.(html|htm)$/i.test(file);
        marked.setOptions({ gfm: true, breaks: true, headerIds: true, mangle: false });
        const htmlContent = isHtml ? content : marked.parse(content);
        const safeHtml = DOMPurify.sanitize(htmlContent);
        container.innerHTML = `<div class="post-body">${safeHtml}</div>`;

        // Mermaid 图表
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
            document.querySelectorAll('#article-content pre code.language-mermaid').forEach(el => {
                const div = document.createElement('div');
                div.className = 'mermaid';
                div.textContent = el.textContent;
                const pre = el.closest('pre');
                if (pre) pre.parentNode.replaceChild(div, pre);
            });
            mermaid.init(undefined, '#article-content .mermaid');
        }

        // 代码高亮
        if (typeof hljs !== 'undefined') {
            document.querySelectorAll('#article-content pre code').forEach(block => hljs.highlightElement(block));
        }

        // 添加代码复制按钮
        addCopyButtons();

        // KaTeX 渲染
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(container, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '\\[', right: '\\]', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false}
                ],
                ignoredTags: ["script","noscript","style","textarea","pre","code","div.mermaid"]
            });
        }

    } catch (err) {
        clearTimeout(timeoutId);
        console.error('加载文章失败', err);
        const errorMessage = err.name === 'AbortError' ? `加载超时 (超过 ${TIMEOUT_MS/1000} 秒)` : err.message;

        updateHeaderMetadata({});
        container.innerHTML = `
            <div class="error-message">
                <h3 class="error-title">加载失败</h3>
                <p>无法加载文件 <code>posts/${file}</code></p>
                <p>错误信息: ${errorMessage}</p>
                <a href="blog.html" class="back-link">← 返回博客列表</a>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    togglePageSections();
    if (window.location.search.includes('file=')) {
        renderPost();
    }
});

