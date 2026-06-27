/**
 * 星空笔记 — 全新博客引擎
 * Sidebar + Article List 布局
 */
let allPosts = [];
let currentView = 'grid';
let currentPage = 1;
const PER_PAGE = 12;
let aiDailyData = [];

// ── Fetch ──
async function loadPosts() {
    try {
        const res = await fetch('public/posts/posts.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        allPosts = (await res.json()) || [];
        allPosts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        renderSidebar();
        renderContent();
    } catch (e) {
        document.getElementById('blog-content').innerHTML = '<div class="blog-empty">加载失败: ' + e.message + '</div>';
    }
}

// ── Sidebar ──
function renderSidebar() {
    const cats = {};
    const tags = {};
    allPosts.forEach(p => {
        const c = p.category || '其他';
        cats[c] = (cats[c] || 0) + 1;
        (p.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; });
    });

    document.getElementById('sidebar-stats').innerHTML = `
        <div class="stat"><i data-lucide="file-text" style="width:14px;height:14px;opacity:.4"></i><strong>${allPosts.length}</strong> 篇文章</div>
        <div class="stat"><i data-lucide="folder-tree" style="width:14px;height:14px;opacity:.4"></i><strong>${Object.keys(cats).length}</strong> 个分类</div>
        <div class="stat"><i data-lucide="tags" style="width:14px;height:14px;opacity:.4"></i><strong>${Object.keys(tags).length}</strong> 个标签</div>
    `;

    document.getElementById('sidebar-cats').innerHTML = Object.entries(cats).map(([c, n]) =>
        `<button class="sidebar-cat" onclick="filterByCat(this, '${c.replace(/'/g, "\\'")}')">${c}<span class="count">${n}</span></button>`
    ).join('');

    const topTags = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 15);
    document.getElementById('sidebar-tags').innerHTML = topTags.map(([t, n]) =>
        `<button class="sidebar-tag" onclick="filterByTag('${t.replace(/'/g, "\\'")}')">${t} ${n}</button>`
    ).join('');

    if (window.lucide) lucide.createIcons();
}

let activeCat = null;
let activeTag = null;

function filterByCat(btn, cat) {
    document.querySelectorAll('.sidebar-cat').forEach(b => b.classList.remove('active'));
    if (activeCat === cat) { activeCat = null; } else { activeCat = cat; btn.classList.add('active'); }
    activeTag = null;
    currentPage = 1;
    renderContent();
}

function filterByTag(tag) {
    activeCat = null;
    document.querySelectorAll('.sidebar-cat').forEach(b => b.classList.remove('active'));
    activeTag = activeTag === tag ? null : tag;
    currentPage = 1;
    renderContent();
}

// ── Content ──
function renderContent() {
    const container = document.getElementById('blog-content');
    const searchTerm = (document.getElementById('blog-search').value || '').toLowerCase().trim();

    let posts = allPosts;

    // Filter
    if (searchTerm) {
        posts = posts.filter(p =>
            (p.title || '').toLowerCase().includes(searchTerm) ||
            (p.excerpt || '').toLowerCase().includes(searchTerm) ||
            (p.tags || []).some(t => t.toLowerCase().includes(searchTerm))
        );
    }
    if (activeCat) {
        posts = posts.filter(p => (p.category || '其他') === activeCat);
    }
    if (activeTag) {
        posts = posts.filter(p => (p.tags || []).includes(activeTag));
    }

    // Clear tab active state
    document.querySelectorAll('.blog-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.blog-tab[data-view="${currentView}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Render by view
    if (currentView === 'aidaily') {
        renderAIDaily(container);
        document.getElementById('blog-pagination').innerHTML = '';
        return;
    }
    if (currentView === 'tags') {
        renderTagsView(container, posts);
        document.getElementById('blog-pagination').innerHTML = '';
        return;
    }
    if (currentView === 'directory') {
        renderDirView(container, posts);
        document.getElementById('blog-pagination').innerHTML = '';
        return;
    }
    if (currentView === 'timeline') {
        renderTimelineView(container, posts);
        document.getElementById('blog-pagination').innerHTML = '';
        return;
    }

    // Grid = article list
    renderArticleList(container, posts);
}

// ── Article List ──
function renderArticleList(container, posts) {
    if (posts.length === 0) {
        container.innerHTML = '<div class="blog-empty">没有匹配的文章</div>';
        document.getElementById('blog-pagination').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(posts.length / PER_PAGE);
    const start = (currentPage - 1) * PER_PAGE;
    const page = posts.slice(start, start + PER_PAGE);

    container.innerHTML = '<div class="article-list">' + page.map((p, i) => {
        const date = new Date(p.date);
        const dateStr = isNaN(date) ? p.date : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        const yearStr = isNaN(date) ? '' : date.getFullYear();
        const isFirst = currentPage === 1 && i === 0;
        const tags = (p.tags || []).slice(0, 3);
        const ref = currentView !== 'grid' ? '&ref=' + encodeURIComponent(window.location.hash || '#' + currentView) : '';
        const thumb = p.coverImage
            ? `<div class="article-thumb"><img src="${p.coverImage}" loading="lazy" onerror="this.parentElement.style.display='none'" alt=""></div>`
            : `<div class="article-thumb article-thumb--placeholder"><i data-lucide="file-text"></i></div>`;
        return `
            <a href="post.html?file=${encodeURIComponent(p.file)}${ref}" class="article-item${isFirst ? ' article-item--featured' : ''}">
                <span class="article-date">${yearStr}<br>${dateStr}</span>
                ${thumb}
                <div class="article-body">
                    <h3 class="article-title">${p.title}</h3>
                    <p class="article-excerpt">${p.excerpt || ''}</p>
                    <div class="article-meta">
                        <span class="article-cat">${p.category || '笔记'}</span>
                        ${tags.map(t => `<span class="article-tag">#${t}</span>`).join('')}
                        <span class="article-readtime">${p.readTime || 5} min</span>
                    </div>
                </div>
            </a>`}).join('') + '</div>';

    // Pagination
    const pag = document.getElementById('blog-pagination');
    if (totalPages <= 1) { pag.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }
    pag.innerHTML = html;

    if (window.lucide) lucide.createIcons();
}

function goPage(n) { currentPage = n; renderContent(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ── Timeline ──
function renderTimelineView(container, posts) {
    if (posts.length === 0) { container.innerHTML = '<div class="blog-empty">没有匹配的文章</div>'; return; }
    const groups = {};
    posts.forEach(p => {
        const ym = (p.date || '').substring(0, 7);
        if (!groups[ym]) groups[ym] = [];
        groups[ym].push(p);
    });
    container.innerHTML = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([ym, items]) => `
        <h3 style="font-family:var(--h);font-size:.85rem;color:var(--dim);margin:28px 0 14px;padding-left:16px;border-left:3px solid var(--a)">${ym} <span style="font-size:.7rem;opacity:.5">${items.length}篇</span></h3>
        <div class="article-list">${items.map(p => {
            const d = new Date(p.date);
            const ds = isNaN(d) ? '' : d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            const tags = (p.tags || []).slice(0, 3);
            const thumb = p.coverImage
                ? `<div class="article-thumb"><img src="${p.coverImage}" loading="lazy" onerror="this.parentElement.style.display='none'" alt=""></div>`
                : `<div class="article-thumb article-thumb--placeholder"><i data-lucide="file-text"></i></div>`;
            return `<a href="post.html?file=${encodeURIComponent(p.file)}&ref=%23timeline" class="article-item">
                <span class="article-date">${ds}</span>
                ${thumb}
                <div class="article-body">
                    <h3 class="article-title">${p.title}</h3>
                    <p class="article-excerpt">${p.excerpt || ''}</p>
                    <div class="article-meta">
                        <span class="article-cat">${p.category||'笔记'}</span>
                        ${tags.map(t => `<span class="article-tag">#${t}</span>`).join('')}
                        <span class="article-readtime">${p.readTime||5} min</span>
                    </div>
                </div></a>`;
        }).join('')}</div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

// ── Directory ──
function renderDirView(container, posts) {
    if (posts.length === 0) { container.innerHTML = '<div class="blog-empty">没有匹配的文章</div>'; return; }
    const groups = {};
    posts.forEach(p => {
        const c = p.category || '其他';
        if (!groups[c]) groups[c] = [];
        groups[c].push(p);
    });
    container.innerHTML = Object.entries(groups).sort().map(([cat, items]) => `
        <h3 style="font-family:var(--h);font-size:.85rem;color:var(--dim);margin:28px 0 14px;padding-left:16px;border-left:3px solid var(--a)">${cat} <span style="font-size:.7rem;opacity:.5">${items.length}篇</span></h3>
        <div class="article-list">${items.map(p => {
            const d = new Date(p.date);
            const ds = isNaN(d) ? '' : d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            return `<a href="post.html?file=${encodeURIComponent(p.file)}&ref=%23directory" class="article-item">
                <span class="article-date">${ds}</span>
                <div class="article-body">
                    <h3 class="article-title">${p.title}</h3>
                    <p class="article-excerpt">${p.excerpt || ''}</p>
                </div></a>`;
        }).join('')}</div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

// ── Tags View ──
function renderTagsView(container, posts) {
    const tags = {};
    posts.forEach(p => (p.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));
    const sorted = Object.entries(tags).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) { container.innerHTML = '<div class="blog-empty">没有标签</div>'; return; }
    const max = sorted[0]?.[1] || 1;
    container.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:20px 0">' +
        sorted.map(([t, n]) => {
            const size = .7 + (n / max) * .9;
            return `<button class="sidebar-tag" style="font-size:${size}rem" onclick="filterByTag('${t.replace(/'/g, "\\'")}')">${t} <span style="opacity:.5">${n}</span></button>`;
        }).join('') + '</div>';
}

// ── AI Daily ──
async function renderAIDaily(container) {
    try {
        if (aiDailyData.length === 0) {
            const res = await fetch('public/data/ai-daily.json');
            if (res.ok) aiDailyData = await res.json();
        }
        if (!aiDailyData.length) { container.innerHTML = '<div class="blog-empty">暂无 AI 日报，等待青龙脚本推送...</div>'; return; }
        aiDailyData.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        container.innerHTML = '<div class="article-list">' + aiDailyData.map(d => {
            const date = new Date(d.date);
            const ds = isNaN(date) ? '' : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            return `<a href="post.html?ai=${encodeURIComponent(d.id)}" class="ai-daily-item">
                <span class="article-date">${ds}</span>
                <div class="article-body">
                    <h3 class="article-title"><span class="ai-badge">AI</span>${d.title}</h3>
                    <p class="article-excerpt">${d.summary || ''}</p>
                    <div class="article-meta">
                        ${d.projectCount ? `<span class="article-cat">${d.projectCount} 个项目</span>` : ''}
                        ${(d.tags||[]).slice(0,3).map(t => `<span class="article-tag">#${t}</span>`).join('')}
                    </div>
                </div></a>`;
        }).join('') + '</div>';
    } catch (e) {
        container.innerHTML = '<div class="blog-empty">AI 日报加载失败</div>';
    }
    if (window.lucide) lucide.createIcons();
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    // 恢复 hash 中的视图状态
    if (window.location.hash === '#aidaily') currentView = 'aidaily';
    if (window.location.hash === '#timeline') currentView = 'timeline';
    if (window.location.hash === '#directory') currentView = 'directory';
    if (window.location.hash === '#tags') currentView = 'tags';

    loadPosts();
    document.getElementById('blog-search').addEventListener('input', () => { currentPage = 1; renderContent(); });
    document.querySelectorAll('.blog-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            currentView = btn.dataset.view;
            currentPage = 1;
            activeCat = null;
            activeTag = null;
            document.querySelectorAll('.sidebar-cat').forEach(b => b.classList.remove('active'));
            window.location.hash = currentView === 'grid' ? '' : '#' + currentView;
            renderContent();
        });
    });
    if (window.lucide) lucide.createIcons();
});
