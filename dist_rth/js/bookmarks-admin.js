function __initBookmarksAdmin() {
  function isLocal() {
    const h = location.hostname;
    if (location.protocol === 'file:') return true;
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (/^192\.168\./.test(h)) return true;
    if (/^10\./.test(h)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
    return false;
  }
  if (!isLocal()) return;
  const cfgEl = document.getElementById('gh-bookmarks-config');
  if (!cfgEl) return;
  const params = new URLSearchParams(window.location.search);
  let owner = params.get('owner') || cfgEl.getAttribute('data-owner') || '';
  let repo = params.get('repo') || cfgEl.getAttribute('data-repo') || '';
  if (!owner || !repo) return;

  // Helper functions
  let existing = new Map();
  const usedCategories = new Set();

  function normalizeUrl(u) {
    try {
      const url = new URL(u);
      const host = url.hostname.toLowerCase();
      const path = url.pathname.replace(/\/$/, '');
      return host + path;
    } catch (_) { return (u || '').trim(); }
  }

  async function loadExistingUrls() {
    try {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`);
      if (!r.ok) return;
      const items = await r.json();
      existing.clear();
      usedCategories.clear();
      items.forEach(it => {
        const body = it.body || '';
        const m = body.match(/^\s*url\s*:\s*(.+)$/im);
        if (m && m[1]) {
          const key = normalizeUrl(m[1].trim());
          if (key) existing.set(key, { number: it.number, title: it.title });
        }
        const cm = body.match(/^\s*category\s*:\s*(.+)$/im);
        if (cm && cm[1]) usedCategories.add(cm[1].trim());
      });
    } catch (_) {}
  }

  function checkDuplicate(u) {
    const hint = overlay.querySelector('#bm-url-hint');
    const createBtn = overlay.querySelector('#gh-create');
    const key = normalizeUrl(u);
    const hit = key && existing.get(key);
    if (hit) {
      hint.innerHTML = `已存在：<a href="https://github.com/${owner}/${repo}/issues/${hit.number}" target="_blank" class="underline">#${hit.number} ${hit.title}</a>`;
      hint.classList.remove('hidden');
      createBtn.disabled = true;
      createBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      hint.classList.add('hidden');
      hint.textContent = '';
      createBtn.disabled = false;
      createBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  // Admin UI
  const btn = document.createElement('button');
  btn.id = 'gh-admin-btn';
  btn.className = 'fixed bottom-8 left-8 z-50 px-3 py-2 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700';
  btn.textContent = '管理书签';
  document.body.appendChild(btn);

  const overlay = document.createElement('div');
  overlay.id = 'gh-admin-modal';
  overlay.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black/40';
  overlay.innerHTML = `
    <div class="max-w-lg w-full mx-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
      <div class="text-lg font-bold mb-4">书签管理</div>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <input id="gh-owner" class="border rounded-lg px-3 py-2" placeholder="owner" value="${owner}">
        <input id="gh-repo" class="border rounded-lg px-3 py-2" placeholder="repo" value="${repo}">
      </div>
      <input id="gh-token" type="password" class="border rounded-lg px-3 py-2 w-full mb-3" placeholder="GitHub Token">
      <input id="bm-title" class="border rounded-lg px-3 py-2 w-full mb-3" placeholder="标题">
      <div class="flex gap-2 mb-1">
        <input id="bm-url" class="flex-1 border rounded-lg px-3 py-2" placeholder="URL">
        <button id="bm-auto" class="px-3 py-2 rounded-lg border">自动获取</button>
      </div>
      <div id="bm-url-hint" class="text-xs text-red-600 mb-3 hidden"></div>
      <input list="cat-list" id="bm-cat" class="border rounded-lg px-3 py-2 w-full mb-3" placeholder="选择或输入分类">
      <datalist id="cat-list"></datalist>
      <div id="bm-labels" class="grid grid-cols-2 gap-2 mb-3"></div>
      <textarea id="bm-note" class="border rounded-lg px-3 py-2 w-full mb-4" rows="4" placeholder="备注"></textarea>
      <div class="flex justify-end gap-3">
        <button id="gh-close" class="px-3 py-2 rounded-lg border">取消</button>
        <button id="gh-create" class="px-3 py-2 rounded-lg bg-blue-600 text-white">创建</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  btn.addEventListener('click', () => { overlay.classList.remove('hidden'); overlay.classList.add('flex'); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); } });
  overlay.querySelector('#gh-close').addEventListener('click', () => { overlay.classList.add('hidden'); overlay.classList.remove('flex'); });

  async function loadLabels() {
    try {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/labels?per_page=100`);
      if (!r.ok) return;
      const labels = await r.json();
      const catList = overlay.querySelector('#cat-list');
      const labBox = overlay.querySelector('#bm-labels');
      catList.innerHTML = '';
      labBox.innerHTML = '';
      const labelNames = labels.map(l => l.name);
      
      // Case-insensitive merge for cleaner dropdown
      const unified = new Map();
      [...labelNames, ...usedCategories].forEach(c => {
        const key = c.toLowerCase();
        // Prefer the Label case (usually Title Case) over the user-typed case
        if (!unified.has(key) || labelNames.includes(c)) {
          unified.set(key, c);
        }
      });

      const cats = Array.from(unified.values()).filter(n => n.toLowerCase() !== 'bookmark');
      cats.sort((a, b) => a.localeCompare(b));
      
      cats.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        catList.appendChild(opt);
      });
      labels.forEach(l => {
        const id = `lab-${l.name}`;
        const w = document.createElement('label');
        w.className = 'flex items-center gap-2 border rounded-lg px-2 py-1';
        w.innerHTML = `<input type="checkbox" class="label-item" id="${id}" value="${l.name}"><span>${l.name}</span>`;
        labBox.appendChild(w);
        if (l.name.toLowerCase() === 'bookmark') w.querySelector('input').checked = true;
      });
    } catch(e) {}
  }

  function suggestCat(url, cats) {
    const s = url.toLowerCase();
    const m = [
      {k:['astronomy','telescope','space','nasa','eso','nao'],v:'astronomy'},
      {k:['nature','wildlife','earth','geo','生态','自然'],v:'nature'},
      {k:['news','verge','wired','techcrunch','资讯'],v:'news'},
      {k:['ai','ml','chat','gpt','kimi','claude','bard','anthropic','moonshot','人工智能'],v:'ai'},
      {k:['dev','code','github','docs','api','编程','开发'],v:'dev'},
      {k:['design','ui','ux','figma','inspiration','设计'],v:'design'},
      {k:['learn','course','edu','ke','学习'],v:'learning'},
      {k:['tool','tools','app','utility','插件','工具'],v:'tools'},
      {k:['fun','entertain','game','娱乐'],v:'entertainment'}
    ];
    for (const g of m) if (g.k.some(x=>s.includes(x))) return cats.find(c=>c.toLowerCase().includes(g.v)) || '';
    return '';
  }

  async function fetchText(u) {
    try {
      const prox = 'https://r.jina.ai/http://' + u.replace(/^https?:\/\//,'');
      const res = await fetch(prox);
      if (!res.ok) return '';
      return await res.text();
    } catch(_) { return ''; }
  }

  function deriveTitle(u, t) {
    const m = t && t.match(/^#\s*(.+)$/m);
    if (m && m[1]) return m[1].trim();
    try { return new URL(u).hostname; } catch(_) { return u; }
  }

  function deriveDesc(t) {
    if (!t) return '';
    const p = t.split('\n').map(x=>x.trim()).filter(x=>x.length>40);
    return p[0] ? p[0].slice(0,200) : '';
  }

  overlay.querySelector('#bm-auto').addEventListener('click', async () => {
    const url = overlay.querySelector('#bm-url').value.trim();
    if (!url) return;
    const txt = await fetchText(url);
    const title = deriveTitle(url, txt);
    const desc = deriveDesc(txt);
    const titleEl = overlay.querySelector('#bm-title');
    const noteEl = overlay.querySelector('#bm-note');
    if (!titleEl.value) titleEl.value = title;
    if (!noteEl.value && desc) noteEl.value = desc;
    const cats = Array.from(overlay.querySelectorAll('#cat-list option')).map(o=>o.value).filter(Boolean);
    const sug = suggestCat(url, cats);
    if (sug) overlay.querySelector('#bm-cat').value = sug;
    checkDuplicate(url);
  });

  const urlInput = overlay.querySelector('#bm-url');
  urlInput.addEventListener('input', () => checkDuplicate(urlInput.value.trim()));
  urlInput.addEventListener('blur', () => checkDuplicate(urlInput.value.trim()));

  overlay.querySelector('#gh-create').addEventListener('click', async () => {
    owner = overlay.querySelector('#gh-owner').value.trim() || owner;
    repo = overlay.querySelector('#gh-repo').value.trim() || repo;
    const token = overlay.querySelector('#gh-token').value.trim();
    const title = overlay.querySelector('#bm-title').value.trim();
    const bmUrl = overlay.querySelector('#bm-url').value.trim();
    const bmCat = overlay.querySelector('#bm-cat').value.trim();
    const note = overlay.querySelector('#bm-note').value.trim();
    const labels = Array.from(overlay.querySelectorAll('.label-item:checked')).map(i=>i.value);
    if (existing.get(normalizeUrl(bmUrl))) return;
    if (!token || !title || !bmUrl) return;
    
    // Auto-prepend https:// if missing
    let finalUrl = bmUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    sessionStorage.setItem('gh_token', token);
    const body = `URL: ${finalUrl}\nCategory: ${bmCat}\n\n${note}`;
    const api = `https://api.github.com/repos/${owner}/${repo}/issues`;
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
      body: JSON.stringify({ title, body, labels })
    });
    if (res.ok) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); location.reload(); }
  });

  loadExistingUrls().then(loadLabels);

  // Admin Menu
  let adminMenu = document.getElementById('gh-card-menu');
  if (!adminMenu) {
    adminMenu = document.createElement('div');
    adminMenu.id = 'gh-card-menu';
    adminMenu.className = 'fixed z-50 hidden min-w-[180px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 transform scale-95 opacity-0 transition-all duration-200 origin-top-left ring-1 ring-black/5';
    adminMenu.innerHTML = `
      <button data-act="edit-cat" class="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition-colors">分类</button>
      <button data-act="edit-icon" class="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-3 transition-colors">图标</button>
      <div class="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-2"></div>
      <button data-act="archive" class="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-3 transition-colors">归档</button>
    `;
    document.body.appendChild(adminMenu);
  }

  function showAdminMenu(x, y, issue) {
    adminMenu.dataset.issue = issue || '';
    adminMenu.style.left = `${x}px`;
    adminMenu.style.top = `${y}px`;
    adminMenu.classList.remove('hidden');
    requestAnimationFrame(() => {
      adminMenu.classList.remove('opacity-0', 'scale-95');
      adminMenu.classList.add('opacity-100', 'scale-100');
    });
  }
  function hideAdminMenu() {
    adminMenu.classList.add('hidden');
    adminMenu.classList.remove('opacity-100', 'scale-100');
    adminMenu.classList.add('opacity-0', 'scale-95');
    adminMenu.dataset.issue = '';
  }

  async function patchIssue(number, fields, skipReload = false) {
    const token = sessionStorage.getItem('gh_token');
    if (!token) return;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
      body: JSON.stringify(fields)
    });
    if (res.ok && !skipReload) location.reload();
  }

  async function editBody(number, mutate, skipReload = false) {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`);
    if (!r.ok) return;
    const it = await r.json();
    const body = it.body || '';
    const next = mutate(body);
    await patchIssue(number, { body: next }, skipReload);
  }

  function upsertLine(body, key, val) {
    const lines = body.split('\n');
    const i = lines.findIndex(l => new RegExp(`^\\s*${key}\\s*:\\s*`, 'i').test(l));
    const line = `${key}: ${val}`;
    if (i >= 0) lines[i] = line; else lines.unshift(line);
    return lines.join('\n');
  }

  document.addEventListener('contextmenu', (e) => {
    const a = e.target.closest('a.group');
    if (!a) return;
    const wrap = a.closest('.card-wrapper');
    const issue = wrap?.dataset.issue;
    if (!issue) return;
    e.preventDefault();
    showAdminMenu(e.clientX, e.clientY, issue);
  });
  document.addEventListener('click', (e) => { if (!adminMenu.contains(e.target)) hideAdminMenu(); });

  adminMenu.addEventListener('click', (e) => {
    const act = e.target.getAttribute('data-act');
    const issue = adminMenu.dataset.issue;
    if (!act || !issue) return;
    if (act === 'archive') {
      patchIssue(issue, { state: 'closed' });
    } else if (act === 'edit-cat') {
      const val = prompt('分类');
      if (!val) return;
      editBody(issue, (b) => upsertLine(b, 'Category', val));
    } else if (act === 'edit-icon') {
      const val = prompt('图标，例如 bookmark、star、telescope');
      if (!val) return;
      editBody(issue, (b) => upsertLine(b, 'Icon', val));
    }
    hideAdminMenu();
  });

  // Sort Logic
  const sortBtn = document.createElement('button');
  sortBtn.id = 'gh-sort-btn';
  sortBtn.className = 'fixed bottom-20 left-8 z-50 px-3 py-2 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-500';
  sortBtn.textContent = '排序模式';
  document.body.appendChild(sortBtn);

  let sortEnabled = false;
  let dragSrc = null;

  function setDraggable(enabled) {
    // Bookmarks
    document.querySelectorAll('.card-grid .card-wrapper').forEach(w => {
      w.setAttribute('draggable', enabled ? 'true' : 'false');
      if (enabled) {
        w.addEventListener('dragstart', onDragStart);
        w.addEventListener('dragover', onDragOver);
        w.addEventListener('drop', onDrop);
      } else {
        w.removeEventListener('dragstart', onDragStart);
        w.removeEventListener('dragover', onDragOver);
        w.removeEventListener('drop', onDrop);
      }
    });
    // Categories (Nav links)
    const nav = document.querySelector('.sticky.top-16 div') || document.querySelector('.sticky.top-16');
    if (nav) {
      nav.querySelectorAll('a').forEach(a => {
        a.setAttribute('draggable', enabled ? 'true' : 'false');
        if (enabled) {
          a.style.cursor = 'move';
          a.addEventListener('dragstart', onCatDragStart);
          a.addEventListener('dragover', onCatDragOver);
          a.addEventListener('drop', onCatDrop);
        } else {
          a.style.cursor = '';
          a.removeEventListener('dragstart', onCatDragStart);
          a.removeEventListener('dragover', onCatDragOver);
          a.removeEventListener('drop', onCatDrop);
        }
      });
    }
  }

  function onDragStart(e) { dragSrc = this; e.dataTransfer.effectAllowed = 'move'; }
  function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function onDrop(e) {
    e.preventDefault();
    const grid = this.closest('.card-grid');
    if (!grid || !dragSrc) return;
    if (dragSrc === this) return;
    const children = Array.from(grid.children);
    const srcIndex = children.indexOf(dragSrc);
    const dstIndex = children.indexOf(this);
    if (srcIndex < 0 || dstIndex < 0) return;
    if (srcIndex < dstIndex) grid.insertBefore(dragSrc, this.nextSibling);
    else grid.insertBefore(dragSrc, this);
    persistOrder(grid);
  }

  let catDragSrc = null;
  function onCatDragStart(e) { catDragSrc = this; e.dataTransfer.effectAllowed = 'move'; }
  function onCatDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function onCatDrop(e) {
    e.preventDefault();
    if (!catDragSrc || catDragSrc === this) return;
    const parent = this.parentNode;
    const children = Array.from(parent.children);
    const srcIndex = children.indexOf(catDragSrc);
    const dstIndex = children.indexOf(this);
    if (srcIndex < dstIndex) parent.insertBefore(catDragSrc, this.nextSibling);
    else parent.insertBefore(catDragSrc, this);
    persistCatOrder();
  }

  async function persistOrder(grid) {
    const token = sessionStorage.getItem('gh_token');
    if (!token) return;
    const items = Array.from(grid.querySelectorAll('.card-wrapper'));
    let idx = 1;
    const promises = [];
    for (const el of items) {
      const num = el.dataset.issue;
      if (!num) continue;
      promises.push(editBody(num, (b) => upsertLine(b, 'Order', String(idx)), true));
      idx++;
    }
    await Promise.all(promises);
    location.reload();
  }

  async function persistCatOrder() {
    const token = sessionStorage.getItem('gh_token');
    if (!token) return;
    const nav = document.querySelector('.sticky.top-16 div') || document.querySelector('.sticky.top-16');
    if (!nav) return;
    const cats = Array.from(nav.querySelectorAll('a')).map(a => {
      const h = a.getAttribute('href');
      return h ? h.replace('#', '') : '';
    }).filter(Boolean);
    
    const container = document.querySelector('.max-w-7xl');
    if (container) {
      cats.forEach(cat => {
        const sec = document.getElementById(cat);
        if (sec) container.appendChild(sec);
      });
    }

    let configNum = null;
    try {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`);
      if (r.ok) {
        const issues = await r.json();
        const cfg = issues.find(i => i.title.trim() === 'config:categories');
        if (cfg) configNum = cfg.number;
      }
    } catch (_) {}

    if (configNum) {
      await patchIssue(configNum, { body: cats.join('\n') });
    } else {
      const api = `https://api.github.com/repos/${owner}/${repo}/issues`;
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
        body: JSON.stringify({ title: 'config:categories', body: cats.join('\n') })
      });
      if (res.ok) location.reload();
    }
  }

  sortBtn.addEventListener('click', () => {
    sortEnabled = !sortEnabled;
    sortBtn.textContent = sortEnabled ? '退出排序' : '排序模式';
    setDraggable(sortEnabled);
  });

  const mo = new MutationObserver(() => { if (sortEnabled) setDraggable(true); });
  mo.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __initBookmarksAdmin);
} else {
  __initBookmarksAdmin();
}