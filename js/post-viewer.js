    // Category images map (same as blog.js)
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
    
    // Global variables for DOM elements
    let postTitle, postMeta, postTags, postContent, headerBg;

    document.addEventListener('DOMContentLoaded', () => {
        postTitle = document.getElementById('post-title');
        postMeta = document.getElementById('post-meta');
        postTags = document.getElementById('post-tags');
        postContent = document.getElementById('post-content');
        headerBg = document.getElementById('header-bg');
        
        // Ensure elements exist before proceeding
        if (!postTitle || !postContent) {
             console.error('Critical elements missing');
             return;
        }

        setupTOCDrawer();
        loadPost();
    });

    function getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // --- Helper Functions ---
    function setupImageLightbox() {
        // Create lightbox elements if they don't exist
        let overlay = document.querySelector('.lightbox-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'lightbox-overlay';
            overlay.innerHTML = `
                <button class="lightbox-close" aria-label="Close">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
                <img src="" alt="Lightbox" class="lightbox-img">
            `;
            document.body.appendChild(overlay);
        }

        const lightboxImg = overlay.querySelector('.lightbox-img');
        const closeBtn = overlay.querySelector('.lightbox-close');

        function openLightbox(src, alt) {
            lightboxImg.src = src;
            lightboxImg.alt = alt || '';
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
            lucide.createIcons();
        }

        function closeLightbox() {
            overlay.classList.remove('active');
            setTimeout(() => {
                lightboxImg.src = '';
                document.body.style.overflow = '';
            }, 300);
        }

        // Event Listeners
        closeBtn.addEventListener('click', closeLightbox);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeLightbox();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) closeLightbox();
        });

        // Attach to all content images
        const images = document.querySelectorAll('#post-content img');
        images.forEach(img => {
            img.addEventListener('click', () => {
                openLightbox(img.src, img.alt);
            });
        });
    }

    function calculateReadingTime(text) {
        const words = text.trim().split(/\s+/).length;
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        // Estimate: 300 words/min or 500 chars/min. 
        // We'll just sum them and divide by a weighted average factor around 400.
        const totalWeight = words + chineseChars; 
        return Math.max(1, Math.ceil(totalWeight / 400));
    }

    async function loadPostNavigation(currentFile) {
        try {
            const navContainer = document.getElementById('post-navigation');
            if (!navContainer) return;

            const response = await fetch('public/posts/posts.json');
            if (!response.ok) return;
            
            const posts = await response.json();
            // Sort by date descending
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Clean currentFile path for comparison
            const currentFileName = currentFile.split('/').pop();
            const currentIndex = posts.findIndex(p => p.file === currentFileName || p.file.endsWith(currentFileName));

            if (currentIndex === -1) return;

            const nextPost = currentIndex > 0 ? posts[currentIndex - 1] : null; // Newer
            const prevPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null; // Older

            // Previous Post (Older) - left
            if (prevPost) {
                navContainer.innerHTML += `
                    <a href="post.html?file=${prevPost.file}">
                        <span>← 上一篇</span>
                        <span>${prevPost.title}</span>
                    </a>`;
            } else { navContainer.innerHTML += '<div></div>'; }

            // Next Post (Newer) - right
            if (nextPost) {
                navContainer.innerHTML += `
                    <a href="post.html?file=${nextPost.file}" class="next">
                        <span>下一篇 →</span>
                        <span>${nextPost.title}</span>
                    </a>`;
            } else { navContainer.innerHTML += '<div></div>'; }
            
            lucide.createIcons();

        } catch (e) {
            console.error('Failed to load post navigation:', e);
        }
    }

    function parseFrontMatter(text) {
        const result = {
            metadata: {},
            content: text
        };

        // Remove BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }

        text = text.trimStart();

        // Check if starts with ---
        if (text.startsWith('---')) {
            const endMatch = text.indexOf('---', 3);
            if (endMatch !== -1) {
                const yamlBlock = text.substring(3, endMatch);
                result.content = text.substring(endMatch + 3).trim();
                
                // Simple YAML parser
                const lines = yamlBlock.split('\n');
                let currentKey = null;

                lines.forEach(line => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return;

                    // Check for list item (starts with -)
                    if (trimmedLine.startsWith('-')) {
                        if (currentKey && Array.isArray(result.metadata[currentKey])) {
                            let val = trimmedLine.slice(1).trim();
                            // Remove quotes
                            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.slice(1, -1);
                            }
                            result.metadata[currentKey].push(val);
                        }
                        return;
                    }

                    const colonIndex = line.indexOf(':');
                    if (colonIndex !== -1) {
                        const key = line.substring(0, colonIndex).trim();
                        let value = line.substring(colonIndex + 1).trim();
                        
                        // Handle Arrays (e.g. tags: ["a", "b"])
                        if (value.startsWith('[') && value.endsWith(']')) {
                            try {
                                // Try parsing as JSON
                                value = JSON.parse(value);
                            } catch (e) {
                                // Fallback for simple comma separated inside brackets
                                const inner = value.slice(1, -1);
                                value = inner.split(',').map(item => {
                                    item = item.trim();
                                    if ((item.startsWith('"') && item.endsWith('"')) || 
                                        (item.startsWith("'") && item.endsWith("'"))) {
                                        return item.slice(1, -1);
                                    }
                                    return item;
                                }).filter(Boolean);
                            }
                            currentKey = key;
                            result.metadata[key] = value;
                        } else {
                            // If value is empty, it might be a start of a list
                            if (!value) {
                                currentKey = key;
                                result.metadata[key] = []; // Initialize as array
                            } else {
                                // Remove quotes if present for simple strings
                                if ((value.startsWith('"') && value.endsWith('"')) || 
                                    (value.startsWith("'") && value.endsWith("'"))) {
                                    value = value.slice(1, -1);
                                }
                                currentKey = key;
                                result.metadata[key] = value;
                            }
                        }
                    }
                });
            }
        } 
        // Handle files starting with # Header directly (No Front Matter)
        else if (text.startsWith('# ')) {
             const lines = text.split('\n');
             const titleLine = lines[0].trim();
             result.metadata.title = titleLine.replace(/^#\s+/, '');
             result.content = text; // Keep full content or remove title? Usually keep.
        }
        // Handle the weird format seen in sample_post.md.html (h2 headers)
        // Or if it's just key: value lines at the top without ---
        else {
            // Try to extract lines that look like metadata at the start
            const lines = text.split('\n');
            let i = 0;
            while (i < lines.length && i < 10) {
                const line = lines[i].trim();
                if (!line) { i++; continue; }
                
                // Matches "key: value"
                const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
                if (match) {
                    result.metadata[match[1]] = match[2];
                    i++;
                } else {
                    break;
                }
            }
            if (i > 0) {
                result.content = lines.slice(i).join('\n').trim();
            }
        }

        return result;
    }

    async function loadPost() {
        let file = getQueryParam('file');

        // ═══ 返回链接恢复视图 ═══
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            document.querySelectorAll('a[href="blog.html"]').forEach(a => { a.href = 'blog.html' + ref; });
        }

        // ═══ AI 日报入口 ═══
        const aiDate = params.get('ai');
        if (aiDate) {
            try {
                // 读取 Markdown 日报文件
                const mdRes = await fetch(`../public/data/ai-daily/${aiDate}.md`);
                if (!mdRes.ok) throw new Error('日报不存在: ' + aiDate);
                const md = await mdRes.text();

                // 提取标题
                const titleMatch = md.match(/^#\s+(.+)/m);
                const rawTitle = titleMatch ? titleMatch[1] : 'AI日报 · ' + aiDate;
                const cleanTitle = rawTitle.replace(/^[📰📝🏆]\s*/, '');

                // 所有返回链接指向 AI 日报
                document.querySelectorAll('a[href="blog.html"]').forEach(a => { a.href = 'blog.html#aidaily'; });

                // 填充元数据
                document.title = cleanTitle;
                postTitle.textContent = cleanTitle;
                const d = new Date(aiDate);
                const dateStr = d.toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' });
                postMeta.innerHTML = `
                    <i data-lucide="calendar" class="w-4 h-4 opacity-60"></i>
                    <span>${dateStr}</span>
                    <span class="meta-divider">·</span>
                    <span style="display:inline-flex;align-items:center;gap:3px">🤖 AI日报</span>`;

                // 提取关键词
                const kwMatch = md.match(/关键词[：:]\s*(.+)/);
                const keywords = kwMatch ? kwMatch[1].split(/[,，、]/).map(k => k.trim()).filter(Boolean).slice(0, 5) : [];
                postTags.innerHTML = keywords.map(t =>
                    `<span class="post-tag">#${t}</span>`
                ).join('');

                // AI 封面
                if (headerBg) {
                    headerBg.style.backgroundImage = 'url(https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80)';
                }

                // Markdown → HTML
                if (typeof marked !== 'undefined') {
                    postContent.innerHTML = marked.parse(md, { async: false });
                } else {
                    postContent.innerHTML = `<pre style="white-space:pre-wrap;font-size:.82rem">${md.replace(/</g,'&lt;')}</pre>`;
                }

                // 运行后处理
                if (typeof renderMathInElement === 'function') {
                    try { renderMathInElement(postContent); } catch {}
                }
                generateTOC();
                addCopyButtons();
                setupImageLightbox();
                setupProgressBar();
                loadRecommendations();
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            } catch (e) {
                console.error('[AI Daily] 加载失败:', e);
                postContent.innerHTML = `
                    <div style="text-align:center;padding:60px 20px">
                        <p style="font-size:1.1rem;color:#ef4444;margin-bottom:8px">AI 日报加载失败</p>
                        <p style="color:#64748b;margin-bottom:24px">${e.message}</p>
                        <a href="blog.html" style="color:#2dd4bf">← 返回博客</a>
                    </div>`;
                postTitle.textContent = '加载失败';
                lucide.createIcons();
                return;
            }
        }

        // Debug info
        console.log('Loading post file:', file);

        if (!file) {
            // ... (keep error handling)
            console.error('No file parameter');
            postContent.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                    <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                        <i data-lucide="file-warning" class="w-12 h-12 text-red-500"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">未指定文章文件</h2>
                    <p class="text-gray-500 dark:text-gray-400 mb-8">URL 参数中缺少 file 字段。</p>
                    <a href="blog.html" class="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                        <i data-lucide="arrow-left" class="w-4 h-4 mr-2"></i>
                        返回文章列表
                    </a>
                </div>
            `;
            postTitle.textContent = '错误';
            lucide.createIcons();
            return;
        }

        // Ensure file extension
        if (!file.endsWith('.md')) {
            file += '.md';
        }

        try {
            // Try multiple paths in case of structure changes
            const pathsToTry = [
                `public/posts/${file}`,
                `posts/${file}`, // Fallback for legacy
                file // Absolute or direct path
            ];
            
            console.log('Trying paths:', pathsToTry);

            let response;
            let finalPath;

            for (const path of pathsToTry) {
                try {
                    console.log('Fetching:', path);
                    const res = await fetch(path);
                    if (res.ok) {
                        // Check content type to ensure it's not an HTML 404 page disguised as 200 OK (common in SPAs)
                        const contentType = res.headers.get('content-type');
                        if (contentType && contentType.includes('text/html')) {
                             console.warn('Path returned HTML (likely 404):', path);
                             // Read text to be sure it's not a valid MD file that server claims is HTML
                             const text = await res.text();
                             if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
                                 continue; 
                             }
                             // If it looks like markdown (has ---), use it
                             response = { ok: true, text: () => Promise.resolve(text) };
                             finalPath = path;
                             break;
                        }

                        response = res;
                        finalPath = path;
                        console.log('Found article at:', finalPath);
                        break;
                    } else {
                        console.warn('Fetch failed:', path, res.status);
                    }
                } catch (e) {
                    console.warn(`Failed to fetch from ${path}:`, e);
                }
            }

            if (!response || !response.ok) {
                throw new Error(`Article not found (404). Tried paths: ${pathsToTry.join(', ')}`);
            }
            
            const text = await response.text();
            
            // Check if we got an HTML error page instead of markdown (redundant check but safe)
            if (typeof text === 'string' && (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html'))) {
                throw new Error('Received HTML instead of Markdown. File might be missing or server returned 404 page.');
            }
            
            console.log('Front matter parsing...');
            const { metadata, content } = parseFrontMatter(text);
            console.log('Parsed metadata:', metadata);
            
            // Render Metadata
            document.title = `${metadata.title || '文章详情'} - 星空笔记`;
            
            if (metadata.title) {
                postTitle.textContent = metadata.title;
                postTitle.classList.remove('text-gray-400', 'italic');
            } else {
                console.warn('Metadata has no title');
                postTitle.textContent = '无标题';
                postTitle.classList.add('text-gray-400', 'italic');
            }
            
            // Fix: Better Date Handling
            let dateStr = '未知日期';
            if (metadata.date) {
                try {
                    const dateObj = new Date(metadata.date);
                    if (!isNaN(dateObj.getTime())) {
                        dateStr = dateObj.toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    }
                } catch (e) {
                    console.warn('Invalid date format:', metadata.date);
                }
            }
            const category = metadata.category || '未分类';
            
            // Render Meta immediately
            const readingTime = calculateReadingTime(content);
            
            // Date Link
            let dateLinkHtml = dateStr;
            if (metadata.date && /^\d{4}-\d{2}/.test(metadata.date)) {
                const ym = metadata.date.substring(0, 7);
                dateLinkHtml = `<a href="blog.html?date=${ym}" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-b border-transparent hover:border-blue-600 dark:hover:border-blue-400">${dateStr}</a>`;
            }

            // 最近修改时间
            let modifiedHtml = '';
            if (metadata.lastModified && metadata.lastModified !== metadata.date) {
                const modDate = new Date(metadata.lastModified);
                const modStr = modDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
                modifiedHtml = `<span class="post-hero-meta-item" title="最近修改"><i data-lucide="edit-3"></i> ${modStr}</span>`;
            }

            postMeta.innerHTML = `
                <span class="post-hero-meta-item"><i data-lucide="calendar"></i> ${dateLinkHtml}</span>
                ${modifiedHtml}
                <span class="post-hero-meta-item"><i data-lucide="folder"></i> ${category}</span>
                <span class="post-hero-meta-item"><i data-lucide="clock"></i> ${readingTime} 分钟阅读</span>
                <span class="post-hero-meta-item" title="阅读量"><i data-lucide="eye"></i> <span id="post-visit-count">...</span></span>
            `;

            // Fetch visit count asynchronously
            (async () => {
                const countEl = document.getElementById('post-visit-count');
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
                
                try {
                    // Use the file name as the identifier (e.g., posts/2025-12-07-blog-workflow)
                    const pageId = 'posts/' + file.replace(/\.md$/, '');
                    
                    if (window.api && window.api.fetchVisitCount) {
                        const data = await window.api.fetchVisitCount(pageId);
                        
                        if (countEl) {
                            countEl.style.opacity = '0';
                            setTimeout(() => {
                                countEl.textContent = data.count;
                                countEl.style.transition = 'opacity 0.5s ease';
                                countEl.style.opacity = '1';
                            }, 50);
                        }
                    } else {
                        console.warn('[Post Visit] api.js not loaded');
                        throw new Error('api.js not loaded');
                    }
                } catch (e) {
                    console.warn('[Post Visit] Failed:', e.message);
                    if (countEl) {
                        if (isLocal) {
                            countEl.textContent = 'Local';
                        } else {
                            countEl.textContent = '-';
                        }
                    }
                }
            })();

            // Render Tags
            if (metadata.tags) {
                let tags = [];
                if (Array.isArray(metadata.tags)) {
                    tags = metadata.tags;
                } else {
                    const cleaned = metadata.tags.toString().replace(/^\[|\]$/g, '');
                    tags = cleaned.split(/,\s*/).filter(t => t);
                }
                
                postTags.innerHTML = tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('');
            }

            // Render Image
            const imageUrl = metadata.coverImage || categoryImages[category] || categoryImages['default'];
            if (headerBg) {
                headerBg.style.backgroundImage = `url('${imageUrl}')`;
            }

            // Render Content
            // Configure marked
            const renderer = new marked.Renderer();
            
            // Override image renderer to fix relative paths
            renderer.image = function(href, title, text) {
                // Ensure href is a string
                let cleanHref = href;
                if (typeof cleanHref !== 'string') {
                    cleanHref = String(cleanHref || '');
                }

                if (cleanHref && !cleanHref.startsWith('http') && !cleanHref.startsWith('//') && !cleanHref.startsWith('/')) {
                    // It's a relative path, prepend the posts directory
                    // We assume images are in the same directory as posts or in a subfolder
                    // But actually, usually images are in public/img or similar. 
                    // If the MD refers to "./img/pic.png", we need "public/posts/img/pic.png"
                    // Use finalPath's directory
                    const dir = finalPath.substring(0, finalPath.lastIndexOf('/') + 1);
                    cleanHref = dir + cleanHref;
                }
                return `<img src="${cleanHref}" alt="${text}" title="${title || ''}" class="rounded-lg shadow-md max-w-full h-auto my-6 mx-auto">`;
            };

            marked.setOptions({
                renderer: renderer,
                breaks: true,  // Enable GFM line breaks
                gfm: true,
                highlight: function(code, lang) {
                    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                    return hljs.highlight(code, { language }).value;
                },
                langPrefix: 'hljs language-'
            });

            // 封面作 hero 背景
            if (metadata.coverImage && headerBg) {
                headerBg.style.backgroundImage = `url('${metadata.coverImage}')`;
                headerBg.style.backgroundSize = 'cover';
                headerBg.style.backgroundPosition = 'center';
            }

            postContent.innerHTML = marked.parse(content);

            // Render Math (KaTeX)
            renderMathInElement(postContent, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false
            });

            // Generate TOC
            generateTOC();

            // Setup Scroll Spy
            setupScrollSpy();

            // Add Copy Buttons
            addCopyButtons();

            // Re-init icons
            lucide.createIcons();

            // Setup Progress Bar
            setupProgressBar();

            // Load Recommendations
            loadRecommendations(metadata, file);

            // Load Post Navigation
            loadPostNavigation(file);
            
            // Setup Lightbox
            setupImageLightbox();

        } catch (error) {
            console.error('Load Post Error:', error);
            postContent.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                    <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                        <i data-lucide="alert-octagon" class="w-12 h-12 text-red-500"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">无法加载文章</h2>
                    <p class="text-gray-500 dark:text-gray-400 mb-2">抱歉，我们无法找到或加载这篇文章。</p>
                    <p class="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded max-w-lg mx-auto overflow-x-auto">
                        ${error.message}
                    </p>
                    <div class="mt-8">
                        <a href="blog.html" class="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                            <i data-lucide="arrow-left" class="w-4 h-4 mr-2"></i>
                            返回文章列表
                        </a>
                    </div>
                </div>
            `;
            postTitle.textContent = '404 Not Found';
            lucide.createIcons();
        }
    }

    function setupProgressBar() {
        const progressBar = document.getElementById('progress-bar');
        if (!progressBar) return;

        window.addEventListener('scroll', () => {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollPercent = (scrollTop / scrollHeight) * 100;
            progressBar.style.width = scrollPercent + '%';
        });
    }

    function generateTOC() {
        const tocMobile = document.getElementById('toc-mobile');
        const tocDesktop = document.getElementById('toc-desktop');
        const headers = postContent.querySelectorAll('h1, h2, h3');

        if (headers.length === 0) {
            const empty = '<div style="text-align:center;padding:24px 0;color:var(--rs-text-dim);font-size:.8rem"><i data-lucide="file-text"></i><p style="margin-top:6px">暂无目录</p></div>';
            if (tocMobile) tocMobile.innerHTML = empty;
            if (tocDesktop) tocDesktop.innerHTML = empty;
            return;
        }

        function buildHTML() {
            let html = '<ul class="toc-list">';
            let prevLevel = 1;
            headers.forEach((header, i) => {
                if (!header.id) header.id = 'heading-' + i;
                const level = parseInt(header.tagName.substring(1));
                if (level > prevLevel) html += '<ul class="toc-sublist">';
                if (level < prevLevel) html += '</ul>'.repeat(prevLevel - level);
                html += `<li class="toc-item"><a href="#${header.id}" class="toc-link toc-h${level}" data-target="${header.id}">${header.textContent}</a></li>`;
                prevLevel = level;
            });
            html += '</ul>'.repeat(prevLevel);
            return html;
        }

        const html = buildHTML();
        if (tocMobile) tocMobile.innerHTML = html;
        if (tocDesktop) tocDesktop.innerHTML = html;
    }

    function setupScrollSpy() {
        const headers = postContent.querySelectorAll('h1, h2, h3');
        if (headers.length === 0) return;

        const observerOptions = {
            root: null,
            rootMargin: '-100px 0px -60% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
                    const links = document.querySelectorAll(`.toc-link[data-target="${entry.target.id}"]`);
                    links.forEach(l => {
                        l.classList.add('active');
                        // 自动滚动 TOC 使当前项可见
                        const nav = l.closest('.post-toc-nav');
                        if (nav) {
                            const navRect = nav.getBoundingClientRect();
                            const linkRect = l.getBoundingClientRect();
                            if (linkRect.bottom > navRect.bottom || linkRect.top < navRect.top) {
                                l.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            }
                        }
                    });
                }
            });
        }, observerOptions);

        headers.forEach(header => observer.observe(header));
    }

    function addCopyButtons() {
        const preBlocks = postContent.querySelectorAll('pre');
        preBlocks.forEach(pre => {
            if (pre.querySelector('.code-header')) return;

            pre.classList.add('group');
            
            // Create Header
            const header = document.createElement('div');
            header.className = 'code-header';
            
            // Window Controls
            const controls = document.createElement('div');
            controls.className = 'window-controls';
            controls.innerHTML = `
                <div class="window-dot red"></div>
                <div class="window-dot yellow"></div>
                <div class="window-dot green"></div>
            `;
            
            // Language Label
            const code = pre.querySelector('code');
            let lang = '';
            if (code) {
                const classes = code.className.split(' ');
                const langClass = classes.find(c => c.startsWith('language-'));
                if (langClass) {
                    lang = langClass.replace('language-', '');
                }
            }
            const langLabel = document.createElement('div');
            langLabel.className = 'lang-label';
            langLabel.textContent = lang;

            // Copy Button
            const button = document.createElement('button');
            button.className = 'code-copy-btn';
            button.innerHTML = '<i data-lucide="copy"></i><span>复制</span>';
            button.title = '复制代码';
            
            button.addEventListener('click', async () => {
                if (!code) return;
                try {
                    await navigator.clipboard.writeText(code.innerText);
                    button.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 text-green-500"></i>';
                    setTimeout(() => {
                        button.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5"></i>';
                        lucide.createIcons();
                    }, 2000);
                    lucide.createIcons();
                } catch (err) {
                    console.error('Failed to copy:', err);
                    button.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5 text-red-500"></i>';
                    lucide.createIcons();
                }
            });

            // Right side container
            const rightSide = document.createElement('div');
            rightSide.className = 'flex items-center gap-2';
            rightSide.appendChild(langLabel);
            rightSide.appendChild(button);

            header.appendChild(controls);
            header.appendChild(rightSide);
            
            // Insert header
            pre.insertBefore(header, code);
        });
    }

    async function loadRecommendations(currentMetadata, currentFile) {
        const containerMobile = document.getElementById('recommendations-container-mobile');
        const listMobile = document.getElementById('recommendations-list-mobile');
        const containerDesktop = document.getElementById('recommendations-container-desktop');
        const listDesktop = document.getElementById('recommendations-list-desktop');
        
        if (!containerMobile && !containerDesktop) return;

        try {
            const response = await fetch('public/posts/posts.json');
            if (!response.ok) return;
            
            const posts = await response.json();
            
            // Get current tags
            let currentTags = [];
            if (currentMetadata.tags) {
                if (Array.isArray(currentMetadata.tags)) {
                    currentTags = currentMetadata.tags;
                } else {
                    const cleaned = currentMetadata.tags.toString().replace(/^\[|\]$/g, '');
                    currentTags = cleaned.split(/,\s*/).filter(t => t);
                }
            }

            if (currentTags.length === 0) return;

            // Score posts
            const scoredPosts = posts
                .filter(post => post.file !== currentFile)
                .map(post => {
                    let score = 0;
                    let postTags = [];
                    
                    if (post.tags) {
                        if (Array.isArray(post.tags)) {
                            postTags = post.tags;
                        } else {
                            postTags = post.tags.toString().replace(/^\[|\]$/g, '').split(/,\s*/).filter(t => t);
                        }
                    }
                    
                    if (postTags.length > 0) {
                        const matchingTags = postTags.filter(tag => currentTags.includes(tag));
                        score = matchingTags.length;
                    }
                    return { post, score };
                })
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 4);

            if (scoredPosts.length === 0) return;

            const renderList = (items) => items.map(item => `
                <a href="post.html?file=${item.post.file}" class="reco-item">
                    <span class="reco-dot"></span>
                    <span class="reco-title">${item.post.title}</span>
                </a>
            `).join('');

            const html = renderList(scoredPosts);

            if (containerMobile && listMobile) {
                listMobile.innerHTML = html;
                containerMobile.classList.remove('hidden');
            }

            if (containerDesktop && listDesktop) {
                listDesktop.innerHTML = html;
                containerDesktop.classList.remove('hidden');
            }
            
            lucide.createIcons();

        } catch (err) {
            console.error('Failed to load recommendations:', err);
        }
    }

    // Theme switching for code blocks
    function updateCodeTheme(isDark) {
        const themeLink = document.getElementById('hljs-theme');
        if (themeLink) {
            // Use atom-one-dark for dark mode, and a lighter theme for light mode
            // atom-one-light provides good contrast
            const newTheme = isDark 
                ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css' 
                : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css';
            
            // Only update if changed to avoid flickering
            if (themeLink.href !== newTheme) {
                themeLink.href = newTheme;
            }
        }
    }

    // Listen for theme changes from main.js
    window.addEventListener('themeChange', (e) => {
        updateCodeTheme(e.detail.isDark);
    });

    // Initial check
    const isDark = document.documentElement.classList.contains('dark');
    updateCodeTheme(isDark);

    function setupTOCDrawer() {
        const toggleBtn = document.getElementById('toc-toggle');
        const closeBtn = document.getElementById('toc-close');
        const drawer = document.getElementById('toc-drawer');
        const overlay = document.getElementById('toc-overlay');
        
        if (!toggleBtn || !drawer || !overlay) return;

        // 移动端(<900px)且有目录内容时显示按钮
        if (window.innerWidth <= 900 && document.querySelector('.toc-link')) {
            toggleBtn.style.display = 'flex';
        }

        function openDrawer() {
            drawer.style.transform = 'translateX(0)';
            overlay.style.display = 'block';
            overlay.style.opacity = '1';
            document.body.style.overflow = 'hidden';
        }

        function closeDrawer() {
            drawer.style.transform = 'translateX(100%)';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }

        toggleBtn.addEventListener('click', openDrawer);
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        overlay.addEventListener('click', closeDrawer);
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !drawer.classList.contains('translate-x-full')) {
                closeDrawer();
            }
        });
    }
