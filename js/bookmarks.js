async function __initBookmarks() {
  const cfgEl = document.getElementById('gh-bookmarks-config');
  if (!cfgEl) return;
  const params = new URLSearchParams(window.location.search);
  const owner = params.get('owner') || cfgEl.getAttribute('data-owner') || '';
  const repo = params.get('repo') || cfgEl.getAttribute('data-repo') || '';
  // if (!owner || !repo) return; // Allow running without GH config

  const catMap = {};

  const subCatNames = {
    others: '其他'
  };

  // Fetch Categories Config
  let dynamicCategories = {};
  try {
    const res = await fetch('public/data/categories.json');
    if (res.ok) {
      dynamicCategories = await res.json();
    }
  } catch (e) {
    console.error('Failed to load categories config', e);
  }

  // Define Base Category Order (Fixed)
  const fixedOrder = [
    'my_favorites',
    'ai_tools',
    'education',
    'resources',
    'life_tools',
    'entertainment',
    'literature_reading',
    'dev_tech',
    'blogs_tutorials',
    'system_resources',
    'video_editing'
  ];

  // Merge with dynamic keys: Fixed -> New -> Others
  const allKeys = Object.keys(dynamicCategories);
  const newKeys = allKeys.filter(k => !fixedOrder.includes(k) && k !== 'others');
  
  const categoryOrder = [...fixedOrder, ...newKeys, 'others'];

  // Define SubCategory Order based on subCatNames keys
  const subCategoryOrder = Object.keys(subCatNames);

  function getCategoryIndex(cat) {
    const idx = categoryOrder.indexOf(cat);
    return idx === -1 ? 999 : idx;
  }

  function getSubCategoryIndex(subCat) {
    const idx = subCategoryOrder.indexOf(subCat);
    return idx === -1 ? 999 : idx;
  }

  function normalizeCategory(raw) {
    const s = (raw || '').trim();
    if (!s) return 'others';
    // If it's one of our known categories, return it
    if (categoryOrder.includes(s)) return s;
    
    // Fallback
    return 'others';
  }

  function parseIssue(issue) {
    const body = issue.body || '';
    const lines = body.split('\n').map(l => l.trim());
    const urlLine = lines.find(l => /^url\s*:/i.test(l));
    const catLine = lines.find(l => /^category\s*:/i.test(l));
    const subCatLine = lines.find(l => /^(sub|subcategory)\s*:/i.test(l));
    const titleLine = lines.find(l => /^title\s*:/i.test(l));
    const iconLine = lines.find(l => /^icon\s*:/i.test(l));
    const orderLine = lines.find(l => /^order\s*:/i.test(l));
    const url = urlLine ? urlLine.split(':').slice(1).join(':').trim() : '';
    const categoryRaw = catLine ? catLine.split(':').slice(1).join(':').trim() : '';
    const category = normalizeCategory(categoryRaw);
    const subCatRaw = subCatLine ? subCatLine.split(':').slice(1).join(':').trim() : '';
    // Normalize subcategory if needed, for now just trim/lower
    const secondaryCategory = subCatRaw.toLowerCase().trim() || 'others';

    const note = body
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/<img[^>]*>/g, '')
      .replace(/^url\s*:.*$/gim, '')
      .replace(/^category\s*:.*$/gim, '')
      .replace(/^(sub|subcategory)\s*:.*$/gim, '')
      .replace(/^title\s*:.*$/gim, '')
      .replace(/^icon\s*:.*$/gim, '')
      .replace(/#[\w\u4e00-\u9fa5-]+/g, '')
      .trim();
    const titleFromBody = titleLine ? titleLine.split(':').slice(1).join(':').trim() : '';
    const title = (titleFromBody || (issue.title && issue.title.trim()) || url).trim();
    const icon = iconLine ? iconLine.split(':').slice(1).join(':').trim() : '';
    const order = orderLine ? Number(orderLine.split(':').slice(1).join(':').trim()) : NaN;
    return { title, url, category, secondaryCategory, note, icon, number: issue.number, order };
  }

  // Global handler for favicon errors to support fallback strategy
  window.handleFaviconError = function(img, hostname) {
    const currentSrc = img.src;
    // Strategy: Yandex (High Res) -> Iowen (CN Stable) -> DNSPod (CN Stable) -> DuckDuckGo -> Lucide
    
    if (currentSrc.includes('yandex.net')) {
      // Fallback 1: Iowen (China friendly, slightly lower res but very stable)
      img.src = `https://api.iowen.cn/favicon/${hostname}.png`;
    } else if (currentSrc.includes('api.iowen.cn')) {
      // Fallback 2: DNSPod (Tencent)
      img.src = `https://statics.dnspod.cn/proxy_favicon/_/favicon?domain=${hostname}`;
    } else if (currentSrc.includes('dnspod.cn')) {
      // Fallback 3: DuckDuckGo
      img.src = `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
    } else {
      // All failed, hide image and show lucide icon
      img.style.display = 'none';
      const icon = img.nextElementSibling;
      if (icon) {
        icon.style.display = 'block';
        icon.classList.remove('hidden');
      }
    }
  };

  function cardHTML(item) {
    let desc = item.note || item.desc || '';
    if (!desc && item.number) desc = '来自 GitHub Issues 管理';
    
    const iconName = item.icon && item.icon.length ? item.icon : 'bookmark';
    const issueAttr = item.number ? `data-issue="${item.number}"` : 'data-local="true"';
    
    let hostname = '';
    try {
      hostname = new URL(item.url).hostname;
    } catch(e) {}
    
    // Use Yandex with size=120 parameter for High Resolution
    const faviconUrl = hostname ? `https://favicon.yandex.net/favicon/${hostname}?size=120` : '';

    return (
      `<div class="card-wrapper h-full" ${issueAttr}>` +
      `<a href="${item.url}" target="_blank" rel="noopener" class="group relative flex flex-col h-full bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-800 hover:-translate-y-1">` +
      `<div class="flex items-start justify-between mb-4">` +
      `<div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 text-slate-600 dark:text-slate-400 shrink-0 flex items-center justify-center">` +
      (faviconUrl 
        ? `<img src="${faviconUrl}" alt="" loading="lazy" class="w-6 h-6 object-contain" onerror="handleFaviconError(this, '${hostname}')">`
        : '') +
      `<i data-lucide="${iconName}" class="w-6 h-6 ${faviconUrl ? 'hidden' : ''}"></i>` +
      `</div>` +
      `<i data-lucide="external-link" class="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors ml-2 shrink-0"></i>` +
      `</div>` +
      `<h3 class="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words line-clamp-2">${item.title}</h3>` +
      `<p class="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mt-auto">${desc}</p>` +
      `</a>` +
      `</div>`
    );
  }

  function displayName(cat) {
    if (dynamicCategories[cat]) {
        const val = dynamicCategories[cat];
        return typeof val === 'string' ? val : val.name;
    }
    const m = {
      my_favorites: '我的收藏',
      ai_tools: 'AI与工具类',
      education: '学习与教育',
      resources: '资源下载与搜索',
      life_tools: '生活实用工具',
      entertainment: '娱乐与兴趣',
      literature_reading: '文学与阅读',
      dev_tech: '开发与技术',
      blogs_tutorials: '博客与教程',
      system_resources: '系统与破解资源',
      video_editing: '视频剪辑',
      others: '其他/无法归类'
    };
    return m[cat] || cat;
  }

  function createCategorySection(cat) {
    const name = displayName(cat);
    const nav = document.querySelector('.sticky.top-16');
    if (nav) {
      const bar = nav.querySelector('div') || nav;
      let exists = false;
      try {
        if (bar.querySelector(`a[href="#${CSS.escape(cat)}"]`)) exists = true;
      } catch(e) {}
      if (!exists && bar.querySelector(`a[href="#${cat}"]`)) exists = true;

      if (!exists) {
        const link = document.createElement('a');
        link.href = `#${cat}`;
        link.className = 'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm';
        link.textContent = name;
        bar.appendChild(link);
      }
    }
    const container = document.getElementById('category-list') || document.getElementById('bookmarks-container');
    if (container) {
      if (!document.getElementById(cat)) {
        const section = document.createElement('div');
        section.id = cat;
        section.className = 'mb-24 scroll-mt-32';
        section.innerHTML = `
          <div class="flex items-center mb-10 border-b-2 border-slate-200 dark:border-slate-800 pb-4">
            <div class="p-3 bg-white dark:bg-slate-900 rounded-xl mr-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <i data-lucide="tags" class="w-8 h-8 text-blue-600 dark:text-blue-400"></i>
            </div>
            <h2 class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">${name}</h2>
          </div>
          <div class="space-y-16 sub-categories-container"></div>`;
        container.appendChild(section);
      }
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }

  function createSubCategorySection(cat, subCat) {
    let mainSection = document.getElementById(cat);
    if (!mainSection) {
      createCategorySection(cat);
      mainSection = document.getElementById(cat);
    }
    
    let container = mainSection.querySelector('.sub-categories-container');
    if (!container) {
      // Upgrade existing structure: remove old direct grid if empty/present and add container
      const oldGrid = mainSection.querySelector('.card-grid');
      if (oldGrid) oldGrid.remove();
      
      container = document.createElement('div');
      container.className = 'space-y-16 sub-categories-container';
      mainSection.appendChild(container);
    }

    const subId = `${cat}-${subCat}`;
    let subSection = document.getElementById(subId);
    
    if (!subSection) {
      const subName = subCatNames[subCat] || subCat;
      subSection = document.createElement('div');
      subSection.id = subId;
      subSection.className = 'sub-category group/sub';
      // Only show subheader if it's not 'others' or if we want to be explicit
      const headerHtml = (subCat !== 'others') 
        ? `<div class="flex items-center gap-4 mb-6">
             <div class="flex items-center justify-center px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
               ${subName}
             </div>
             <div class="h-px bg-slate-200 dark:bg-slate-800 flex-grow rounded-full group-hover/sub:bg-slate-300 dark:group-hover/sub:bg-slate-700 transition-colors"></div>
           </div>`
        : '';
        
      subSection.innerHTML = `
        ${headerHtml}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 card-grid"></div>
      `;
      
      // Sort and Insert
      const currentIdx = getSubCategoryIndex(subCat);
      const siblings = Array.from(container.children);
      let inserted = false;
      
      for (const sib of siblings) {
        const sibCat = sib.id.split('-')[1]; // id is cat-subCat
        const sibIdx = getSubCategoryIndex(sibCat);
        if (currentIdx < sibIdx) {
          container.insertBefore(subSection, sib);
          inserted = true;
          break;
        }
      }
      
      if (!inserted) {
        container.appendChild(subSection);
      }
    }
    return subSection.querySelector('.card-grid');
  }

  function appendToCategory(cat, html, item) {
    // Determine subcategory
    const subCat = (item && item.secondaryCategory) ? item.secondaryCategory : 'others';
    
    let container = createSubCategorySection(cat, subCat);
    
    if (!container) {
      // Fallback
      createCategorySection(cat);
      container = createSubCategorySection(cat, 'others');
    }
    
    if (!container) return;
    container.insertAdjacentHTML('beforeend', html);
  }

  async function loadLocalBookmarks() {
    try {
      const res = await fetch('public/data/bookmarks.json');
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      
      // Group by category
      const bucket = {};
      data.forEach(item => {
        const cat = item.category || 'others';
        if (!bucket[cat]) bucket[cat] = [];
        bucket[cat].push(item);
      });
      
      // Render
      Object.keys(bucket).forEach(cat => {
        const arr = bucket[cat];
        arr.forEach(item => {
          const html = cardHTML(item);
          appendToCategory(cat, html, item);
        });
      });

      // Sort Categories in DOM
      const catContainer = document.getElementById('category-list') || document.getElementById('bookmarks-container');
      const navBar = document.querySelector('.sticky.top-16 div') || document.querySelector('.sticky.top-16');
      
      if (catContainer) {
         // If using category-list, we can just sort all children as they are all categories
         // If using bookmarks-container (fallback), we must be careful not to sort static elements
         const isDedicatedList = catContainer.id === 'category-list';
         
         const sections = Array.from(catContainer.children);
         
         if (isDedicatedList) {
             sections.sort((a, b) => {
                return getCategoryIndex(a.id) - getCategoryIndex(b.id);
             });
             sections.forEach(sec => catContainer.appendChild(sec));
         } else {
             // Fallback logic: only sort elements that look like categories (have ids in our list)
             // But simpler to just leave as is if we forced category-list usage
             // For safety, let's just sort sections that have IDs matching our categories
             // This part is tricky if mixed with static content. 
             // Since we added category-list to HTML, we should be good.
         }
      }

      if (navBar) {
         const links = Array.from(navBar.querySelectorAll('a'));
         links.sort((a, b) => {
            const catA = a.getAttribute('href').replace('#', '');
            const catB = b.getAttribute('href').replace('#', '');
            return getCategoryIndex(catA) - getCategoryIndex(catB);
         });
         links.forEach(link => navBar.appendChild(link));
      }

      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    } catch (e) {
      console.error('Failed to load local bookmarks', e);
    }
  }

  async function loadIssues() {
    if (!owner || !repo) return;
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`;
    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      data = await res.json();
    } catch (e) {
      return;
    }
    if (!Array.isArray(data)) return;
    
    const bucket = {};
    let configOrder = [];
    
    data.forEach(issue => {
      if (issue.title.trim() === 'config:categories') {
        configOrder = issue.body.split('\n').map(s => s.trim()).filter(s => s);
        return;
      }
      const item = parseIssue(issue);
      if (!item.url) return;
      const cat = item.category || 'others';
      if (!bucket[cat]) bucket[cat] = [];
      bucket[cat].push(item);
    });

    const definedCats = Object.keys(bucket);
    // Combine configOrder, categoryOrder and remaining definedCats
    const sortedCats = [...new Set([...configOrder, ...categoryOrder, ...definedCats])].filter(c => bucket[c]);

    sortedCats.forEach(cat => {
      const arr = bucket[cat];
      arr.sort((a,b)=>{
        const ao = Number.isFinite(a.order) ? a.order : 1e9;
        const bo = Number.isFinite(b.order) ? b.order : 1e9;
        if (ao !== bo) return ao - bo;
        return (a.title||'').localeCompare(b.title||'');
      });
      arr.forEach(item => {
        const html = cardHTML(item);
        appendToCategory(cat, html, item);
      });
    });

    // Enforce DOM order based on sortedCats
    const catContainer = document.getElementById('category-list') || document.getElementById('bookmarks-container');
    const navBar = document.querySelector('.sticky.top-16 div') || document.querySelector('.sticky.top-16');
    if (catContainer && navBar) {
      sortedCats.forEach(cat => {
        // Reorder Sections
        const sec = document.getElementById(cat);
        if (sec) catContainer.appendChild(sec);
        
        // Reorder Nav Links
        let link = null;
        try {
          link = navBar.querySelector(`a[href="#${CSS.escape(cat)}"]`);
        } catch(e) {
          link = navBar.querySelector(`a[href="#${cat}"]`);
        }
        if (!link) {
           // Fallback for complex chars
           const all = navBar.querySelectorAll('a');
           for (const a of all) {
             if (a.getAttribute('href') === '#' + cat) {
               link = a;
               break;
             }
           }
        }
        if (link) navBar.appendChild(link);
      });
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }

  function cleanupUI() {
    // List of all known categories to check
    const allCats = [
      'my_favorites', 'ai_tools', 'education', 'resources', 'life_tools', 'entertainment', 
      'literature_reading', 'dev_tech', 'blogs_tutorials', 'system_resources', 'video_editing', 'others'
    ];
    
    // Also check any dynamically created sections
    const sections = document.querySelectorAll('.scroll-mt-32');
    sections.forEach(sec => {
      if (!allCats.includes(sec.id)) allCats.push(sec.id);
    });

    const nav = document.querySelector('.sticky.top-16');
    const navBar = nav ? (nav.querySelector('div') || nav) : null;

    allCats.forEach(cat => {
      const section = document.getElementById(cat);
      if (!section) {
         // If section doesn't exist, hide nav link if exists
         if (navBar) {
            const link = navBar.querySelector(`a[href="#${cat}"]`);
            if (link) link.style.display = 'none';
         }
         return;
      }
      
      // Check if section has any card-wrapper
      const hasCards = section.querySelector('.card-wrapper');
      
      if (!hasCards) {
        section.style.display = 'none';
        if (navBar) {
          const link = navBar.querySelector(`a[href="#${cat}"]`);
          if (link) link.style.display = 'none';
        }
      } else {
        section.style.display = '';
        if (navBar) {
          const link = navBar.querySelector(`a[href="#${cat}"]`);
          if (link) link.style.display = '';
        }
      }
    });
  }

  // Execute loads in parallel and cleanup incrementally to improve perceived speed
  const localLoad = loadLocalBookmarks().then(() => cleanupUI());
  const issuesLoad = loadIssues().then(() => cleanupUI());
  
  await Promise.all([localLoad, issuesLoad]);

  // Initialize Search (after data load)
  const searchInput = document.getElementById('bookmark-search');
  const noResultsMsg = document.getElementById('no-results');

  if (searchInput) {
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
          if (e.key === '/' && document.activeElement !== searchInput) {
              e.preventDefault();
              searchInput.focus();
          }
          if (e.key === 'Escape' && document.activeElement === searchInput) {
              searchInput.blur();
          }
      });

      searchInput.addEventListener('input', (e) => {
          const term = e.target.value.toLowerCase().trim();
          
          let hasAnyResult = false;
          
          // 1. Check all cards
          const allCards = document.querySelectorAll('.card-wrapper');
          allCards.forEach(cardWrapper => {
              const card = cardWrapper.querySelector('a.group'); // The actual card content
              // Support searching text content directly if structure varies
              const text = cardWrapper.textContent.toLowerCase();
              
              if (text.includes(term)) {
                  cardWrapper.style.display = '';
              } else {
                  cardWrapper.style.display = 'none';
              }
          });

          // 2. Update Sub-categories visibility
          const subCategories = document.querySelectorAll('.sub-category');
          subCategories.forEach(sub => {
              const visibleCards = sub.querySelectorAll('.card-wrapper:not([style*="display: none"])');
              if (visibleCards.length > 0) {
                  sub.style.display = '';
              } else {
                  sub.style.display = 'none';
              }
          });

          // 3. Update Main Categories visibility
          const mainCategories = document.querySelectorAll('.scroll-mt-32');
          mainCategories.forEach(section => {
              const visibleSubs = section.querySelectorAll('.sub-category:not([style*="display: none"])');
              // Check if any visible subs or direct cards (fallback)
              const visibleCards = section.querySelectorAll('.card-wrapper:not([style*="display: none"])');
              
              if (visibleSubs.length > 0 || visibleCards.length > 0) {
                  section.style.display = '';
                  hasAnyResult = true;
              } else {
                  section.style.display = 'none';
              }
          });

          if (hasAnyResult) {
              if (noResultsMsg) noResultsMsg.classList.add('hidden');
          } else {
              if (noResultsMsg) noResultsMsg.classList.remove('hidden');
          }
      });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __initBookmarks);
} else {
  __initBookmarks();
}
