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
            
            postMeta.innerHTML = `
                <span class="flex items-center"><i data-lucide="calendar" class="w-4 h-4 mr-1"></i> ${dateStr}</span>
                <span class="mx-2">•</span>
                <span class="flex items-center"><i data-lucide="folder" class="w-4 h-4 mr-1"></i> ${category}</span>
                <span class="mx-2">•</span>
                <span class="flex items-center"><i data-lucide="user" class="w-4 h-4 mr-1"></i> ${metadata.author || 'Thoi'}</span>
            `;

            // Render Tags
            if (metadata.tags) {
                let tags = [];
                if (Array.isArray(metadata.tags)) {
                    tags = metadata.tags;
                } else {
                    const cleaned = metadata.tags.toString().replace(/^\[|\]$/g, '');
                    tags = cleaned.split(/,\s*/).filter(t => t);
                }
                
                postTags.innerHTML = tags.map(tag => `
                    <span class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                        #${tag}
                    </span>
                `).join('');
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
            const emptyState = '<div class="flex flex-col items-center justify-center py-6 text-gray-400"><i data-lucide="file-x" class="w-8 h-8 mb-2 opacity-50"></i><p class="text-xs">暂无目录</p></div>';
            if (tocMobile) tocMobile.innerHTML = emptyState;
            if (tocDesktop) tocDesktop.innerHTML = emptyState;
            return;
        }

        // Helper to build TOC structure
        function buildTOCList() {
            const rootUl = document.createElement('ul');
            rootUl.className = 'toc-list space-y-1 relative'; // Added relative for line positioning
            
            // Add vertical line track
            const track = document.createElement('div');
            track.className = 'absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800 hidden';
            rootUl.appendChild(track);
            
            const stack = [{level: 0, element: rootUl}];
            let lastLi = null;

            headers.forEach((header, index) => {
                if (!header.id) {
                    header.id = `heading-${index}`;
                }
                
                const level = parseInt(header.tagName.substring(1));
                
                while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }
                
                if (level > stack[stack.length - 1].level) {
                    if (lastLi) {
                        const subUl = document.createElement('ul');
                        // Hide H3+ by default (level > 2)
                        const shouldHide = level > 2;
                        
                        // Refined sublist styling: no border-l, cleaner spacing
                        subUl.className = `toc-sublist sublist-level-${level} ${shouldHide ? 'hidden' : ''} pl-4 mt-1 space-y-1 relative`;
                        lastLi.appendChild(subUl);
                        
                        stack.push({level: level, element: subUl});
                    } else {
                        stack[stack.length - 1].level = level;
                    }
                }
                
                const currentUl = stack[stack.length - 1].element;
                
                const li = document.createElement('li');
                li.className = 'toc-item relative';
                
                // Refined link styling
                // Use border-l-2 transparent for active state indicator instead of full background
                li.innerHTML = `
                    <a href="#${header.id}" 
                       class="toc-link block py-1.5 px-3 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 border-l-2 border-transparent hover:border-gray-300 dark:hover:border-gray-700 whitespace-normal break-words leading-snug"
                       title="${header.textContent}"
                       data-target="${header.id}">
                        ${header.textContent}
                    </a>
                `;
                
                currentUl.appendChild(li);
                lastLi = li;
            });
            return rootUl;
        }

        if (tocMobile) {
            tocMobile.innerHTML = '';
            tocMobile.appendChild(buildTOCList());
        }
        
        if (tocDesktop) {
            tocDesktop.innerHTML = '';
            tocDesktop.appendChild(buildTOCList());
        }
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
                    // 1. Reset all active states
                    document.querySelectorAll('.toc-item').forEach(item => item.classList.remove('active'));
                    document.querySelectorAll('.toc-link').forEach(link => {
                        link.classList.remove('text-blue-600', 'dark:text-blue-400', 'border-blue-500', 'font-medium');
                        link.classList.add('text-gray-500', 'dark:text-gray-400', 'border-transparent');
                    });

                    // 2. Collapse deep levels (keep H1/H2 visible)
                    document.querySelectorAll('.toc-sublist').forEach(list => {
                        const isBigTitle = list.classList.contains('sublist-level-1') || list.classList.contains('sublist-level-2');
                        if (!isBigTitle) {
                            list.classList.add('hidden');
                        }
                    });

                    // 3. Activate current link
                    const activeLinks = document.querySelectorAll(`.toc-link[data-target="${entry.target.id}"]`);
                    activeLinks.forEach(activeLink => {
                        activeLink.classList.remove('text-gray-500', 'dark:text-gray-400', 'border-transparent');
                        activeLink.classList.add('text-blue-600', 'dark:text-blue-400', 'border-blue-500', 'font-medium');
                        
                        // 4. Expand parents
                        let parent = activeLink.parentElement; // li.toc-item
                        if (parent) {
                            // If this LI has a child UL (sublist), expand it
                            const childUl = parent.querySelector('ul.toc-sublist');
                            if (childUl) {
                                childUl.classList.remove('hidden');
                            }
                        }

                        // Traverse up to expand all parent lists
                        let curr = parent;
                        while (curr) {
                            if (curr.classList.contains('toc-sublist')) {
                                curr.classList.remove('hidden');
                            }
                            curr = curr.parentElement;
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
            button.className = 'p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-500 dark:text-gray-400';
            button.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5"></i>';
            button.title = '复制';
            
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
                <a href="post.html?file=${item.post.file}" class="block p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group border border-transparent hover:border-blue-100 dark:hover:border-blue-800">
                    <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 mb-2">
                        ${item.post.title}
                    </h4>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center">
                            <i data-lucide="tag" class="w-3 h-3 mr-1"></i>
                            匹配 ${item.score} 个标签
                        </span>
                        <span class="text-[10px] text-gray-400">
                            ${new Date(item.post.date).toLocaleDateString()}
                        </span>
                    </div>
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

        function openDrawer() {
            drawer.classList.remove('translate-x-full');
            overlay.classList.remove('hidden');
            // Force reflow
            void overlay.offsetWidth;
            overlay.classList.remove('opacity-0');
            document.body.style.overflow = 'hidden';
        }

        function closeDrawer() {
            drawer.classList.add('translate-x-full');
            overlay.classList.add('opacity-0');
            setTimeout(() => {
                overlay.classList.add('hidden');
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
