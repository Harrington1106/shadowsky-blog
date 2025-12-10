let bookmarks = [];
let selectedIndices = new Set();
let categories = {}; // Will be loaded from server

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await fetchCategories();
    fetchBookmarks();
    lucide.createIcons();
});

async function fetchCategories() {
    try {
        const res = await fetch('/api/categories');
        categories = await res.json();
        renderCategoryOptions();
        renderCategoryTOC();
    } catch (e) {
        const msg = window.location.port !== '3000' 
            ? 'Failed to load categories. Please use port 3000'
            : 'Failed to load categories';
        showToast(msg, 'error');
        console.error(e);
    }
}

function getCatName(key) {
    const cat = categories[key];
    if (!cat) return key;
    return typeof cat === 'string' ? cat : cat.name;
}

function getCatGroup(key) {
    const cat = categories[key];
    if (!cat) return 'Uncategorized';
    return typeof cat === 'string' ? 'Default' : (cat.group || 'Default');
}

function renderCategoryOptions() {
    const select = document.getElementById('category');
    const bulkSelect = document.getElementById('bulk-category');
    const currentVal = select.value;
    
    // Group categories by their group
    const groups = {};
    Object.entries(categories).forEach(([key, val]) => {
        const groupName = typeof val === 'string' ? 'Default' : (val.group || 'Default');
        const name = typeof val === 'string' ? val : val.name;
        
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push({ key, name });
    });

    const renderOptions = (targetSelect) => {
        targetSelect.innerHTML = targetSelect === bulkSelect ? '<option value="">选择目标分类...</option>' : '';
        
        // Sort groups: Default last, others alphabetical or by specific order if needed
        Object.keys(groups).sort().forEach(groupName => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            
            groups[groupName].forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.key;
                option.textContent = cat.name;
                optgroup.appendChild(option);
            });
            
            targetSelect.appendChild(optgroup);
        });
    };

    renderOptions(select);
    if (bulkSelect) renderOptions(bulkSelect);

    if (currentVal && categories[currentVal]) {
        select.value = currentVal;
    }
}

// --- TOC & Drag-Drop Logic ---

// Define Fixed Order (Same as js/bookmarks.js)
const fixedOrder = [
    'my_favorites', 'ai_tools', 'education', 'resources', 'life_tools', 'entertainment',
    'literature_reading', 'dev_tech', 'blogs_tutorials', 'system_resources', 'video_editing'
];

function getCategoryOrder() {
    const allKeys = Object.keys(categories);
    const newKeys = allKeys.filter(k => !fixedOrder.includes(k) && k !== 'others');
    return [...fixedOrder, ...newKeys, 'others'];
}

function renderCategoryTOC() {
    const toc = document.getElementById('category-toc');
    if (!toc) return;
    toc.innerHTML = '';

    const sortedCats = getCategoryOrder();

    sortedCats.forEach(catKey => {
        if (!categories[catKey] && catKey !== 'others') return;
        
        const catName = getCatName(catKey);
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200 group drop-target';
        item.dataset.category = catKey;
        
        item.innerHTML = `
            <span class="truncate font-medium">${catName}</span>
            <span class="text-xs text-slate-400 group-hover:text-blue-500 bg-slate-100 group-hover:bg-blue-50 px-1.5 py-0.5 rounded-full transition-colors count-badge">0</span>
        `;

        // Click to scroll
        item.onclick = () => {
            const section = document.getElementById(`section-${catKey}`);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight effect
                section.classList.add('ring-2', 'ring-blue-500');
                setTimeout(() => section.classList.remove('ring-2', 'ring-blue-500'), 2000);
            }
        };

        // Drop Events
        item.ondragover = (e) => {
            e.preventDefault();
            item.classList.add('bg-blue-50', 'border-blue-300');
        };
        
        item.ondragleave = (e) => {
            item.classList.remove('bg-blue-50', 'border-blue-300');
        };

        item.ondrop = (e) => {
            e.preventDefault();
            item.classList.remove('bg-blue-50', 'border-blue-300');
            const data = e.dataTransfer.getData('text/plain');
            if (data) {
                const { index } = JSON.parse(data);
                moveBookmarkToCategory(index, catKey);
            }
        };

        toc.appendChild(item);
    });
    
    updateTOCCounts();
}

function updateTOCCounts() {
    const toc = document.getElementById('category-toc');
    if (!toc) return;
    
    const counts = {};
    bookmarks.forEach(b => {
        const cat = b.category || 'others';
        counts[cat] = (counts[cat] || 0) + 1;
    });

    Array.from(toc.children).forEach(el => {
        const cat = el.dataset.category;
        const badge = el.querySelector('.count-badge');
        if (badge) badge.textContent = counts[cat] || 0;
    });
}

function moveBookmarkToCategory(index, targetCat) {
    const item = bookmarks[index];
    if (!item || item.category === targetCat) return;

    item.category = targetCat;
    renderBookmarks();
    saveBookmarks(); // Auto save
    showToast(`Moved to ${getCatName(targetCat)}`);
}

// --- Category Management ---

window.showNewCategoryModal = function() {
    const modal = document.getElementById('new-category-modal');
    const content = document.getElementById('new-category-modal-content');
    modal.classList.remove('hidden');
    // Force reflow
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
};

window.closeNewCategoryModal = function() {
    const modal = document.getElementById('new-category-modal');
    const content = document.getElementById('new-category-modal-content');
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.createNewCategory = async function() {
    const idInput = document.getElementById('new-cat-id');
    const nameInput = document.getElementById('new-cat-name');
    const groupInput = document.getElementById('new-cat-group');
    
    const id = idInput.value.trim();
    const name = nameInput.value.trim();
    const group = groupInput.value.trim() || 'Default';

    if (!id || !name) {
        showToast('ID and Name are required', 'error');
        return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        showToast('ID must be alphanumeric (a-z, 0-9, -, _)', 'error');
        return;
    }

    if (categories[id]) {
        showToast('Category ID already exists', 'error');
        return;
    }

    // Save as object with group
    categories[id] = { name, group };
    
    try {
        const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categories)
        });
        
        if (res.ok) {
            showToast('Category created');
            renderCategoryOptions();
            closeNewCategoryModal();
            document.getElementById('category').value = id;
            idInput.value = '';
            nameInput.value = '';
            groupInput.value = '';
        } else {
            showToast('Failed to save category', 'error');
            delete categories[id];
        }
    } catch (e) {
        console.error(e);
        showToast('Network error', 'error');
        delete categories[id];
    }
};

async function fetchBookmarks() {
    try {
        const res = await fetch('/api/bookmarks');
        bookmarks = await res.json();
        renderBookmarks();
    } catch (e) {
        const msg = window.location.port !== '3000' 
            ? 'Failed to load bookmarks. Please ensure you are accessing via http://localhost:3000'
            : 'Failed to load bookmarks';
        showToast(msg, 'error');
        console.error(e);
    }
}

function renderBookmarks() {
    const container = document.getElementById('bookmarks-list');
    container.innerHTML = '';

    // Group bookmarks by Group -> Category
    const groupedData = {};

    // Initialize groups from categories definition
    Object.entries(categories).forEach(([key, val]) => {
        const groupName = typeof val === 'string' ? 'Default' : (val.group || 'Default');
        if (!groupedData[groupName]) groupedData[groupName] = {};
        groupedData[groupName][key] = [];
    });

    // Sort bookmarks into buckets
    bookmarks.forEach((item, index) => {
        const catKey = item.category || 'others';
        // If category exists in definitions
        if (categories[catKey]) {
            const groupName = getCatGroup(catKey);
            if (!groupedData[groupName]) groupedData[groupName] = {}; // Should exist but be safe
            if (!groupedData[groupName][catKey]) groupedData[groupName][catKey] = [];
            
            item._index = index;
            groupedData[groupName][catKey].push(item);
        } else {
            // Fallback for undefined categories
            if (!groupedData['Others']) groupedData['Others'] = {};
            if (!groupedData['Others'][catKey]) groupedData['Others'][catKey] = [];
            
            item._index = index;
            groupedData['Others'][catKey].push(item);
        }
    });

    // Render Groups (Flattened to Categories based on unified order)
    // We want to match the Blog Order: Fixed -> Dynamic -> Others
    
    const sortedCats = getCategoryOrder();

    sortedCats.forEach(catKey => {
        // Find items for this category across all groups (though bookmarks usually have just one cat)
        // But our data structure `groupedData` is Group -> Category -> Items
        // We need to find where this category lives in groupedData
        
        // Actually, we can just look up the items directly if we indexed them differently
        // But `groupedData` was useful for "Group Headers".
        // The user wants "Same order as blog". The blog doesn't show Group Headers prominently.
        // Let's stick to the Blog's "Section per Category" layout.
        
        // Find items for this category
        let items = [];
        // Search in groupedData
        Object.values(groupedData).forEach(groupCats => {
            if (groupCats[catKey]) {
                items = items.concat(groupCats[catKey]);
            }
        });

        if (items.length === 0 && catKey !== 'others') return; // Skip empty unless forced? No, skip empty.
        if (items.length === 0) return;

        const catName = getCatName(catKey);

        const section = document.createElement('div');
        section.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6';
        section.id = `section-${catKey}`; // For TOC linking
        
        const header = document.createElement('div');
        header.className = 'bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm bg-slate-50/90';
        
        const allSelected = items.every(item => selectedIndices.has(item._index));
        
        header.innerHTML = `
            <h3 class="font-bold text-lg text-slate-800 flex items-center">
                <input type="checkbox" 
                    onchange="toggleCategorySelection('${catKey}', this.checked)" 
                    class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-3"
                    ${allSelected ? 'checked' : ''}>
                ${catName}
                <span class="ml-2 text-sm font-normal text-slate-500">(${items.length})</span>
            </h3>
        `;
        section.appendChild(header);

        // Grid Layout
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4';
        
        items.forEach(item => {
            const isSelected = selectedIndices.has(item._index);
            const card = document.createElement('div');
            card.className = `relative group rounded-lg border transition-all duration-200 p-4 flex flex-col h-full ${
                isSelected 
                ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' 
                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md cursor-move'
            }`;
            
            // Drag Properties
            card.draggable = true;
            card.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ index: item._index }));
                e.dataTransfer.effectAllowed = 'move';
                card.classList.add('opacity-50');
            };
            card.ondragend = () => {
                card.classList.remove('opacity-50');
            };

            card.onclick = (e) => {
                if (e.target.tagName === 'A' || e.target.closest('a') || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'INPUT') return;
                toggleSelection(item._index, !isSelected);
            };

            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                        <input type="checkbox" 
                            onchange="toggleSelection(${item._index}, this.checked)"
                            class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                            ${isSelected ? 'checked' : ''}
                            onclick="event.stopPropagation()">
                        <h4 class="font-semibold text-slate-900 truncate" title="${item.title}">${item.title}</h4>
                    </div>
                    <a href="${item.url}" target="_blank" class="text-slate-400 hover:text-blue-500 flex-shrink-0 ml-2" onclick="event.stopPropagation()">
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                    </a>
                </div>
                
                <p class="text-sm text-slate-500 line-clamp-2 mb-3 flex-1" title="${item.desc || ''}">${item.desc || 'No description'}</p>
                
                <div class="flex justify-end gap-2 pt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editBookmark(${item._index}); event.stopPropagation();" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Edit">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteBookmark(${item._index}); event.stopPropagation();" class="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        section.appendChild(grid);
        container.appendChild(section);
    });

    updateBulkActionBar();
    updateTOCCounts();
    lucide.createIcons();
}

// --- Selection Logic ---

function toggleSelection(index, checked) {
    if (checked) {
        selectedIndices.add(index);
    } else {
        selectedIndices.delete(index);
    }
    renderBookmarks();
}

function toggleCategorySelection(catKey, checked) {
    const items = bookmarks.filter(b => (b.category || 'others') === catKey);
    items.forEach(item => {
        if (checked) {
            selectedIndices.add(item._index);
        } else {
            selectedIndices.delete(item._index);
        }
    });
    renderBookmarks();
}

function clearSelection() {
    selectedIndices.clear();
    renderBookmarks();
}

function updateBulkActionBar() {
    const bar = document.getElementById('bulk-actions');
    const countSpan = document.getElementById('selected-count');
    const count = selectedIndices.size;
    
    countSpan.textContent = count;
    
    if (count > 0) {
        bar.classList.remove('hidden');
        bar.classList.add('flex');
    } else {
        bar.classList.add('hidden');
        bar.classList.remove('flex');
    }
}

// --- Bulk Actions ---

function bulkDelete() {
    if (selectedIndices.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIndices.size} 个收藏吗?`)) return;
    
    // Sort indices descending to avoid index shift issues when splicing
    const indices = Array.from(selectedIndices).sort((a, b) => b - a);
    
    indices.forEach(index => {
        bookmarks.splice(index, 1);
    });
    
    selectedIndices.clear();
    renderBookmarks();
    showToast('批量删除成功');
}

function bulkMove() {
    const targetCat = document.getElementById('bulk-category').value;
    if (!targetCat) {
        showToast('请选择目标分类', 'error');
        return;
    }
    
    selectedIndices.forEach(index => {
        if (bookmarks[index]) {
            bookmarks[index].category = targetCat;
        }
    });
    
    selectedIndices.clear();
    renderBookmarks();
    showToast(`已移动到 ${getCatName(targetCat)}`);
}

// --- Existing Logic ---

function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('title').value.trim();
    const url = document.getElementById('url').value.trim();
    const desc = document.getElementById('desc').value.trim();
    const category = document.getElementById('category').value;
    const editIndex = parseInt(document.getElementById('edit-index').value);

    if (!title || !url) {
        showToast('Title and URL are required', 'error');
        return;
    }

    const newItem = {
        title,
        url,
        desc,
        category,
        addedAt: new Date().toISOString()
    };

    if (editIndex >= 0) {
        // Update existing
        if (bookmarks[editIndex].addedAt) newItem.addedAt = bookmarks[editIndex].addedAt;
        bookmarks[editIndex] = newItem;
        showToast('Bookmark updated');
    } else {
        // Add new
        bookmarks.unshift(newItem); // Add to top
        showToast('Bookmark added');
    }

    resetForm();
    renderBookmarks();
}

function editBookmark(index) {
    const item = bookmarks[index];
    if (!item) return;

    document.getElementById('title').value = item.title;
    document.getElementById('url').value = item.url;
    document.getElementById('desc').value = item.desc || '';
    document.getElementById('category').value = item.category || 'others';
    document.getElementById('edit-index').value = index;
    
    document.getElementById('submit-btn-text').textContent = '更新';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteBookmark(index) {
    if (confirm('确定要删除这个收藏吗?')) {
        bookmarks.splice(index, 1);
        renderBookmarks();
        showToast('Bookmark deleted');
    }
}

function resetForm() {
    document.getElementById('bookmark-form').reset();
    document.getElementById('edit-index').value = '-1';
    document.getElementById('submit-btn-text').textContent = '添加';
}

async function saveBookmarks() {
    try {
        const dataToSave = bookmarks.map(({ _index, ...rest }) => rest);
        
        const res = await fetch('/api/bookmarks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSave)
        });

        if (res.ok) {
            showToast('Changes saved successfully!');
            fetchBookmarks(); // Reload
        } else {
            showToast('Failed to save changes', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
        console.error(e);
    }
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50 ${
        type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
    }`;
    
    // Show
    setTimeout(() => {
        toast.classList.remove('translate-y-20', 'opacity-0');
    }, 10);

    // Hide after 3s
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}