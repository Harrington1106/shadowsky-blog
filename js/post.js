// post.js - 博客文章渲染的核心逻辑

/**
 * 从 URL 中获取指定的查询参数值
 * @param {string} name - 参数名称 ('file')
 * @returns {string | null} - 参数值或 null
 */
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 核心渲染函数：加载 Markdown 文件，解析 Front Matter，并渲染内容
 */
async function renderPost() {
    // URL 参数名已统一为 'file'
    const file = getQueryParam('file');
    // 使用 HTML 中定义的 ID '#article-content'
    const container = document.getElementById('article-content');

    if (!container) {
        console.error("找不到文章内容容器 #article-content");
        return;
    }

    // 检查全局依赖 (必须通过 <script> 标签加载)
    // 假设你已在 HTML 中加载 marked, jsyaml 和 DOMPurify
    if (typeof marked === 'undefined' || typeof jsyaml === 'undefined' || typeof DOMPurify === 'undefined') {
        container.innerHTML = '<p class="error-message">初始化失败：请确保 marked.js, jsyaml.js, 和 DOMPurify 已加载。</p>';
        return;
    }

    if (!file) {
        container.innerHTML = '<div class="error-message"><h3>文章参数缺失</h3><p>未找到指定文章文件。</p><a href="blog.html" class="back-link">← 返回博客列表</a></div>';
        return;
    }

    // 显示加载状态 (使用 CSS 中定义的 .loading 类)
    container.innerHTML = '<div class="loading">正在加载文章...</div>';

    try {
        // 尝试加载文件
        const res = await fetch(`./posts/${file}`); 
        
        if (!res.ok) {
            throw new Error(`文章未找到 (HTTP ${res.status})`);
        }
        
        const text = await res.text();
        
        // 1. 提取 YAML Front Matter
        const yamlMatch = text.match(/^---\n([\s\S]+?)\n---/);
        let metadata = {};
        let content = text;

        if (yamlMatch) {
            try {
                metadata = jsyaml.load(yamlMatch[1]) || {};
                content = text.replace(yamlMatch[0], '').trim();
            } catch (e) {
                console.warn('YAML Front Matter 解析失败，将忽略元数据:', e);
                content = text.replace(/^---\n[\s\S]+?\n---/, '').trim();
            }
        }
        
        // 2. 解析 Markdown 并进行 HTML 净化 (安全性)
        const htmlContent = marked.parse(content);
        const safeHtml = DOMPurify.sanitize(htmlContent);

        // 3. 渲染最终 HTML (匹配 post.css 的结构)
        container.innerHTML = `
            <header class="article-header">
                <h1 class="article-title">${metadata.title || '无标题'}</h1>
                <div class="article-meta">
                    <span class="meta-item"><i>🗓️</i> ${metadata.date || '未知日期'}</span> 
                    <span class="meta-item"><i>🏷️</i> ${metadata.category || '未分类'}</span>
                    ${metadata.author ? `<span class="meta-item"><i>👤</i> ${metadata.author}</span>` : ''}
                </div>
            </header>
            <div class="article-content post-body">
                ${safeHtml}
            </div>
        `;

        // 4. (可选) 代码高亮
        if (typeof hljs !== 'undefined') {
            document.querySelectorAll('#article-content pre code').forEach((block) => {
                // 使用 highlight.js 进行高亮
                hljs.highlightElement(block);
            });
        }
        
        // 5. 更新浏览器标题
        document.title = `${metadata.title || '文章'} | 星空笔记`;

    } catch (err) {
        console.error('加载文章失败', err);
        // 显示错误信息 (使用 CSS 中定义的 .error-message 类)
        container.innerHTML = `
            <div class="error-message">
                <h3 class="error-title">加载失败</h3>
                <p>无法加载文件 <code>posts/${file}</code>。</p>
                <p>错误信息: ${err.message}</p>
                <a href="blog.html" class="back-link">← 返回博客列表</a>
            </div>
        `;
    }
}

// 页面加载完成后开始渲染
document.addEventListener('DOMContentLoaded', renderPost);