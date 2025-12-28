// Global State
console.log('Admin script loading...');
console.log('Script load time:', new Date().toISOString());

let bookmarks = [];
let snapshots = [];
let media = { anime: [], manga: [] };
let feeds = [];
let videos = [];
let stats = [];

let API_BASE = '/api';
let USE_MOCK = false;
let STATIC_MODE = false;
let ADMIN_TOKEN = '';
let IS_TOKEN_VALID = false;

// --- Utils ---

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Prevent duplicate static mode toasts
    if (msg.includes('静态预览模式') && document.querySelector('.toast-static-mode')) {
        return;
    }

    const el = document.createElement('div');
    el.className = 'toast-item bg-slate-800 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0';
    if (msg.includes('静态预览模式')) {
        el.classList.add('toast-static-mode');
        type = 'warning';
    }
    
    // Icon based on type
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';
    if (type === 'warning') icon = 'alert-triangle';
    
    el.innerHTML = `
        <i data-lucide="${icon}" class="w-5 h-5 ${type === 'error' ? 'text-red-400' : (type === 'success' ? 'text-green-400' : (type === 'warning' ? 'text-yellow-400' : 'text-blue-400'))}"></i>
        <span class="font-medium text-sm">${msg}</span>
    `;
    
    container.appendChild(el);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Animate in
    requestAnimationFrame(() => {
        el.classList.remove('translate-y-10', 'opacity-0');
    });

    // Remove after 3s (or 10s for static warning)
    const duration = msg.includes('静态预览模式') ? 10000 : 3000;
    setTimeout(() => {
        el.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 300);
    }, duration);
}

async function safeFetch(endpoint, options = {}) {
    // Mock Mode Handler
    if (USE_MOCK) {
        return handleMockRequest(endpoint, options);
    }
    
    // Static Mode Handler (Read Only)
    if (STATIC_MODE && options.method && options.method !== 'GET') {
        showToast('静态预览模式下无法修改数据', 'warning');
        return { success: false, error: 'Static mode is read-only' };
    }

    // Adjust endpoint for Node server
    let url = endpoint;
    // Check if we are running in Node mode (localhost:3000 or API_BASE points there)
    // AND the URL contains .php
    if ((API_BASE.includes('localhost:3000') || (typeof window !== 'undefined' && window.location && window.location.port === '3000')) && url.includes('.php')) {
        // Replace .php extension for Node.js routes
        // Handle both simple .php and .php?query=...
        url = url.replace('.php', '');
    }

    // Static Mode Mapping (Fallback if API fails)
    if (STATIC_MODE) {
        enableStaticModeUI();
        if (url.includes('/api/')) {
            const resource = url.split('/').pop().replace('.php', '').split('?')[0];
            const mapping = {
                'bookmarks': '../public/data/bookmarks.json',
                'feeds': '../public/data/feeds.json',
                'snapshots': '../public/data/moments.json',
                'media': '../public/data/media.json',
                'videos': '../public/data/videos.json',
                'stats': '../public/data/visits.json',
                'settings': '../api/settings.json',
                'notice': '../public/data/notice.json'
            };
            if (mapping[resource]) {
                url = mapping[resource];
            }
        }
    }

    try {
        const headers = options.headers || {};
        const method = (options.method || 'GET').toUpperCase();
        const isAuthCheck = typeof url === 'string' && url.includes('/api/auth/check');
        if (method !== 'GET' && (!ADMIN_TOKEN || (!IS_TOKEN_VALID && !isAuthCheck))) {
            showToast(ADMIN_TOKEN ? '令牌无效或已过期' : '请先登录管理员令牌', 'error');
            return { success: false, error: 'Unauthorized' };
        }
        if (ADMIN_TOKEN) {
            headers['x-admin-token'] = ADMIN_TOKEN;
        }
        options.headers = headers;
        
        let res;
        try {
            res = await fetch(url, options);
        } catch (netErr) {
             // Network error handling -> Try Static Mode if not already
             if (!STATIC_MODE && url.includes('/api/')) {
                 console.warn('Network error (fetch failed). Switching to Static Mode.');
                 STATIC_MODE = true;
                 enableStaticModeUI();
                 showToast('无法连接后端，已切换到静态预览模式', 'warning');
                 // Retry with static mapping
                 return safeFetch(endpoint, options);
             }
             throw netErr;
        }

        if (!res.ok) {
            if (res.status === 401) {
                IS_TOKEN_VALID = false;
                updateAuthBadge(false);
                enforceAdminLoginUI();
                showToast('令牌无效或已过期', 'error');
            }
            // Check for 404 on API calls
            if (res.status === 404 && url.includes('/api/')) {
                console.warn(`API not found (404) for ${url}. Returning empty data/error.`);
                // DO NOT Switch to Static Mode on 404.
                if (options.method && options.method !== 'GET') {
                    return { success: false, error: 'Resource not found (404)' };
                }
                return null; // Return null to indicate missing data
            }

            // Try to parse error details from response body
            let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
            try {
                const errData = await res.json();
                if (errData.error) errorMsg += ` - ${errData.error}`;
                if (errData.details) {
                    console.warn('Detailed Error:', errData.details);
                    errorMsg += ` (See console for details)`;
                }
            } catch (e) {
                // Ignore JSON parse error, use default message
            }
            throw new Error(errorMsg);
        }
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            if (text.trim().startsWith('<')) {
                 if (text.includes('<?php')) {
                     console.warn('Server returned raw PHP source. Treating as error response.');
                     return null;
                 }
                 // If we get HTML (e.g. 404 page) in Static Mode, return empty data
                 if (STATIC_MODE) return [];
                 
                 // If we get HTML from API, try Static Mode
                 if (url.includes('/api/') && !STATIC_MODE) {
                     console.warn('Server returned HTML. Switching to Static Mode.');
                     // DO NOT Switch to Static Mode automatically on HTML response.
                     // It might be a proxy error or a simple misconfiguration.
                     // Just return empty data.
                     return [];
                 }
                 
                throw new Error('Server returned HTML instead of JSON. Possible WAF/Firewall block.');
            }
            throw new Error('Invalid JSON response');
        }
    } catch (e) {
        console.error(`Fetch failed for ${url}:`, e);
        // Do not throw, return null/error so UI can handle gracefully
        if (options.method && options.method !== 'GET') {
            return { success: false, error: e.message };
        }
        return null;
    }
}

function enableStaticModeUI() {
    // Add badge to title
    const title = document.querySelector('aside h1');
    if (title && !document.getElementById('static-badge')) {
        const badge = document.createElement('span');
        badge.id = 'static-badge';
        badge.className = 'ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full border border-yellow-200 inline-block align-middle';
        badge.textContent = '静态预览';
        title.appendChild(badge);
    }
    
    // Disable submit buttons
    document.querySelectorAll('button[type="submit"], button.bg-slate-900, button.bg-blue-600').forEach(btn => {
        // Skip nav buttons and dialog buttons
        if (btn.classList.contains('nav-item') || btn.id === 'dialog-confirm' || btn.id === 'dialog-cancel') return;
        
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.title = '静态预览模式下不可用';
    });
}

function enforceAdminLoginUI() {
    const tokenInput = document.getElementById('admin-token-input');
    const settingInput = document.getElementById('setting-admin-token');
    
    if (tokenInput && ADMIN_TOKEN) tokenInput.value = ADMIN_TOKEN;
    if (settingInput && ADMIN_TOKEN) settingInput.value = ADMIN_TOKEN;
    
    const saveBtn = document.getElementById('admin-token-save');
    const clearBtn = document.getElementById('admin-token-clear');
    if (saveBtn) saveBtn.disabled = false;
    if (clearBtn) clearBtn.disabled = !ADMIN_TOKEN;

    // Strict Mode: Only enable write buttons if IS_TOKEN_VALID is true
    const writeButtons = document.querySelectorAll('button[type="submit"], #notice-save, .action-btn');
    writeButtons.forEach(btn => {
        // Skip login related buttons
        if (btn.id === 'admin-token-save' || btn.id === 'admin-token-clear') return;

        if (!IS_TOKEN_VALID) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            // If we have a token but it's invalid
            if (ADMIN_TOKEN) {
                btn.title = '管理员令牌无效，请检查配置';
            } else {
                btn.title = '请先登录管理员令牌';
            }
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            btn.title = '';
        }
    });
}

function updateAuthBadge(isValid) {
    const badge = document.getElementById('auth-status-badge');
    const inputs = [document.getElementById('admin-token-input'), document.getElementById('setting-admin-token')];
    
    inputs.forEach(input => {
        if (!input) return;
        input.classList.remove('border-slate-200', 'border-red-500', 'border-emerald-500', 'focus:border-blue-500', 'focus:border-slate-500');
        if (isValid) {
            input.classList.add('border-emerald-500');
        } else if (input.value) {
            input.classList.add('border-red-500');
        } else {
            input.classList.add('border-slate-200', 'focus:border-blue-500');
        }
    });

    if (!badge) return;
    
    if (isValid) {
        badge.className = 'px-2 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-600 flex items-center gap-1 transition-all';
        badge.innerHTML = '<i data-lucide="shield-check" class="w-3 h-3"></i> 已验证';
    } else {
        badge.className = 'px-2 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-500 flex items-center gap-1 transition-all';
        badge.innerHTML = '<i data-lucide="shield-off" class="w-3 h-3"></i> 未验证';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function verifyToken() {
    // If in Mock Mode, try to reconnect to backend first
    // This handles the case where user starts server after opening the page
    if (USE_MOCK) {
        console.log('In Mock Mode. Attempting to reconnect to backend before verification...');
        showToast('正在尝试连接后台...', 'info');
        await checkBackend();
        
        if (USE_MOCK) {
             showToast('连接失败，请确保后台已启动 (node admin/server.js)', 'error');
             IS_TOKEN_VALID = false;
             updateAuthBadge(false);
             enforceAdminLoginUI();
             return;
        }
    }

    if (!ADMIN_TOKEN) {
        IS_TOKEN_VALID = false;
        updateAuthBadge(false);
        enforceAdminLoginUI();
        return;
    }
    try {
        const res = await safeFetch(`${API_BASE}/auth/check`, { method: 'POST' });
        if (res && res.success) {
            IS_TOKEN_VALID = true;
            updateAuthBadge(true);
            showToast('管理员已登录', 'success');
        } else {
            IS_TOKEN_VALID = false;
            updateAuthBadge(false);
            if (ADMIN_TOKEN) showToast('令牌无效或过期', 'error');
        }
    } catch (e) {
        console.error('Auth check failed:', e);
        IS_TOKEN_VALID = false;
        updateAuthBadge(false);
    } finally {
        enforceAdminLoginUI();
    }
}

function setAdminToken(token) {
    ADMIN_TOKEN = token || '';
    if (ADMIN_TOKEN) {
        localStorage.setItem('admin_token', ADMIN_TOKEN);
        // showToast('管理员已登录', 'success'); // Don't show success yet, wait for verify
        showToast('正在验证令牌...', 'info');
    } else {
        localStorage.removeItem('admin_token');
        IS_TOKEN_VALID = false;
        showToast('已退出管理员', 'info');
    }
    enforceAdminLoginUI();
    verifyToken();
}

async function initAdminToken() {
    console.log('Initializing Admin Token...');
    
    // Always try auto-discovery first for localhost/dev environments
    // This ensures we always have the fresh token from server, even if server restarted/rotated token
    let serverToken = null;
    try {
        console.log('Attempting token auto-discovery...');
        const res = await fetch(`${API_BASE}/debug/token`);
        if (res.ok) {
            const data = await res.json();
            if (data.token) {
                serverToken = data.token;
                console.log('Auto-discovery success. Using server token.');
            }
        } else {
             console.log('Auto-discovery skipped/failed (not localhost or forbidden).');
        }
    } catch (e) {
        console.log('Auto-discovery network error (ignore if production):', e);
    }

    const saved = localStorage.getItem('admin_token');
    
    if (serverToken) {
        // Server provided a token, it is the source of truth
        ADMIN_TOKEN = serverToken;
        if (saved !== serverToken) {
            console.log('Updating local token to match server.');
            setAdminToken(serverToken);
        }
    } else if (saved) {
        // Fallback to local storage if server didn't provide one (e.g. production)
        console.log('Found saved token (server did not provide one).');
        ADMIN_TOKEN = saved;
    } else {
        console.log('No token found anywhere. Login required.');
        ADMIN_TOKEN = '';
    }
    
    enforceAdminLoginUI();
    verifyToken();
}

async function handleMockRequest(url, options) {
    await new Promise(r => setTimeout(r, 300)); // Simulate delay
    
    const resource = url.split('/').pop().replace('.php', '');
    const method = options.method || 'GET';
    
    if (method === 'GET') {
        if (resource === 'bookmarks') return bookmarks;
        if (resource === 'snapshots') return snapshots;
        if (resource === 'media') return media;
        if (resource === 'feeds') return feeds;
        if (resource === 'videos') return videos;
        if (resource === 'stats') return [];
        return [];
    }
    
    if (method === 'POST') {
        const body = JSON.parse(options.body || '{}');
        if (resource === 'bookmarks') {
            bookmarks.unshift({ ...body, addedAt: new Date().toISOString() });
            localStorage.setItem('mock_bookmarks', JSON.stringify(bookmarks));
        }
        if (resource === 'snapshots') {
            if (options.body instanceof FormData) {
                 snapshots.unshift({ 
                    content: options.body.get('content'), 
                    date: new Date().toISOString(),
                    image: 'https://via.placeholder.com/300' 
                 });
            } else {
                snapshots.unshift({ ...body, date: new Date().toISOString() });
            }
            localStorage.setItem('mock_snapshots', JSON.stringify(snapshots));
        }
        if (resource === 'media') {
            if (body.anime || body.manga) {
                media = body;
            }
            localStorage.setItem('mock_media', JSON.stringify(media));
        }
        if (resource === 'feeds') {
            if (Array.isArray(body)) feeds = body;
            else feeds.push(body);
             localStorage.setItem('mock_feeds', JSON.stringify(feeds));
        }
        if (resource === 'videos') {
            if (body.videos) videos = body.videos;
             localStorage.setItem('mock_videos', JSON.stringify(videos));
        }
        return { success: true };
    }
    
    if (method === 'DELETE') {
        return { success: true };
    }

    return { error: 'Mock method not implemented' };
}

function loadMockData() {
    bookmarks = JSON.parse(localStorage.getItem('mock_bookmarks') || '[]');
    snapshots = JSON.parse(localStorage.getItem('mock_snapshots') || '[]');
    media = JSON.parse(localStorage.getItem('mock_media') || '{"anime":[], "manga":[]}');
    feeds = JSON.parse(localStorage.getItem('mock_feeds') || '[]');
    videos = JSON.parse(localStorage.getItem('mock_videos') || '[]');
}

// --- Form Validation ---
const FormValidator = {
    validateRequired(formElement) {
        const requiredFields = formElement.querySelectorAll('[required]');
        let isValid = true;
        const errors = [];
        
        requiredFields.forEach(field => {
            const value = field.value.trim();
            const fieldName = field.getAttribute('data-field-name') || field.name || field.id;
            
            field.classList.remove('border-red-500', 'bg-red-50');
            const existingError = field.parentNode.querySelector('.field-error');
            if (existingError) existingError.remove();
            
            if (!value) {
                isValid = false;
                errors.push(`${fieldName} 是必填字段`);
                field.classList.add('border-red-500', 'bg-red-50');
                const errorEl = document.createElement('div');
                errorEl.className = 'field-error text-red-500 text-xs mt-1';
                errorEl.textContent = `${fieldName} 不能为空`;
                field.parentNode.appendChild(errorEl);
            }
        });
        return { isValid, errors };
    },
    
    validateURL(urlString) {
        try {
            if (!urlString) return false;
            // Auto-fix protocol if missing
            if (!/^https?:\/\//i.test(urlString)) {
                urlString = 'https://' + urlString;
            }
            const url = new URL(urlString);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (e) {
            return false;
        }
    },
    
    validateURLFields(formElement) {
        const urlFields = formElement.querySelectorAll('input[type="url"], input[data-type="url"]');
        let isValid = true;
        const errors = [];
        
        urlFields.forEach(field => {
            let value = field.value.trim();
            const fieldName = field.getAttribute('data-field-name') || field.name || field.id;
            
            field.classList.remove('border-red-500', 'bg-red-50');
            const existingError = field.parentNode.querySelector('.url-error');
            if (existingError) existingError.remove();
            
            if (value) {
                if (!/^https?:\/\//i.test(value)) {
                    value = 'https://' + value;
                    field.value = value; // Auto-correct field value
                }
                
                if (!this.validateURL(value)) {
                    isValid = false;
                    errors.push(`${fieldName} 格式不正确`);
                    field.classList.add('border-red-500', 'bg-red-50');
                    const errorEl = document.createElement('div');
                    errorEl.className = 'url-error text-red-500 text-xs mt-1';
                    errorEl.textContent = '请输入有效的URL (如: https://example.com)';
                    field.parentNode.appendChild(errorEl);
                }
            }
        });
        return { isValid, errors };
    },
    
    validateForm(formElement) {
        const requiredValidation = this.validateRequired(formElement);
        const urlValidation = this.validateURLFields(formElement);
        const isValid = requiredValidation.isValid && urlValidation.isValid;
        const errors = [...requiredValidation.errors, ...urlValidation.errors];
        return { isValid, errors };
    },
    
    clearErrors(formElement) {
        const errorElements = formElement.querySelectorAll('.field-error, .url-error');
        errorElements.forEach(el => el.remove());
        const errorFields = formElement.querySelectorAll('.border-red-500');
        errorFields.forEach(field => field.classList.remove('border-red-500', 'bg-red-50'));
    },
    
    setLoadingState(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<i class="animate-spin w-4 h-4 mr-2" data-lucide="loader-2"></i>处理中...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

// --- Confirmation Dialog ---
const ConfirmationDialog = {
    show(message, onConfirm, onCancel = null) {
        this.hide();
        const dialog = document.createElement('div');
        dialog.id = 'confirmation-dialog';
        dialog.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        dialog.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <i data-lucide="alert-triangle" class="w-5 h-5 text-red-600"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-slate-800">确认操作</h3>
                </div>
                <p class="text-slate-600 mb-6">${message}</p>
                <div class="flex gap-3 justify-end">
                    <button id="dialog-cancel" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">取消</button>
                    <button id="dialog-confirm" class="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors">确认</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        const confirmBtn = dialog.querySelector('#dialog-confirm');
        const cancelBtn = dialog.querySelector('#dialog-cancel');
        
        confirmBtn.onclick = () => { this.hide(); if (onConfirm) onConfirm(); };
        cancelBtn.onclick = () => { this.hide(); if (onCancel) onCancel(); };
        dialog.onclick = (e) => { if (e.target === dialog) { this.hide(); if (onCancel) onCancel(); } };
        
        confirmBtn.focus();
        return dialog;
    },
    hide() {
        const existing = document.getElementById('confirmation-dialog');
        if (existing) existing.remove();
    }
};

// --- Managers ---

const BookmarksManager = {
    data: [],
    categories: {}, // Store categories.json data
    accessStatus: {},
    invalidIds: [],
    async fetchCategories() {
        try {
            const res = await safeFetch(`${API_BASE}/categories`);
            if (res && typeof res === 'object') {
                this.categories = res;
            }
        } catch (e) {
            console.error('Failed to fetch categories:', e);
            // Fallback to empty if failed, populateCategories will still work with existing bookmarks
        }
    },
    async fetch() {
        const list = document.getElementById('bookmarks-list');
        list.innerHTML = '<div class="text-center py-12 text-slate-500">加载中...</div>';
        try {
            // Fetch categories first to ensure dropdown is correct
            await this.fetchCategories();
            
            this.data = await safeFetch(`${API_BASE}/bookmarks`);
            if (!Array.isArray(this.data)) this.data = [];
            bookmarks = this.data;
            this.render();
            // Re-populate categories dropdown whenever we fetch new data
            this.populateCategories();
        } catch (e) {
            console.error(e);
            list.innerHTML = `<div class="text-center py-12 text-red-500">加载收藏失败: ${e.message}</div>`;
        }
    },
    render(data = null) {
        const list = document.getElementById('bookmarks-list');
        list.innerHTML = '';
        const itemsToRender = data || this.data;
        if (itemsToRender.length === 0) {
            list.innerHTML = '<div class="text-center py-12 text-slate-500">暂无收藏</div>';
            return;
        }
        
        itemsToRender.forEach(item => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start hover:shadow-md transition-shadow bookmark-item';
            const status = this.accessStatus[item.id];
            let statusHtml = '';
            if (status) {
                if (status.status === 'ok') {
                    statusHtml = `<span class="bg-green-100 text-green-600 px-2 py-0.5 rounded text-xs border border-green-200 ml-2 flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> 正常</span>`;
                } else {
                    statusHtml = `<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs border border-red-200 ml-2 flex items-center gap-1"><i data-lucide="x-circle" class="w-3 h-3"></i> 异常 (${status.code})</span>`;
                }
            }

            el.innerHTML = `
                <div class="flex items-start gap-3 flex-1">
                    <div class="flex-1">
                        <h3 class="font-semibold text-slate-800 flex items-center gap-2">
                            ${item.title}
                            ${statusHtml}
                        </h3>
                        <a href="${item.url}" target="_blank" class="text-sm text-blue-500 hover:underline truncate block max-w-md">${item.url}</a>
                        <div class="mt-1 text-xs text-slate-400 flex flex-wrap gap-2 items-center">
                            <span class="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                ${this.categories[item.category] ? this.categories[item.category].name : (item.category || 'others')}
                                ${item.subcategory ? `<span class="text-slate-400 mx-1">/</span>${this.categories[item.category]?.children?.find(c => c.id === item.subcategory)?.name || item.subcategory}` : ''}
                            </span>
                            ${item.tags && item.tags.length ? item.tags.map(t => `<span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">#${t}</span>`).join('') : ''}
                            ${item.addedAt ? `<span>• ${new Date(item.addedAt).toLocaleDateString()}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                        <a href="${item.url}" target="_blank" class="p-2 text-slate-400 hover:text-blue-600" title="访问链接">
                            <i data-lucide="external-link" class="w-4 h-4"></i>
                        </a>
                        <button onclick="BookmarksManager.edit('${item.id}')" class="p-2 text-slate-400 hover:text-blue-600" title="编辑">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button onclick="BookmarksManager.delete('${item.id || item.url}')" class="p-2 text-slate-400 hover:text-red-500" title="删除">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
            `;
            list.appendChild(el);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async add(url, title, category, tags = [], id = null, description = '', subcategory = '') {
        try {
            let data;
            if (id) {
                // Update
                const payload = { id, url, title, category, subcategory, tags, description };
                data = await safeFetch(`${API_BASE}/bookmarks`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create
                const newBookmark = { 
                    id: Date.now().toString(), 
                    url, 
                    title, 
                    category: category || 'others',
                    subcategory: subcategory || '',
                    tags, 
                    description,
                    addedAt: new Date().toISOString() 
                };
                data = await safeFetch(`${API_BASE}/bookmarks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newBookmark)
                });
            }

            if (data.success) {
                showToast(id ? '收藏更新成功！' : '添加收藏成功！', 'success');
                this.fetch();
                return true;
            } else {
                showToast('错误: ' + (data.error || '未知错误'), 'error');
                return false;
            }
        } catch (e) {
            showToast('错误: ' + e.message, 'error');
            return false;
        }
    },
    edit(id) {
        const item = this.data.find(b => b.id === id);
        if (!item) return;
        
        const idInput = document.getElementById('bm-id');
        if (idInput) idInput.value = item.id;
        
        document.getElementById('bm-url').value = item.url;
        document.getElementById('bm-title').value = item.title;
        
        const descInput = document.getElementById('bm-desc');
        if (descInput) descInput.value = item.desc || item.description || '';
        
        document.getElementById('bm-category').value = item.category || 'others';
        document.getElementById('bm-subcategory').value = item.subcategory || '';
        this.syncCategoryUI();
        // Handle tags if input exists, otherwise ignore
        const tagsInput = document.getElementById('bm-tags');
        if (tagsInput) tagsInput.value = item.tags ? item.tags.join(', ') : '';
        
        const submitBtn = document.getElementById('bm-submit');
        submitBtn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i><span>保存修改</span>';
        submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        submitBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        
        document.getElementById('bm-cancel').classList.remove('hidden');
        
        const form = document.getElementById('add-bookmark-form');
        if (form) form.scrollIntoView({ behavior: 'smooth' });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    cancelEdit() {
        const form = document.getElementById('add-bookmark-form');
        if (form) form.reset();
        
        const idInput = document.getElementById('bm-id');
        if (idInput) idInput.value = '';
        
        const descInput = document.getElementById('bm-desc');
        if (descInput) descInput.value = '';
        
        // Reset category fields
        document.getElementById('bm-category').value = '';
        document.getElementById('bm-subcategory').value = '';
        const secondarySelect = document.getElementById('bm-subcategory-select');
        if (secondarySelect) {
            secondarySelect.innerHTML = '<option value="">选择二级分类...</option>';
            secondarySelect.disabled = true;
        }

        const submitBtn = document.getElementById('bm-submit');
        submitBtn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i><span>添加收藏</span>';
        submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        submitBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
        
        document.getElementById('bm-cancel').classList.add('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async delete(id) {
        const item = this.data.find(b => (b.id || b.url) === id);
        const title = item ? item.title : '这个收藏';
        ConfirmationDialog.show(`确定要删除 "${title}" 吗？`, async () => {
            try {
                if (USE_MOCK) {
                    this.data = this.data.filter(b => (b.id || b.url) !== id);
                    bookmarks = this.data;
                    localStorage.setItem('mock_bookmarks', JSON.stringify(this.data));
                    this.render();
                    showToast('收藏已删除', 'success');
                    return;
                }
                const data = await safeFetch(`${API_BASE}/bookmarks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
                if (data.success) {
                    showToast('收藏已删除', 'success');
                    this.fetch();
                } else {
                    showToast('删除失败: ' + (data.error || '未知错误'), 'error');
                }
            } catch (e) {
                showToast('删除失败: ' + e.message, 'error');
            }
        });
    },
    filter(query) {
        if (!query) {
            this.render(this.data);
            return;
        }
        const lower = query.toLowerCase();
        const filtered = this.data.filter(b => 
            (b.title && b.title.toLowerCase().includes(lower)) || 
            (b.url && b.url.toLowerCase().includes(lower)) ||
            (b.category && b.category.toLowerCase().includes(lower))
        );
        this.render(filtered);
    },
    async autoFetchTitle() {
        const urlInput = document.getElementById('bm-url');
        const url = urlInput.value.trim();
        if (!url) return showToast('请先输入链接', 'warning');

        const btn = document.querySelector('button[title="自动获取标题"]');
        if (btn) {
             const originalIcon = btn.innerHTML;
             btn.innerHTML = '<i class="animate-spin w-4 h-4" data-lucide="loader-2"></i>';
             btn.disabled = true;
        }

        try {
            const res = await safeFetch(`${API_BASE}/metadata?url=${encodeURIComponent(url)}`);
            if (res && !res.error) {
                if (res.title) {
                    document.getElementById('bm-title').value = res.title;
                    const descInput = document.getElementById('bm-desc');
                    if (descInput && res.description) {
                        descInput.value = res.description;
                    }
                    showToast('标题和描述获取成功', 'success');
                } else {
                    showToast('未能获取到标题', 'info');
                }
            } else {
                showToast(res?.error || '获取失败', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('获取失败: ' + e.message, 'error');
        } finally {
            if (btn) {
                // Restore original icon or default to search icon
                btn.innerHTML = '<i data-lucide="search" class="w-4 h-4"></i>';
                btn.disabled = false;
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },
    async checkAccessibility() {
        const btn = document.getElementById('btn-check-access');
        const delBtn = document.getElementById('btn-delete-invalid');
        const progressContainer = document.getElementById('check-progress-container');
        const progressBar = document.getElementById('check-progress-bar');
        const progressText = document.getElementById('check-progress-text');
        const progressPercent = document.getElementById('check-progress-percent');
        
        btn.innerHTML = '<i class="animate-spin w-4 h-4" data-lucide="loader-2"></i>';
        btn.disabled = true;
        
        // Progress Init
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressPercent.textContent = '0%';
            progressText.textContent = '准备检测...';
        }
        
        try {
            showToast('开始检测书签访问性...', 'info');
            
            // Use current items or fetch fresh? Use current to match UI.
            const allItems = this.data;
            const total = allItems.length;
            
            if (total === 0) {
                showToast('没有书签可检测', 'info');
                return;
            }

            const batchSize = 5;
            const results = [];
            this.accessStatus = {};
            this.invalidIds = [];
            
            for (let i = 0; i < total; i += batchSize) {
                const batch = allItems.slice(i, i + batchSize);
                
                // Update Progress Text
                if (progressContainer) {
                    progressText.textContent = `检测中... (${Math.min(i + 1, total)}/${total})`;
                }
                
                // Call API with batch
                const res = await safeFetch(`${API_BASE}/bookmarks/check`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookmarks: batch })
                });

                if (res && res.results) {
                    results.push(...res.results);
                }
                
                // Update Progress Bar
                if (progressContainer) {
                    const processed = Math.min(i + batchSize, total);
                    const percent = Math.round((processed / total) * 100);
                    progressBar.style.width = `${percent}%`;
                    progressPercent.textContent = `${percent}%`;
                }
            }

            // Process all results
            results.forEach(r => {
                this.accessStatus[r.id] = r;
                if (r.status === 'error') {
                    this.invalidIds.push(r.id);
                }
            });
            
            this.render();
            
            if (this.invalidIds.length > 0) {
                delBtn.disabled = false;
                delBtn.classList.remove('text-slate-300', 'cursor-not-allowed');
                delBtn.classList.add('text-red-500', 'hover:text-red-600', 'hover:bg-red-50');
                showToast(`检测完成，发现 ${this.invalidIds.length} 个无效书签`, 'warning');
            } else {
                delBtn.disabled = true;
                delBtn.classList.add('text-slate-300', 'cursor-not-allowed');
                delBtn.classList.remove('text-red-500', 'hover:text-red-600', 'hover:bg-red-50');
                showToast('检测完成，所有书签均可访问', 'success');
            }
        } catch (e) {
            console.error(e);
            showToast('检测出错: ' + e.message, 'error');
        } finally {
            btn.innerHTML = '<i data-lucide="activity" class="w-4 h-4"></i>';
            btn.disabled = false;
            
            // Hide progress after delay
            if (progressContainer) {
                setTimeout(() => {
                    progressContainer.classList.add('hidden');
                }, 3000);
            }
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },
    async deleteInvalid() {
        if (this.invalidIds.length === 0) return;
        
        ConfirmationDialog.show(`确定要删除这 ${this.invalidIds.length} 个无效书签吗？`, async () => {
             try {
                const res = await safeFetch(`${API_BASE}/bookmarks/batch-delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: this.invalidIds })
                });
                
                if (res && res.success) {
                    showToast(`成功删除 ${res.deleted} 个书签`, 'success');
                    this.invalidIds = [];
                    this.accessStatus = {};
                    document.getElementById('btn-delete-invalid').disabled = true;
                    document.getElementById('btn-delete-invalid').classList.add('text-slate-300', 'cursor-not-allowed');
                    document.getElementById('btn-delete-invalid').classList.remove('text-red-500', 'hover:text-red-600', 'hover:bg-red-50');
                    this.fetch();
                } else {
                    showToast('删除失败', 'error');
                }
             } catch (e) {
                 showToast('删除失败: ' + e.message, 'error');
             }
        });
    },
    updateSecondaryOptions(categoryKey) {
        const secondarySelect = document.getElementById('bm-subcategory-select');
        if (!secondarySelect) return;
        
        secondarySelect.innerHTML = '<option value="">选择二级分类...</option>';
        
        if (categoryKey && this.categories[categoryKey] && this.categories[categoryKey].children) {
            secondarySelect.disabled = false;
            this.categories[categoryKey].children.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.id;
                option.textContent = sub.name;
                secondarySelect.appendChild(option);
            });
        } else {
            secondarySelect.disabled = true;
        }
    },
    populateCategories() {
        const primarySelect = document.getElementById('bm-category-select');
        const secondarySelect = document.getElementById('bm-subcategory-select');
        
        if (!primarySelect || !secondarySelect) return;

        // Clear existing options
        primarySelect.innerHTML = '<option value="">选择一级分类...</option>';
        secondarySelect.innerHTML = '<option value="">选择二级分类...</option>';
        secondarySelect.disabled = true;

        if (!this.categories || typeof this.categories !== 'object') return;

        // Sort categories by order
        const sortedCategories = Object.entries(this.categories)
            .sort(([, a], [, b]) => (a.order || 999) - (b.order || 999));

        // Populate Primary
        sortedCategories.forEach(([key, cat]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = cat.name || key;
            primarySelect.appendChild(option);
        });

        // Event Listener for Primary Change
        primarySelect.onchange = () => {
            const selectedKey = primarySelect.value;
            this.updateSecondaryOptions(selectedKey);
            
            // Update hidden fields
            document.getElementById('bm-category').value = selectedKey || '';
            document.getElementById('bm-subcategory').value = ''; // Reset sub on primary change
        };

        // Event Listener for Secondary Change
        secondarySelect.onchange = () => {
            document.getElementById('bm-subcategory').value = secondarySelect.value;
        };
    },
    syncCategoryUI() {
        const primarySelect = document.getElementById('bm-category-select');
        const secondarySelect = document.getElementById('bm-subcategory-select');
        const categoryInput = document.getElementById('bm-category');
        const subcategoryInput = document.getElementById('bm-subcategory');
        
        if (!primarySelect || !secondarySelect) return;
        
        const currentPrimary = categoryInput.value;
        if (currentPrimary) {
            primarySelect.value = currentPrimary;
            this.updateSecondaryOptions(currentPrimary);
            
            const currentSecondary = subcategoryInput.value;
            if (currentSecondary) {
                secondarySelect.value = currentSecondary;
            }
        }
    }
};

const SnapshotsManager = {
    data: [],
    async fetch() {
        try {
            this.data = await safeFetch(`${API_BASE}/snapshots`);
            if (!Array.isArray(this.data)) this.data = [];
            snapshots = this.data;
            this.render();
        } catch (e) {
            console.error(e);
            showToast(`加载随手拍失败: ${e.message}`);
            this.data = [];
            this.render(); 
        }
    },
    render() {
        const container = document.getElementById('snapshots-preview');
        container.innerHTML = '';
        if (!Array.isArray(this.data) || this.data.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center text-slate-500 py-12">暂无随手拍</div>';
            return;
        }
        this.data.slice(0, 12).forEach(item => {
            const el = document.createElement('div');
            el.className = 'bg-slate-50 rounded-lg p-3 border border-slate-200 relative group';
            el.innerHTML = `
                ${item.image ? `<img src="${item.image}" class="w-full h-32 object-cover rounded-md mb-2 bg-slate-200" loading="lazy">` : ''}
                <p class="text-sm text-slate-800 line-clamp-2 mb-1">${item.content}</p>
                <div class="text-xs text-slate-500 flex justify-between">
                    <span>${new Date(item.date).toLocaleDateString()}</span>
                    <span>${item.location || ''}</span>
                </div>
                <button onclick="SnapshotsManager.delete('${item.id || item.date}')" 
                        class="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
            `;
            container.appendChild(el);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async add(content, imageUrl, location, tags, imageFile = null) {
        try {
            let data;
            if (imageUrl) {
                const mdMatch = imageUrl.match(/!\[.*?\]\((.*?)\)/);
                if (mdMatch) imageUrl = mdMatch[1].trim();
                data = await safeFetch(`${API_BASE}/snapshots`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, location, tags, imageUrl })
                });
            } else if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                formData.append('content', content);
                formData.append('location', location);
                formData.append('tags', tags);
                data = await safeFetch(`${API_BASE}/snapshots`, { method: 'POST', body: formData });
            } else {
                throw new Error('请提供图片（链接或文件）。');
            }
            if (data.success) {
                showToast('随手拍发布成功！');
                this.fetch();
                return true;
            } else {
                showToast('错误: ' + (data.error || '未知错误'));
                return false;
            }
        } catch (e) {
            showToast('错误: ' + e.message);
            return false;
        }
    },
    async delete(id) {
        const item = this.data.find(s => (s.id || s.date) === id);
        const summary = item ? (item.content || '').slice(0, 20) : '';
        ConfirmationDialog.show(`确定要删除${summary ? ` “${summary}”` : '这个随手拍'}吗？`, async () => {
            try {
                if (USE_MOCK) {
                    this.data = this.data.filter(s => (s.id || s.date) !== id);
                    snapshots = this.data;
                    localStorage.setItem('mock_snapshots', JSON.stringify(this.data));
                    this.render();
                    showToast('随手拍已删除', 'success');
                    return;
                }
                const data = await safeFetch(`${API_BASE}/snapshots?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
                if (data.success) {
                    showToast('随手拍已删除', 'success');
                    this.fetch();
                } else {
                    showToast('删除失败: ' + (data.error || '未知错误'), 'error');
                }
            } catch (e) {
                showToast('删除失败: ' + e.message, 'error');
            }
        });
    }
};

const MediaManager = {
    data: { anime: [], manga: [] },
    currentType: 'anime',
    async fetch() {
        try {
            this.data = await safeFetch(`${API_BASE}/media`);
            if (!this.data) this.data = { anime: [], manga: [] };
            media = this.data;
            this.render();
        } catch (e) {
            console.error(e);
            showToast('获取媒体数据失败');
        }
    },
    render() {
        const list = document.getElementById('media-list');
        list.innerHTML = '';
        if (!this.data) this.data = { anime: [], manga: [] };
        const items = this.data[this.currentType] || [];
        if (items.length === 0) {
            list.innerHTML = '<div class="col-span-full text-center text-slate-500 py-12">暂无媒体内容</div>';
            return;
        }
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group';
            
            // Status Badge Colors
            let statusColor = 'bg-slate-100 text-slate-600';
            if (item.status === 'watching' || item.status === 'reading') statusColor = 'bg-blue-50 text-blue-600';
            if (item.status === 'completed') statusColor = 'bg-green-50 text-green-600';
            if (item.status === 'plan') statusColor = 'bg-purple-50 text-purple-600';
            if (item.status === 'dropped') statusColor = 'bg-red-50 text-red-600';

            // Progress Percentage
            const progress = item.total ? Math.round((item.progress / item.total) * 100) : 0;
            const progressColor = progress >= 100 ? 'bg-green-500' : 'bg-blue-500';

            el.innerHTML = `
                <div class="flex gap-4">
                    <div class="w-16 h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden relative group-hover:scale-105 transition-transform duration-300">
                        ${item.cover ? `<img src="${item.cover}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='../public/img/default-book.jpg'">` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i data-lucide="image" class="w-6 h-6"></i></div>`}
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-slate-200/50 backdrop-blur-sm">
                            <div class="h-full ${progressColor} transition-all" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-medium text-slate-800 truncate pr-2" title="${item.title}">${item.title}</h3>
                            <button onclick="MediaManager.delete('${item.id}')" class="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                        
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}">
                                ${this.getStatusText(item.status)}
                            </span>
                            ${item.tag ? `<span class="text-xs text-slate-400 px-1 border border-slate-200 rounded">${item.tag}</span>` : ''}
                        </div>

                        <div class="space-y-1">
                            <div class="flex items-center justify-between text-xs text-slate-500">
                                <span>进度</span>
                                <span class="font-medium font-mono">${item.progress} / <span class="text-slate-400">${item.total || '?'}</span></span>
                            </div>
                            <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div class="${progressColor} h-full rounded-full" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    getStatusText(status) {
        const map = {
            'watching': this.currentType === 'anime' ? '在看' : '在读',
            'reading': '在读',
            'completed': this.currentType === 'anime' ? '看过' : '读过',
            'plan': this.currentType === 'anime' ? '想看' : '想读',
            'on_hold': '搁置',
            'dropped': '抛弃'
        };
        return map[status] || status;
    },
    switchType(type) {
        this.currentType = type;
        
        // Update tabs UI
        const tabs = ['anime', 'manga'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            if (btn) {
                if (t === type) {
                    btn.className = 'px-4 py-1.5 bg-white text-slate-800 shadow-sm rounded-md text-sm font-medium transition-all';
                } else {
                    btn.className = 'px-4 py-1.5 text-slate-500 hover:text-slate-700 rounded-md text-sm font-medium transition-all';
                }
            }
        });

        // Update form placeholders
        const progressInput = document.getElementById('media-progress');
        const totalInput = document.getElementById('media-total');
        if (progressInput) progressInput.placeholder = type === 'anime' ? '看到第几集' : '读到第几话/卷';
        if (totalInput) totalInput.placeholder = type === 'anime' ? '总集数' : '总话/卷数';

        this.render();
    },
    async add(item) {
        // Normalize status for manga
        if (this.currentType === 'manga' && item.status === 'watching') {
            item.status = 'reading';
        }
        
        const newItem = { id: Date.now(), ...item };
        if (!this.data[this.currentType]) this.data[this.currentType] = [];
        this.data[this.currentType].unshift(newItem);
        try {
            await safeFetch(`${API_BASE}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.data)
            });
            showToast('媒体添加成功');
            media = this.data;
            this.render();
            return true;
        } catch (e) {
            showToast('保存媒体失败: ' + e.message);
            this.data[this.currentType].shift();
            this.render();
            return false;
        }
    },
    async delete(id) {
        ConfirmationDialog.show('确定要删除这个媒体项目吗？', async () => {
            const originalList = [...(this.data[this.currentType] || [])];
            this.data[this.currentType] = this.data[this.currentType].filter(i => i.id != id);
            this.render();
            try {
                await safeFetch(`${API_BASE}/media`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.data)
                });
                showToast('媒体已删除');
                media = this.data;
            } catch (e) {
                showToast('删除媒体失败: ' + e.message);
                this.data[this.currentType] = originalList;
                this.render();
            }
        });
    }
};

const BgmSearch = {
    results: [],
    selected: null,
    async search(keyword) {
        const type = MediaManager.currentType === 'anime' ? '2' : '1';
        try {
            const data = await safeFetch(`${API_BASE}/bgm_search?q=${encodeURIComponent(keyword)}&type=${type}`);
            this.results = (data && data.data) ? data.data : (Array.isArray(data) ? data : []);
            this.render();
            showToast(`搜索到 ${this.results.length} 条结果`, 'success');
        } catch (e) {
            showToast('搜索失败: ' + e.message, 'error');
        }
    },
    render() {
        const c = document.getElementById('bgm-search-results');
        if (!c) return;
        c.innerHTML = this.results.map(item => {
            const title = item.name_cn || item.name || '';
            const img = item.images?.large || item.images?.common || '';
            const total = item.eps || item.vols || '';
            return `
                <div class="bg-white border border-slate-200 rounded-xl p-3 flex gap-3 items-center">
                    <img src="${img}" class="w-12 h-16 object-cover rounded bg-slate-100" onerror="this.src='../public/img/default-book.jpg'">
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-slate-800 truncate">${title}</div>
                        <div class="text-xs text-slate-400">${total ? `总数: ${total}` : ''}</div>
                    </div>
                    <button class="px-3 py-1 bg-slate-900 text-white rounded text-xs" data-select-id="${item.id}">选择</button>
                </div>`;
        }).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    select(id) {
        const item = this.results.find(i => String(i.id) === String(id));
        if (!item) return;
        this.selected = item;
        const sel = document.getElementById('bgm-selected');
        if (sel) {
            const title = item.name_cn || item.name || '';
            sel.textContent = `已选择: ${title} (#${item.id})`;
        }
        showToast('已选择条目');
    }
};

const FeedsManager = {
    data: [],
    editingId: null,
    async fetch() {
        try {
            this.data = await safeFetch(`${API_BASE}/feeds`);
            if (!Array.isArray(this.data)) this.data = [];
            feeds = this.data;
            this.render();
        } catch (e) {
            console.error(e);
            showToast('获取订阅失败');
        }
    },
    render() {
        const list = document.getElementById('feeds-list');
        list.innerHTML = '';
        if (!Array.isArray(this.data) || this.data.length === 0) {
            list.innerHTML = '<div class="col-span-full text-center text-slate-500 py-12">暂无订阅源</div>';
            return;
        }
        this.data.forEach(item => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center';
            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <img src="${item.icon || ''}" class="w-8 h-8 rounded bg-slate-100" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}'">
                    <div><h3 class="font-semibold text-slate-800">${item.title}</h3><div class="text-xs text-slate-400">${item.id}</div></div>
                </div>
                <div class="flex items-center gap-2">
                    <a href="${item.url}" target="_blank" class="p-2 text-slate-400 hover:text-blue-600"><i data-lucide="external-link" class="w-4 h-4"></i></a>
                    <button onclick="FeedsManager.edit('${item.id}')" class="p-2 text-slate-400 hover:text-blue-600" title="编辑"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="FeedsManager.delete('${item.id}')" class="p-2 text-slate-400 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            `;
            list.appendChild(el);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    edit(id) {
        const item = this.data.find(f => f.id === id);
        if (!item) return;
        this.editingId = id;
        const idInput = document.getElementById('feed-id');
        const titleInput = document.getElementById('feed-title');
        const urlInput = document.getElementById('feed-url');
        const iconInput = document.getElementById('feed-icon');
        if (idInput) idInput.value = item.id;
        if (titleInput) titleInput.value = item.title || '';
        if (urlInput) urlInput.value = item.url || '';
        if (iconInput) iconInput.value = item.icon || '';
        const submitBtn = document.querySelector('#add-feed-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '保存修改';
            submitBtn.classList.remove('bg-orange-500','hover:bg-orange-600');
            submitBtn.classList.add('bg-emerald-600','hover:bg-emerald-700');
        }
        let cancelBtn = document.getElementById('feed-cancel');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.id = 'feed-cancel';
            cancelBtn.className = 'ml-2 px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium';
            cancelBtn.textContent = '取消编辑';
            cancelBtn.onclick = () => FeedsManager.cancelEdit();
            const container = document.querySelector('#add-feed-form .flex.justify-end');
            if (container) container.appendChild(cancelBtn);
        } else {
            cancelBtn.classList.remove('hidden');
        }
        const form = document.getElementById('add-feed-form');
        if (form) form.scrollIntoView({ behavior: 'smooth' });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    cancelEdit() {
        this.editingId = null;
        const form = document.getElementById('add-feed-form');
        if (form) form.reset();
        const submitBtn = document.querySelector('#add-feed-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '添加订阅';
            submitBtn.classList.add('bg-orange-500','hover:bg-orange-600');
            submitBtn.classList.remove('bg-emerald-600','hover:bg-emerald-700');
        }
        const cancelBtn = document.getElementById('feed-cancel');
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async update(oldId, newId, title, url, icon) {
        const original = [...this.data];
        const idx = this.data.findIndex(f => f.id === oldId);
        if (idx === -1) { showToast('未找到要编辑的订阅', 'error'); return false; }
        if (newId !== oldId && this.data.some(f => f.id === newId)) { showToast('订阅 ID 已存在', 'error'); return false; }
        this.data[idx] = { id: newId, title, url, icon };
        try {
            await safeFetch(`${API_BASE}/feeds`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.data)
            });
            showToast('订阅更新成功！', 'success');
            feeds = this.data;
            this.render();
            return true;
        } catch (e) {
            showToast('保存订阅失败: ' + e.message, 'error');
            this.data = original;
            this.render();
            return false;
        }
    },
    async add(id, title, url, icon) {
        if (this.data.some(f => f.id === id)) { showToast('订阅 ID 已存在', 'error'); return false; }
        const newFeed = { id, title, url, icon };
        this.data.push(newFeed);
        try {
            await safeFetch(`${API_BASE}/feeds`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.data)
            });
            showToast('订阅添加成功', 'success');
            feeds = this.data;
            this.render();
            return true;
        } catch (e) {
            showToast('保存订阅失败', 'error');
            this.data.pop();
            return false;
        }
    },
    async delete(id) {
        const item = this.data.find(f => f.id === id);
        const title = item ? item.title : '此订阅源';
        ConfirmationDialog.show(`确定要删除 "${title}" 吗？`, async () => {
            const originalData = [...this.data];
            this.data = this.data.filter(f => f.id !== id);
            try {
                await safeFetch(`${API_BASE}/feeds`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.data)
                });
                showToast('订阅已删除', 'success');
                feeds = this.data;
            } catch (e) {
                showToast('删除订阅失败', 'error');
                this.data = originalData;
                this.render();
            }
        });
    },
    autoFillIcon(url) {
        if (!url) { showToast('请先输入RSS链接'); return; }
        try {
            const domain = new URL(url).hostname;
            const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            document.getElementById('feed-icon').value = iconUrl;
            showToast('图标链接已自动填充');
        } catch (e) { showToast('无效的链接'); }
    }
};

const VideosManager = {
    data: [],
    async fetch() {
        try {
            const response = await safeFetch(`${API_BASE}/videos`);
            this.data = response.videos || [];
            videos = this.data;
            this.render();
        } catch (e) {
            console.error(e);
            showToast('获取视频失败: ' + e.message);
        }
    },
    render() {
        const list = document.getElementById('videos-list');
        list.innerHTML = '';
        if (this.data.length === 0) {
            list.innerHTML = '<div class="col-span-full text-center text-slate-500 py-12">暂无视频推荐</div>';
            return;
        }
        this.data.forEach(item => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-xl border border-slate-200 flex gap-4';
            el.innerHTML = `
                <img src="${item.thumbnail}" class="w-32 h-20 object-cover rounded-lg bg-slate-100" onerror="this.src='../public/img/default-book.jpg'">
                <div class="flex-1">
                    <div class="flex justify-between items-start">
                        <h3 class="font-semibold text-slate-800 line-clamp-1">${item.title}</h3>
                        <button onclick="VideosManager.delete(${item.id})" class="text-slate-400 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                    <div class="mt-1 text-sm text-slate-600 flex gap-3">
                        <span class="bg-slate-100 px-2 rounded text-xs py-0.5">${item.category}</span>
                        <span class="text-slate-400 text-xs flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${item.duration}</span>
                        <span class="text-slate-400 text-xs flex items-center gap-1"><i data-lucide="eye" class="w-3 h-3"></i> ${item.views || 0}</span>
                    </div>
                    ${item.bgm_subject_id ? `<div class="mt-2 text-xs"><a href="https://bgm.tv/subject/${item.bgm_subject_id}" target="_blank" class="text-pink-600 hover:underline flex items-center gap-1"><i data-lucide=\"link-2\" class=\"w-3 h-3\"></i> Bangumi #${item.bgm_subject_id}</a></div>` : ''}
                </div>
            `;
            list.appendChild(el);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async add(video) {
        const newVideo = { id: Date.now(), ...video };
        this.data.unshift(newVideo);
        try {
            await safeFetch(`${API_BASE}/videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videos: this.data })
            });
            showToast('视频添加成功');
            videos = this.data;
            this.render();
            return true;
        } catch (e) {
            showToast('保存视频失败: ' + e.message);
            this.data.shift();
            return false;
        }
    },
    async delete(id) {
        ConfirmationDialog.show('确定要删除这个视频推荐吗？', async () => {
            const originalList = [...this.data];
            this.data = this.data.filter(v => v.id !== id);
            this.render();
            try {
                await safeFetch(`${API_BASE}/videos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videos: this.data })
                });
                showToast('视频已删除');
                videos = this.data;
            } catch (e) {
                showToast('删除失败: ' + e.message);
                this.data = originalList;
                this.render();
            }
        });
    },
    async fetchBilibiliInfo(bvid) {
        if (!bvid) { showToast('请先输入 BV 号'); return; }
        
        const btn = document.querySelector('button[onclick="fetchBilibiliInfo()"]');
        const originalIcon = btn ? btn.innerHTML : '';
        if(btn) {
            btn.innerHTML = '<i class="animate-spin w-4 h-4" data-lucide="loader-2"></i>';
            btn.disabled = true;
        }

        try {
            // Use RSS proxy to bypass CORS
            // Bilibili API: https://api.bilibili.com/x/web-interface/view?bvid=${bvid}
            const targetUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
            const proxyUrl = `${API_BASE}/rss-proxy?url=${encodeURIComponent(targetUrl)}`;
            
            const res = await safeFetch(proxyUrl);
            
            // Handle both direct JSON response or stringified JSON
            let data = res;
            if (typeof res === 'string') {
                try { data = JSON.parse(res); } catch(e) {}
            }

            if (data && data.code === 0 && data.data) {
                const info = data.data;
                document.getElementById('video-title').value = info.title || '';
                document.getElementById('video-desc').value = info.desc || '';
                document.getElementById('video-category').value = info.tname || '';
                showToast('获取成功', 'success');
            } else {
                showToast('获取失败: ' + (data?.message || '未知错误'), 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('获取失败: ' + e.message, 'error');
        } finally {
            if(btn) {
                btn.innerHTML = originalIcon;
                btn.disabled = false;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    },
    async fetchBangumiSubject(id) {
        if (!id) { showToast('请输入 Bangumi Subject ID'); return; }
        try {
            const data = await safeFetch(`${API_BASE}/bgm_subject?id=${encodeURIComponent(id)}`);
            if (data && data.id) {
                const title = data.name_cn || data.name || '';
                const cover = (data.images && (data.images.large || data.images.common || data.images.medium)) || '';
                const eps = data.eps || 0;
                document.getElementById('video-title').value = title;
                document.getElementById('video-cover').value = cover;
                document.getElementById('video-category').value = (data.type === 2 ? '动画' : (data.type === 1 ? '漫画' : ''));
                showToast('已获取 Bangumi 资料', 'success');
            } else if (data && data.error) {
                showToast('获取失败: ' + data.error, 'error');
            } else {
                showToast('获取失败: 未返回有效数据', 'error');
            }
        } catch (e) {
            showToast('获取失败: ' + e.message, 'error');
        }
    }
};

const StatsManager = {
    data: { logs: [], stats: { total: 0, daily: {}, pages: {} } },
    chart: null,
    async fetch() {
        try {
            const result = await safeFetch(`${API_BASE}/stats`);
            
            // Format: { "YYYY-MM-DD": { visits: 0, ip_locations: {} } }
            
            let dailyStats = {};
            let total = 0;
            
            if (result && typeof result === 'object') {
                Object.keys(result).forEach(date => {
                    const d = result[date];
                    const visits = d.visits || 0;
                    dailyStats[date] = visits;
                    total += visits;
                });
            }

            this.data = {
                logs: [], // Legacy logs not supported in simple stats
                stats: {
                    total: total,
                    daily: dailyStats,
                    pages: {}
                },
                raw: result
            };
            
            this.render();
        } catch (e) {
            console.error(e);
            showToast('获取统计数据失败: ' + e.message);
        }
    },
    render() {
        const stats = this.data.stats;
        const logs = this.data.logs;
        const raw = this.data.raw;
        
        const totalElement = document.getElementById('stat-total-visits');
        if (totalElement) totalElement.textContent = stats.total;
        
        const today = new Date().toISOString().split('T')[0];
        const todayVisits = stats.daily[today] || 0;
        
        const todayElement = document.getElementById('stat-today-visits');
        if (todayElement) todayElement.textContent = todayVisits;
        
        const pageCounts = stats.pages || {};
        const topPage = Object.entries(pageCounts).sort((a,b) => b[1] - a[1])[0];
        const topPageElement = document.getElementById('stat-top-page');
        if (topPageElement) topPageElement.textContent = topPage ? `${topPage[0]} (${topPage[1]})` : '-';
        
        this.renderChart(stats.daily);
        this.renderLogs(logs);
        this.renderLocations(raw);
    },
    renderChart(dailyStats) {
        const ctx = document.getElementById('visitsChart');
        if (!ctx) return;
        
        const dateCounts = {};
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dateCounts[key] = dailyStats[key] || 0;
        }
        
        const labels = Object.keys(dateCounts);
        const values = Object.values(dateCounts);
        
        if (this.chart) this.chart.destroy();
        
        if (typeof Chart !== 'undefined') {
            this.chart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Visits',
                        data: values,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
            window.myChart = this.chart;
        }
    },
    renderLogs(logs) {
        const tbody = document.getElementById('visits-log-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">暂无访问记录</td></tr>';
            return;
        }
        
        // Logs are already truncated to 50 by backend, but we reverse to show newest first
        // If backend returns oldest first (append), we reverse.
        // If backend returns newest first (prepend), we don't.
        // Backend currently appends (oldest -> newest). So we reverse.
        [...logs].reverse().forEach(s => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-slate-50';
            row.innerHTML = `<td class="px-6 py-4">${s.time || '-'}</td><td class="px-6 py-4 truncate max-w-xs" title="${s.page || '-'}">${s.page || '-'}</td><td class="px-6 py-4">${s.ip || '-'}</td><td class="px-6 py-4 truncate max-w-xs" title="${s.ua || '-'}">${s.ua || '-'}</td>`;
            tbody.appendChild(row);
        });
    },
    renderLocations(rawData) {
        // Try to find or create the wrapper
        let wrapper = document.getElementById('stat-locations-wrapper');
        
        if (!wrapper) {
             const view = document.getElementById('view-stats');
             if (view) {
                 wrapper = document.createElement('div');
                 wrapper.id = 'stat-locations-wrapper';
                 wrapper.className = 'bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6';
                 wrapper.innerHTML = '<h3 class="text-lg font-bold text-slate-800 mb-4">访客分布 (IP Location)</h3><div id="stat-locations-list" class="space-y-3"></div>';
                 
                 // Insert before logs if possible, or append
                 const logsCard = document.querySelector('#view-stats .bg-white.rounded-2xl.shadow-sm.border.border-slate-200.overflow-hidden');
                 if (logsCard) {
                     view.insertBefore(wrapper, logsCard);
                 } else {
                     view.appendChild(wrapper);
                 }
             }
        }
        
        const list = document.getElementById('stat-locations-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        const locations = {};
        if (rawData) {
            Object.values(rawData).forEach(day => {
                if (day.ip_locations) {
                    Object.entries(day.ip_locations).forEach(([loc, count]) => {
                        locations[loc] = (locations[loc] || 0) + count;
                    });
                }
            });
        }
        
        const sorted = Object.entries(locations).sort((a,b) => b[1] - a[1]).slice(0, 10);
        
        if (sorted.length === 0) {
            list.innerHTML = '<div class="text-center text-slate-500 py-4">暂无分布数据</div>';
            return;
        }
        
        const max = sorted[0][1];
        
        sorted.forEach(([loc, count]) => {
            const percent = Math.round((count / max) * 100);
            const el = document.createElement('div');
            el.innerHTML = `
                <div class="flex justify-between text-sm mb-1">
                    <span class="font-medium text-slate-700">${loc || '未知'}</span>
                    <span class="text-slate-500">${count}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: ${percent}%"></div>
                </div>
            `;
            list.appendChild(el);
        });
    }
};

const Dashboard = {
    switchTab: function(tabId) {
        console.log('Switching to tab:', tabId);
        ['bookmarks', 'snapshots', 'media', 'feeds', 'videos', 'stats', 'settings'].forEach(id => {
            const section = document.getElementById(`view-${id}`);
            if (section) {
                section.classList.add('hidden');
                section.setAttribute('aria-hidden', 'true');
            }
            const btn = document.getElementById(`nav-${id}`);
            if(btn) {
                btn.classList.remove('bg-blue-50', 'text-blue-600', 'font-medium');
                btn.classList.add('text-slate-600');
                btn.setAttribute('aria-selected', 'false');
                btn.setAttribute('tabindex', '-1');
            }
        });
        const section = document.getElementById(`view-${tabId}`);
        if (section) {
            section.classList.remove('hidden');
            section.setAttribute('aria-hidden', 'false');
        }
        const activeBtn = document.getElementById(`nav-${tabId}`);
        if(activeBtn) {
            activeBtn.classList.add('bg-blue-50', 'text-blue-600', 'font-medium');
            activeBtn.classList.remove('text-slate-600');
            activeBtn.setAttribute('aria-selected', 'true');
            activeBtn.setAttribute('tabindex', '0');
        }
        const TAB_TITLES = {
            bookmarks: '收藏夹', snapshots: '随手拍', media: '追番/漫画',
            feeds: '订阅源', videos: '视频推荐', stats: '数据统计', settings: '系统设置'
        };
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = TAB_TITLES[tabId] || '概览';

        if (tabId === 'bookmarks') { BookmarksManager.fetch(); BookmarksManager.populateCategories(); }
        if (tabId === 'snapshots') SnapshotsManager.fetch();
        if (tabId === 'media') MediaManager.fetch();
        if (tabId === 'feeds') FeedsManager.fetch();
        if (tabId === 'videos') VideosManager.fetch();
        if (tabId === 'stats') StatsManager.fetch();
        if (tabId === 'settings') { fetchSettings(); NoticeManager.fetch(); }
    }
};

// --- Keyboard Shortcuts & Dark Mode ---

const KeyboardShortcuts = {
    init() {
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    },
    handleKeydown(e) {
        if (e.key === 'Escape') {
            ConfirmationDialog.hide();
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && overlay && !overlay.classList.contains('hidden')) {
                const toggleBtn = document.querySelector('button[aria-controls="sidebar"]');
                if (toggleBtn) toggleBtn.click();
            }
            const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="搜索"]');
            searchInputs.forEach(input => input.blur());
        }
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            const activeForm = document.querySelector('form:not(.hidden) button[type="submit"]');
            if (activeForm && !activeForm.disabled) activeForm.click();
        }
    }
};

const DarkModeManager = {
    init() {
        this.updateTheme();
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                this.updateTheme();
            });
        }
    },
    updateTheme() {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        this.updateChartColors(isDark);
    },
    updateChartColors(isDark) {
        if (!window.myChart) return;
        const textColor = isDark ? '#e2e8f0' : '#475569';
        const gridColor = isDark ? '#334155' : '#e2e8f0';
        window.myChart.options.scales.x.ticks.color = textColor;
        window.myChart.options.scales.y.ticks.color = textColor;
        window.myChart.options.scales.x.grid.color = gridColor;
        window.myChart.options.scales.y.grid.color = gridColor;
        window.myChart.update();
    }
};

// --- Global Exports & Backward Compatibility ---
window.Dashboard = Dashboard;
window.BookmarksManager = BookmarksManager;
window.SnapshotsManager = SnapshotsManager;
window.MediaManager = MediaManager;
window.FeedsManager = FeedsManager;
window.VideosManager = VideosManager;
window.StatsManager = StatsManager;
window.FormValidator = FormValidator;
window.ConfirmationDialog = ConfirmationDialog;
window.showToast = showToast;
window.switchTab = Dashboard.switchTab;
window.KeyboardShortcuts = KeyboardShortcuts;
window.DarkModeManager = DarkModeManager;
window.setAdminToken = setAdminToken;

window.deleteMedia = (id) => MediaManager.delete(id);
window.syncBangumi = async () => {
    const btn = document.querySelector('button[onclick="syncBangumi()"]');
    const icon = btn ? btn.querySelector('i') : null;
    if(btn) btn.disabled = true;
    if(icon) icon.classList.add('animate-spin');
    
    try {
            showToast('开始同步 Bangumi 数据...', 'info');
            const res = await safeFetch(`${API_BASE}/sync_bangumi`);
            if (res && res.success) {
            showToast(`同步成功! 动画: ${res.count_anime}, 漫画: ${res.count_manga}`, 'success');
            if (MediaManager && MediaManager.fetch) MediaManager.fetch();
        } else {
            showToast('同步失败: ' + (res?.error || '未知错误'), 'error');
        }
    } catch (e) {
        showToast('同步出错: ' + e.message, 'error');
    } finally {
        if(btn) btn.disabled = false;
        if(icon) icon.classList.remove('animate-spin');
    }
};
function saveBangumiSettings() {
    const usernameInput = document.getElementById('setting-bangumi-username');
    const tokenInput = document.getElementById('setting-bangumi-token');
    const bangumi_username = usernameInput ? usernameInput.value : '';
    const bangumi_token = tokenInput ? tokenInput.value : '';
    return safeFetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bangumi_username, bangumi_token })
    }).then(res => {
        if (res && res.success) {
            showToast('Bangumi 设置已保存', 'success');
        } else {
            showToast('保存失败', 'error');
        }
        return res;
    }).catch(e => {
        showToast('保存失败: ' + e.message, 'error');
    });
}
window.saveBangumiSettings = saveBangumiSettings;
window.deleteFeed = (id) => FeedsManager.delete(id);
window.autoFillFeedIcon = () => FeedsManager.autoFillIcon(document.getElementById('feed-url').value);
window.deleteVideo = (id) => VideosManager.delete(id);
window.fetchBilibiliInfo = () => VideosManager.fetchBilibiliInfo(document.getElementById('video-bvid').value);

// --- Event Handlers ---

async function handleAddBookmark(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    FormValidator.clearErrors(form);
    const validation = FormValidator.validateForm(form);
    if (!validation.isValid) { showToast('请检查表单中的错误', 'error'); return; }
    FormValidator.setLoadingState(btn, true);
    const idInput = document.getElementById('bm-id');
    const id = idInput ? idInput.value : '';
    const url = document.getElementById('bm-url').value.trim();
    const title = document.getElementById('bm-title').value.trim();
    const descInput = document.getElementById('bm-desc');
    const description = descInput ? descInput.value.trim() : '';
    const category = document.getElementById('bm-category').value;
    const subcategory = document.getElementById('bm-subcategory').value;
    const tagsInput = document.getElementById('bm-tags');
    const tags = tagsInput ? tagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
    try {
        const success = await BookmarksManager.add(url, title, category, tags, id, description, subcategory);
        if (success) { 
            BookmarksManager.cancelEdit();
            FormValidator.clearErrors(form); 
        }
    } finally {
        FormValidator.setLoadingState(btn, false);
    }
}

async function handleAddSnapshot(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    FormValidator.clearErrors(form);
    const validation = FormValidator.validateForm(form);
    if (!validation.isValid) { showToast('请检查表单中的错误', 'error'); return; }
    FormValidator.setLoadingState(btn, true);
    const fileInput = document.getElementById('snap-file');
    const urlInput = document.getElementById('snap-url');
    const content = document.getElementById('snap-content').value.trim();
    const location = document.getElementById('snap-location').value.trim();
    const tags = document.getElementById('snap-tags').value.trim();
    try {
        const imageUrl = urlInput ? urlInput.value.trim() : '';
        const imageFile = fileInput && fileInput.files[0] ? fileInput.files[0] : null;
        if (!imageUrl && !imageFile) { showToast('请提供图片（链接或文件）', 'error'); return; }
        const success = await SnapshotsManager.add(content, imageUrl, location, tags, imageFile);
        if (success) { form.reset(); FormValidator.clearErrors(form); }
    } finally {
        FormValidator.setLoadingState(btn, false);
    }
}

async function handleAddMedia(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    FormValidator.clearErrors(form);
    const validation = FormValidator.validateForm(form);
    if (!validation.isValid) { showToast('请检查表单中的错误', 'error'); return; }
    FormValidator.setLoadingState(btn, true);
    const status = document.getElementById('media-status').value;
    const progress = document.getElementById('media-progress').value;
    if (!BgmSearch.selected) { showToast('请先通过 Bangumi 搜索选择条目', 'warning'); FormValidator.setLoadingState(btn, false); return; }
    const subj = BgmSearch.selected;
    const title = subj.name_cn || subj.name || '';
    const cover = (subj.images && (subj.images.large || subj.images.common)) || '';
    const total = subj.eps || subj.vols || 0;
    const tag = 'Bangumi';
    try {
        const success = await MediaManager.add({ title, status, cover, progress: parseInt(progress) || 0, total: parseInt(total) || 0, tag, id: String(subj.id) });
        if (success) { form.reset(); FormValidator.clearErrors(form); }
    } finally {
        FormValidator.setLoadingState(btn, false);
    }
}

async function handleAddFeed(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    FormValidator.clearErrors(form);
    const validation = FormValidator.validateForm(form);
    if (!validation.isValid) { showToast('请检查表单中的错误', 'error'); return; }
    FormValidator.setLoadingState(btn, true);
    const id = document.getElementById('feed-id').value.trim();
    const title = document.getElementById('feed-title').value.trim();
    const url = document.getElementById('feed-url').value.trim();
    const icon = document.getElementById('feed-icon').value.trim();
    try {
        let success = false;
        if (FeedsManager.editingId) {
            success = await FeedsManager.update(FeedsManager.editingId, id, title, url, icon);
            if (success) { FeedsManager.cancelEdit(); }
        } else {
            success = await FeedsManager.add(id, title, url, icon);
            if (success) { form.reset(); FormValidator.clearErrors(form); }
        }
    } finally {
        FormValidator.setLoadingState(btn, false);
    }
}

async function handleAddVideo(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    FormValidator.clearErrors(form);
    const validation = FormValidator.validateForm(form);
    if (!validation.isValid) { showToast('请检查表单中的错误', 'error'); return; }
    FormValidator.setLoadingState(btn, true);
    const bvid = document.getElementById('video-bvid').value.trim();
    const bgmId = document.getElementById('video-bgm-id') ? document.getElementById('video-bgm-id').value.trim() : '';
    const category = document.getElementById('video-category').value;
    const title = document.getElementById('video-title').value.trim();
    const cover = document.getElementById('video-cover').value.trim();
    const duration = document.getElementById('video-duration').value.trim();
    const description = document.getElementById('video-desc').value.trim();
    try {
        const payload = { title, cover, duration, category, bvid, description };
        if (bgmId) payload.bgm_subject_id = bgmId;
        const success = await VideosManager.add(payload);
        if (success) { form.reset(); FormValidator.clearErrors(form); }
    } finally {
        FormValidator.setLoadingState(btn, false);
    }
}

async function fetchSettings() {
    try {
        const data = await safeFetch(`${API_BASE}/settings`);
        if (data.bangumi_username) document.getElementById('setting-bangumi-username').value = data.bangumi_username;
        if (data.bangumi_token) document.getElementById('setting-bangumi-token').value = data.bangumi_token;
        
        // Load Admin Token from localStorage
        const adminToken = localStorage.getItem('admin_token');
        if (adminToken) {
            document.getElementById('setting-admin-token').value = adminToken;
        }
    } catch (e) {
        console.error(e);
        showToast('加载设置失败: ' + e.message);
    }
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '保存中...';
    
    let successCount = 0;
    const errors = [];

    // 1. Save Admin Token locally
    try {
        const adminToken = document.getElementById('setting-admin-token').value.trim();
        if (adminToken) {
            localStorage.setItem('admin_token', adminToken);
            ADMIN_TOKEN = adminToken;
            successCount++;
        }
    } catch (e) { errors.push('Admin Token: ' + e.message); }

    // 2. Save Bangumi Settings
    try {
        const bangumi_username = document.getElementById('setting-bangumi-username').value;
        const bangumi_token = document.getElementById('setting-bangumi-token').value;
        const data = await safeFetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bangumi_username, bangumi_token })
        });
        if (data.success) successCount++;
        else errors.push('Bangumi: ' + (data.error || '失败'));
    } catch (e) {
        errors.push('Bangumi: ' + e.message);
    }

    // 3. Save Notice
    try {
        const noticePayload = {
            content: (document.getElementById('notice-content')?.value || '').trim(),
            show: !!document.getElementById('notice-show')?.checked,
            style: document.getElementById('notice-style')?.value || 'info'
        };
        const res = await safeFetch(`${API_BASE}/notice.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noticePayload)
        });
        if (res && res.success) successCount++;
        else errors.push('公告: 保存失败');
    } catch (e) {
        errors.push('公告: ' + e.message);
    }

    btn.disabled = false;
    btn.innerHTML = originalText;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (errors.length === 0) {
        showToast('所有设置已保存！', 'success');
    } else {
        showToast(`部分保存失败:\n${errors.join('\n')}`, 'warning');
    }
}

// --- Notice Management ---
const NoticeManager = {
    data: { content: '', show: false, style: 'info' },
    async fetch() {
        try {
            const data = await safeFetch(`${API_BASE}/notice`);
            this.data = data || this.data;
            const c = document.getElementById('notice-content');
            const s = document.getElementById('notice-show');
            const st = document.getElementById('notice-style');
            if (c) c.value = this.data.content || '';
            if (s) s.checked = !!this.data.show;
            if (st) st.value = this.data.style || 'info';
        } catch (e) {
            console.error(e);
        }
    },
    async save() {
        const payload = {
            content: (document.getElementById('notice-content')?.value || '').trim(),
            show: !!document.getElementById('notice-show')?.checked,
            style: document.getElementById('notice-style')?.value || 'info'
        };
        try {
            const res = await safeFetch(`${API_BASE}/notice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res && res.success) {
                showToast('公告已保存', 'success');
            } else {
                showToast('保存失败', 'error');
            }
        } catch (e) {
            showToast('保存失败: ' + e.message, 'error');
        }
    }
};
window.NoticeManager = NoticeManager;

// --- Initialization ---

async function checkBackend() {
    try {
        // Try current API base first
        const res = await fetch(`${API_BASE}/bookmarks`);
        if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                console.log('Connected to backend.');
                USE_MOCK = false;
                return true;
            }
        }
        throw new Error('Backend not responding correctly');
    } catch (e) {
        console.warn('Backend check failed:', e);
        
        // Try connecting to default Node server port
        console.warn('Attempting Node server at http://localhost:3000...');
        try {
            const nodeRes = await fetch('http://localhost:3000/api/bookmarks');
            if (nodeRes.ok) {
                API_BASE = 'http://localhost:3000/api';
                USE_MOCK = false;
                console.log('Connected to Node server.');
                showToast('已连接到 Node.js 后端', 'success');
                return true;
            }
        } catch (nodeErr) {
            console.warn('Node server connection failed.');
        }

        // Fallback to Mock
        console.warn('Falling back to Mock Mode.');
        API_BASE = 'mock';
        USE_MOCK = true;
        showToast('未检测到后端，启用演示模式 (数据保存在本地)', 'info');
        loadMockData();
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    KeyboardShortcuts.init();
    DarkModeManager.init();
    
    // Check Backend Connectivity First
    await checkBackend();

    // Then Initialize Token (after API_BASE is settled)
    await initAdminToken();

    // Initial Load
    Dashboard.switchTab('bookmarks');
    
    // Event Listeners
    const bindListener = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('submit', handler);
    };

    bindListener('add-bookmark-form', handleAddBookmark);
    bindListener('add-snapshot-form', handleAddSnapshot);
    // 写入功能禁用：不再绑定添加媒体表单
    bindListener('add-feed-form', handleAddFeed);
    bindListener('add-video-form', handleAddVideo);
    bindListener('settings-form', handleSaveSettings);
    const noticeSave = document.getElementById('notice-save');
    if (noticeSave) noticeSave.addEventListener('click', () => NoticeManager.save());

    const saveTokenBtn = document.getElementById('admin-token-save');
    if (saveTokenBtn) saveTokenBtn.addEventListener('click', () => {
        const v = document.getElementById('admin-token-input')?.value || '';
        setAdminToken(v.trim());
    });
    const clearTokenBtn = document.getElementById('admin-token-clear');
    if (clearTokenBtn) clearTokenBtn.addEventListener('click', () => setAdminToken(''));
    
    // Sync Settings Token Input
    const settingsTokenInput = document.getElementById('setting-admin-token');
    if (settingsTokenInput) {
        settingsTokenInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            // Optional: Auto-save to localStorage/global state as they type, or just on blur?
            // Let's just update the global state but not localStorage to avoid spamming
            // But setAdminToken updates localStorage. 
            // Let's update on change/blur to be safe, or just rely on the Save Settings button?
            // The user wants them synced.
            // If we update here, it might conflict with the "Save Settings" button logic which saves to config.json?
            // No, the "Save Settings" logic (handleSaveSettings) saves to localStorage too.
            // Let's make it sync real-time to the top bar.
            const topInput = document.getElementById('admin-token-input');
            if (topInput) topInput.value = val;
        });
        settingsTokenInput.addEventListener('change', (e) => {
             setAdminToken(e.target.value.trim());
        });
    }
    
    // Sync Top Bar Token Input
    const topTokenInput = document.getElementById('admin-token-input');
    const settingTokenInput = document.getElementById('setting-admin-token');

    const syncToken = (val) => {
        if (topTokenInput && topTokenInput.value !== val) topTokenInput.value = val;
        if (settingTokenInput && settingTokenInput.value !== val) settingTokenInput.value = val;
    };

    if (topTokenInput) {
        topTokenInput.addEventListener('input', (e) => syncToken(e.target.value.trim()));
        topTokenInput.addEventListener('change', (e) => setAdminToken(e.target.value.trim()));
    }

    if (settingTokenInput) {
        settingTokenInput.addEventListener('input', (e) => syncToken(e.target.value.trim()));
        settingTokenInput.addEventListener('change', (e) => setAdminToken(e.target.value.trim()));
    }
    
    // Toggle Sidebar on mobile
    const toggleSidebarBtn = document.querySelector('button[aria-controls="sidebar"]');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.onclick = () => {
             const sidebar = document.getElementById('sidebar');
             const overlay = document.getElementById('sidebar-overlay');
             if (sidebar) sidebar.classList.toggle('-translate-x-full');
             if (overlay) overlay.classList.toggle('hidden');
        };
    }
});

console.log('Admin script loaded.');
    const searchBtn = document.getElementById('bgm-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const kw = document.getElementById('bgm-search-input')?.value || '';
            if (!kw.trim()) { showToast('请输入关键词'); return; }
            BgmSearch.search(kw.trim());
        });
    }
    const results = document.getElementById('bgm-search-results');
    if (results) {
        results.addEventListener('click', (e) => {
            const t = e.target;
            const id = t.getAttribute('data-select-id');
            if (id) BgmSearch.select(id);
        });
    }
