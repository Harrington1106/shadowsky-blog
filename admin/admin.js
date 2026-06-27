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

    const typeClass = type === 'success' ? 'toast-success' : (type === 'error' ? 'toast-error' : (type === 'warning' ? 'toast-warn' : 'toast-info'));
    const el = document.createElement('div');
    el.className = 'admin-toast ' + typeClass;
    if (msg.includes('静态预览模式')) {
        el.classList.add('toast-static-mode');
        type = 'warning';
    }

    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';
    if (type === 'warning') icon = 'alert-triangle';

    const iconColors = {error:'#EF4444',success:'#10B981',warning:'#F59E0B',info:'#3B82F6'};
    el.innerHTML = `<i data-lucide="${icon}" style="width:18px;height:18px;color:${iconColors[type]||iconColors.info};flex-shrink:0"></i><span style="font-weight:500;font-size:.85rem">${msg}</span>`;
    container.appendChild(el);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const priority = type === 'error' ? 8000 : (type === 'warning' ? 6000 : (msg.includes('静态预览模式') ? 10000 : 4000));
    setTimeout(() => { el.style.animation = 'toastOut .3s ease forwards'; setTimeout(() => { if (el.parentNode) el.remove(); }, 300); }, priority);
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
                 updateBackendStatusBadge('static');
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

function normalizeAdminToken(token) {
    return (token || '').trim();
}

function isLocalHost(hostname) {
    const host = (hostname || '').toLowerCase();
    if (!host) return false;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
    if (/^169\.254\./.test(host)) return true;
    if (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true;
    return false;
}

function getTokenFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const token = normalizeAdminToken(params.get('admin_token') || params.get('token') || '');
        if (!token) return '';
        params.delete('admin_token');
        params.delete('token');
        const query = params.toString();
        const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash || ''}`;
        window.history.replaceState({}, '', newUrl);
        return token;
    } catch (e) {
        return '';
    }
}

function updateBackendStatusBadge(mode) {
    const badge = document.getElementById('backend-status-badge');
    const apiText = document.getElementById('api-base-text');
    if (!badge && !apiText) return;

    const baseClass = 'px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 transition-all';
    const states = {
        connected: { className: 'bg-emerald-100 text-emerald-600', icon: 'globe', text: '已连接', api: API_BASE },
        node: { className: 'bg-blue-100 text-blue-700', icon: 'terminal', text: 'Node 后端', api: API_BASE },
        mock: { className: 'bg-yellow-100 text-yellow-700', icon: 'wifi-off', text: '演示模式', api: 'Mock' },
        static: { className: 'bg-amber-100 text-amber-700', icon: 'file-text', text: '静态预览', api: 'Static' },
        error: { className: 'bg-slate-100 text-slate-500', icon: 'wifi-off', text: '未连接', api: '-' }
    };

    const current = states[mode] || states.error;

    if (badge) {
        badge.className = `${baseClass} ${current.className}`;
        badge.innerHTML = `<i data-lucide="${current.icon}" class="w-3 h-3"></i> ${current.text}`;
    }

    if (apiText) {
        apiText.textContent = `API: ${current.api || '-'}`;
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
    const normalized = normalizeAdminToken(token);
    ADMIN_TOKEN = normalized;
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

    const urlToken = getTokenFromUrl();
    if (urlToken) {
        setAdminToken(urlToken);
        return;
    }
    
    // Always try auto-discovery first for localhost/dev environments
    // This ensures we always have the fresh token from server, even if server restarted/rotated token
    let serverToken = null;
    try {
        const allowDiscovery = !USE_MOCK && API_BASE !== 'mock' && (API_BASE.includes('localhost') || isLocalHost(window.location.hostname));
        if (allowDiscovery) {
            console.log('Attempting token auto-discovery...');
            const res = await fetch(`${API_BASE}/debug/token`);
            if (res.ok) {
                const data = await res.json();
                if (data.token) {
                    serverToken = normalizeAdminToken(data.token);
                    console.log('Auto-discovery success. Using server token.');
                }
            } else {
                 console.log('Auto-discovery skipped/failed (not localhost or forbidden).');
            }
        }
    } catch (e) {
        console.log('Auto-discovery network error (ignore if production):', e);
    }

    const saved = normalizeAdminToken(localStorage.getItem('admin_token'));
    let shouldVerify = true;
    
    if (serverToken) {
        // Server provided a token, it is the source of truth
        ADMIN_TOKEN = serverToken;
        if (saved !== serverToken) {
            console.log('Updating local token to match server.');
            setAdminToken(serverToken);
            shouldVerify = false;
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
    if (shouldVerify) verifyToken();
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
                const snap = { ...body, date: new Date().toISOString(), fromAdmin: true };
                if (body.exif) snap.exif = body.exif;
                snapshots.unshift(snap);
            }
            localStorage.setItem('mock_snapshots', JSON.stringify(snapshots));
        }
        if (resource === 'upload') {
            return { success: true, url: 'https://via.placeholder.com/300' };
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
        dialog.className = 'admin-dialog-overlay';
        dialog.innerHTML = `
            <div class="admin-dialog">
                <div class="flex items-center gap-3 mb-4 justify-center">
                    <div style="width:44px;height:44px;background:rgba(239,68,68,.12);border-radius:50%;display:flex;align-items:center;justify-content:center">
                        <i data-lucide="alert-triangle" style="width:22px;height:22px;color:#EF4444"></i>
                    </div>
                </div>
                <h3 style="font-size:1.1rem;font-weight:600;margin-bottom:8px;color:inherit">确认操作</h3>
                <p style="color:#94a3b8;margin-bottom:20px;font-size:.9rem">${message}</p>
                <div class="flex gap-3 justify-center">
                    <button id="dialog-cancel" class="admin-btn admin-btn-secondary">取消</button>
                    <button id="dialog-confirm" class="admin-btn" style="background:rgba(239,68,68,.15);color:#EF4444;border:1px solid rgba(239,68,68,.2)">确认</button>
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
    mergeBookmarks(...lists) {
        const map = new Map();
        const add = (item) => {
            if (!item) return;
            const key = item.url ? this.normalizeBookmarkUrl(item.url) : (item.id || '');
            if (!key) return;
            if (!map.has(key)) map.set(key, item);
        };
        lists.forEach(list => {
            if (!Array.isArray(list)) return;
            list.forEach(add);
        });
        return Array.from(map.values());
    },
    normalizeBookmarkUrl(u) {
        try {
            const url = new URL(u);
            const host = url.hostname.toLowerCase();
            const path = url.pathname.replace(/\/$/, '');
            return host + path;
        } catch (e) {
            return (u || '').trim();
        }
    },
    async fetchPublicBookmarks() {
        try {
            const res = await fetch(`/public/data/bookmarks.json?t=${Date.now()}`);
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    },
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
            
            const apiData = await safeFetch(`${API_BASE}/bookmarks`);
            const publicData = await this.fetchPublicBookmarks();
            const normalizedApi = Array.isArray(apiData) ? apiData : [];
            this.data = this.mergeBookmarks(normalizedApi, publicData);
            bookmarks = this.data;

            // 恢复持久化的检测结果
            try {
                const saved = localStorage.getItem('bm_access_status');
                if (saved) { this.accessStatus = JSON.parse(saved); }
                const savedIds = localStorage.getItem('bm_invalid_ids');
                if (savedIds) { this.invalidIds = JSON.parse(savedIds); }
            } catch {}

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

        // 更新计数
        const countEl = document.getElementById('bm-count');
        if (countEl) countEl.textContent = itemsToRender.length;

        if (itemsToRender.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:48px 24px;color:#94a3b8">
                <i data-lucide="bookmark" style="width:40px;height:40px;opacity:0.3;margin-bottom:12px"></i>
                <p style="font-size:.95rem">暂无收藏</p>
                <p style="font-size:.8rem;margin-top:4px">在左侧添加你的第一个收藏链接</p>
            </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        const tagColors = ['#EC4899','#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#06B6D4','#F97316'];
        itemsToRender.forEach(item => {
            const el = document.createElement('div');
            el.className = 'admin-list-item';
            el.style.cssText = 'display:flex;align-items:flex-start;gap:14px;padding:14px 16px';

            // 状态 + favicon
            const status = this.accessStatus[item.id];
            const domain = (() => { try { return new URL(item.url).hostname; } catch { return ''; } })();
            const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '';

            // 分类路径
            const catName = this.categories[item.category]?.name || item.category || '';
            const subName = item.subcategory ? (this.categories[item.category]?.children?.find(c => c.id === item.subcategory)?.name || item.subcategory) : '';
            const catPath = [catName, subName].filter(Boolean).join(' › ');

            // 标签药丸
            const tagsHtml = (item.tags && item.tags.length)
                ? item.tags.map((t, i) => `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:.68rem;background:${tagColors[i%tagColors.length]}15;color:${tagColors[i%tagColors.length]};border:1px solid ${tagColors[i%tagColors.length]}30">${t}</span>`).join('')
                : '';

            // 状态徽章 + 失效书签灰化
            const isDead = status && status.status !== 'ok';
            let statusHtml = '';
            if (status) {
                if (isDead) {
                    const codeLabel = typeof status.code === 'number' ? status.code : status.code;
                    statusHtml = `<span class="admin-badge admin-badge-err" style="font-size:.65rem"><i data-lucide="x-circle" style="width:11px;height:11px"></i> ${codeLabel}</span>`;
                } else {
                    statusHtml = `<span class="admin-badge admin-badge-ok" style="font-size:.65rem"><i data-lucide="check" style="width:11px;height:11px"></i></span>`;
                }
            }

            el.innerHTML = `
                <div style="flex-shrink:0;width:28px;height:28px;border-radius:6px;overflow:hidden;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;margin-top:2px">
                    ${favicon ? `<img src="${favicon}" style="width:18px;height:18px;opacity:${isDead ? 0.3 : 1}" onerror="this.style.display='none'" alt="">` : `<i data-lucide="link-2" style="width:14px;height:14px;opacity:.4"></i>`}
                </div>
                <div style="flex:1;min-width:0;${isDead ? 'opacity:0.55' : ''}">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                        <span style="font-weight:600;font-size:.88rem;color:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${isDead ? 'text-decoration:line-through;text-decoration-color:rgba(239,68,68,.4);text-decoration-thickness:1px' : ''}">${item.title || '无标题'}</span>
                        ${statusHtml}
                    </div>
                    <a href="${item.url}" target="_blank" style="font-size:.78rem;color:#64748b;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:420px" title="${item.url}">${item.url}</a>
                    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:5px;font-size:.72rem;color:#94a3b8">
                        ${catPath ? `<span style="background:rgba(255,255,255,.03);padding:2px 8px;border-radius:4px">${catPath}</span>` : ''}
                        ${tagsHtml}
                        ${item.addedAt ? `<span>${new Date(item.addedAt).toLocaleDateString('zh-CN')}</span>` : ''}
                    </div>
                    ${item.description ? `<p style="font-size:.75rem;color:#64748b;margin-top:4px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${item.description}</p>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
                    <button onclick="navigator.clipboard.writeText('${item.url.replace(/'/g, "\\'")}');showToast('链接已复制','success')" style="background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:#94a3b8" title="复制链接">
                        <i data-lucide="copy" style="width:15px;height:15px"></i>
                    </button>
                    <a href="${item.url}" target="_blank" style="padding:6px;border-radius:8px;color:#94a3b8;text-decoration:none" title="打开链接">
                        <i data-lucide="external-link" style="width:15px;height:15px"></i>
                    </a>
                    <button onclick="BookmarksManager.edit('${item.id}')" style="background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:#94a3b8" title="编辑">
                        <i data-lucide="edit-2" style="width:15px;height:15px"></i>
                    </button>
                    <button onclick="BookmarksManager.delete('${item.id || item.url}')" style="background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:#94a3b8" title="删除">
                        <i data-lucide="trash-2" style="width:15px;height:15px"></i>
                    </button>
                </div>`;
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
        if (descInput) descInput.value = item.description || item.desc || '';
        
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
        // Reset primary dropdown
        const primaryContainer = document.getElementById('bm-category-select');
        if (primaryContainer) {
            const label = primaryContainer.querySelector('.custom-select-label');
            if (label) { label.textContent = '选择一级分类...'; label.classList.add('is-placeholder'); }
            primaryContainer.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        }
        // Reset secondary dropdown
        BookmarksManager.updateSecondaryOptions('');

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
    sort(mode) {
        const items = [...this.data];
        switch(mode) {
            case 'newest': items.sort((a,b) => new Date(b.addedAt||0) - new Date(a.addedAt||0)); break;
            case 'oldest': items.sort((a,b) => new Date(a.addedAt||0) - new Date(b.addedAt||0)); break;
            case 'title': items.sort((a,b) => (a.title||'').localeCompare(b.title||'')); break;
            case 'category': items.sort((a,b) => (a.category||'').localeCompare(b.category||'') || (a.subcategory||'').localeCompare(b.subcategory||'')); break;
        }
        this.data = items; bookmarks = items;
        this.render();
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

        let gotTitle = false;
        try {
            // 1. 尝试服务端获取
            const res = await safeFetch(`${API_BASE}/metadata?url=${encodeURIComponent(url)}`);
            if (res && !res.error && res.title) {
                document.getElementById('bm-title').value = res.title;
                const descInput = document.getElementById('bm-desc');
                if (descInput && res.description) descInput.value = res.description;
                showToast('标题和描述获取成功', 'success');
                gotTitle = true;
            } else {
                // 2. 服务端失败 → 尝试 AI 根据域名推理
                gotTitle = await this.aiGuessTitle(url);
            }
        } catch (e) {
            // safeFetch 可能抛异常（非 GET 才会，但兜底）
            gotTitle = await this.aiGuessTitle(url);
        } finally {
            if (btn) {
                btn.innerHTML = '<i data-lucide="wand-2" class="w-3.5 h-3.5"></i>';
                btn.disabled = false;
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },
    async aiGuessTitle(url) {
        try {
            const s = JSON.parse(localStorage.getItem('ai_settings') || '{}');
            if (!s.apiKey) {
                this.fillDomainAsTitle(url, '请先在RSS页面配置AI翻译');
                return false;
            }
            const domain = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
            const r = await fetch(`${s.baseUrl || 'https://api.deepseek.com/v1'}/chat/completions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: s.model || 'deepseek-chat',
                    messages: [{
                        role: 'system',
                        content: '根据用户提供的网址/域名，推测网站名称和简介。直接返回 JSON：{"title":"网站名","desc":"一句话中文简介"}。不要任何其他内容。'
                    }, {
                        role: 'user',
                        content: domain
                    }],
                    temperature: 0.3,
                    response_format: { type: 'json_object' }
                })
            });
            if (!r.ok) {
                let errMsg = `AI HTTP ${r.status}`;
                try { const e = await r.json(); if (e.error?.message) errMsg = e.error.message; } catch (_) {}
                throw new Error(errMsg);
            }
            const data = await r.json();
            const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');
            if (content.title) {
                document.getElementById('bm-title').value = content.title;
                const descInput = document.getElementById('bm-desc');
                if (descInput && content.desc) descInput.value = content.desc;
                showToast('AI 已推测标题和简介', 'success');
                return true;
            }
        } catch (e) {
            console.warn('AI guess failed:', e.message);
        }
        this.fillDomainAsTitle(url, 'AI 推测失败');
        return false;
    },
    fillDomainAsTitle(url, reason) {
        try {
            const u = new URL(url);
            document.getElementById('bm-title').value = u.hostname.replace(/^www\./, '');
            showToast(reason + '，已填入域名', 'warning');
        } catch (_) {
            showToast('获取失败，请手动填写', 'warning');
        }
    },
    async translateDesc(btn) {
        const descEl = document.getElementById('bm-desc');
        const text = descEl.value.trim();
        if (!text) return showToast('请先获取或输入描述内容', 'warning');
        const cjk = (text.match(/[一-鿿]/g)||[]).length;
        if (cjk / text.length > 0.5) return showToast('描述似乎已是中文', 'info');

        if (!btn) btn = document.getElementById('btn-translate-desc');
        const orig = btn.innerHTML; btn.innerHTML = '<i data-lucide="loader-2" style="width:12px;height:12px;animation:spin 1s linear infinite"></i>';
        btn.disabled = true; if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
            const s = JSON.parse(localStorage.getItem('ai_settings')||'{}');
            if (!s.apiKey) throw new Error('请先在RSS页面配置AI翻译 (设置→AI翻译)');
            const r = await fetch(`${s.baseUrl||'https://api.deepseek.com/v1'}/chat/completions`, {
                method:'POST', headers:{'Authorization':`Bearer ${s.apiKey}`,'Content-Type':'application/json'},
                body:JSON.stringify({model:s.model||'deepseek-chat',messages:[
                    {role:'system',content:'将以下英文网站描述翻译成简体中文简介。要求：简洁自然，不出现"您可以""欢迎来到"等套话，直接描述网站内容和特色。只返回译文。'},
                    {role:'user',content:text}
                ],temperature:0.3})
            });
            if (!r.ok) {
                let errMsg = `HTTP ${r.status}`;
                try {
                    const e = await r.json();
                    if (e.error?.message) errMsg = e.error.message;
                    else if (typeof e.error === 'string') errMsg = e.error;
                } catch (_) {}
                if (r.status === 503) errMsg += '（服务暂不可用，请稍后重试）';
                throw new Error(errMsg);
            }
            const respData = await r.json();
            const translated = respData.choices?.[0]?.message?.content?.trim();
            if (!translated) throw new Error('AI 返回内容为空，请重试');
            descEl.value = translated;
            showToast('翻译完成', 'success');
        } catch(e) { showToast('翻译失败: ' + e.message, 'error'); }
        btn.innerHTML = orig; btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
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

            // 持久化检测结果
            try { localStorage.setItem('bm_access_status', JSON.stringify(this.accessStatus)); } catch {}
            try { localStorage.setItem('bm_invalid_ids', JSON.stringify(this.invalidIds)); } catch {}

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
                    try { localStorage.removeItem('bm_access_status'); localStorage.removeItem('bm_invalid_ids'); } catch {}
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
        const container = document.getElementById('bm-subcategory-select');
        if (!container) return;
        const trigger = container.querySelector('.custom-select-trigger');
        const dropdown = container.querySelector('.custom-select-dropdown');
        const label = trigger.querySelector('.custom-select-label');

        dropdown.innerHTML = '';

        if (categoryKey && this.categories[categoryKey] && this.categories[categoryKey].children) {
            trigger.disabled = false;
            trigger.style.opacity = '1';
            const children = this.categories[categoryKey].children;
            children.forEach(sub => {
                const opt = document.createElement('button');
                opt.type = 'button';
                opt.className = 'custom-select-option';
                opt.dataset.value = sub.id;
                opt.textContent = sub.name;
                opt.addEventListener('click', () => {
                    label.textContent = sub.name;
                    label.classList.remove('is-placeholder');
                    document.getElementById('bm-subcategory').value = sub.id;
                    // Update selected state
                    dropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    closeDropdown(container);
                });
                dropdown.appendChild(opt);
            });
        } else {
            trigger.disabled = true;
            trigger.style.opacity = '0.4';
            label.textContent = trigger.dataset.placeholder || '选择二级分类...';
            label.classList.add('is-placeholder');
            document.getElementById('bm-subcategory').value = '';
        }
    },
    populateCategories() {
        const primaryContainer = document.getElementById('bm-category-select');
        const secondaryContainer = document.getElementById('bm-subcategory-select');
        if (!primaryContainer || !secondaryContainer) return;

        // Build primary dropdown
        const primaryTrigger = primaryContainer.querySelector('.custom-select-trigger');
        const primaryDropdown = primaryContainer.querySelector('.custom-select-dropdown');
        const primaryLabel = primaryTrigger.querySelector('.custom-select-label');

        primaryDropdown.innerHTML = '';

        if (!this.categories || typeof this.categories !== 'object') return;

        const sortedCategories = Object.entries(this.categories)
            .sort(([, a], [, b]) => (a.order || 999) - (b.order || 999));

        sortedCategories.forEach(([key, cat]) => {
            const opt = document.createElement('button');
            opt.type = 'button';
            opt.className = 'custom-select-option';
            opt.dataset.value = key;
            opt.textContent = cat.name || key;
            opt.addEventListener('click', () => {
                primaryLabel.textContent = cat.name || key;
                primaryLabel.classList.remove('is-placeholder');
                document.getElementById('bm-category').value = key;
                document.getElementById('bm-subcategory').value = '';
                primaryDropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.updateSecondaryOptions(key);
                closeDropdown(primaryContainer);
            });
            primaryDropdown.appendChild(opt);
        });

        // Reset secondary
        this.updateSecondaryOptions('');
    },
    syncCategoryUI() {
        const primaryContainer = document.getElementById('bm-category-select');
        const secondaryContainer = document.getElementById('bm-subcategory-select');
        const categoryInput = document.getElementById('bm-category');
        const subcategoryInput = document.getElementById('bm-subcategory');

        if (!primaryContainer || !secondaryContainer) return;

        const currentPrimary = categoryInput.value;
        if (currentPrimary) {
            const primaryTrigger = primaryContainer.querySelector('.custom-select-trigger');
            const primaryLabel = primaryTrigger.querySelector('.custom-select-label');
            const catName = this.categories[currentPrimary]?.name || currentPrimary;
            primaryLabel.textContent = catName;
            primaryLabel.classList.remove('is-placeholder');
            // Update selected state
            primaryContainer.querySelectorAll('.custom-select-option').forEach(o => {
                o.classList.toggle('selected', o.dataset.value === currentPrimary);
            });

            this.updateSecondaryOptions(currentPrimary);

            const currentSecondary = subcategoryInput.value;
            if (currentSecondary) {
                const secTrigger = secondaryContainer.querySelector('.custom-select-trigger');
                const secLabel = secTrigger.querySelector('.custom-select-label');
                const child = this.categories[currentPrimary]?.children?.find(c => c.id === currentSecondary);
                if (child) {
                    secLabel.textContent = child.name;
                    secLabel.classList.remove('is-placeholder');
                }
                secondaryContainer.querySelectorAll('.custom-select-option').forEach(o => {
                    o.classList.toggle('selected', o.dataset.value === currentSecondary);
                });
            }
        }
    },

    /** 添加分类/子分类 */
    async addCategory(key, name, parentKey = null) {
        try {
            if (!key || !name) { showToast('请输入分类ID和名称', 'warning'); return false; }
            if (!/^[a-z0-9_]+$/i.test(key)) { showToast('分类ID只能包含字母、数字和下划线', 'warning'); return false; }

            const body = { key, name };
            if (parentKey) body.parentKey = parentKey;

            if (USE_MOCK) {
                if (parentKey) {
                    if (!this.categories[parentKey]) { this.categories[parentKey] = { name: parentKey, order: 999, children: [] }; }
                    if (!this.categories[parentKey].children) this.categories[parentKey].children = [];
                    if (this.categories[parentKey].children.find(c => c.id === key)) { showToast('子分类ID已存在', 'error'); return false; }
                    this.categories[parentKey].children.push({ id: key, name });
                } else {
                    if (this.categories[key]) { showToast('分类ID已存在', 'error'); return false; }
                    this.categories[key] = { name, order: 999, children: [] };
                }
                this.populateCategories();
                showToast(`分类 "${name}" 已添加`, 'success');
                return true;
            }

            const data = await safeFetch(`${API_BASE}/categories/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (data && data.success) {
                if (parentKey) {
                    if (!this.categories[parentKey]) this.categories[parentKey] = { name: parentKey, order: 999, children: [] };
                    if (!this.categories[parentKey].children) this.categories[parentKey].children = [];
                    this.categories[parentKey].children.push({ id: key, name });
                } else {
                    this.categories[key] = { name, order: 999, children: [] };
                }
                this.populateCategories();
                showToast(`分类 "${name}" 已添加`, 'success');
                return true;
            }
            showToast(data?.error || '添加分类失败', 'error');
            return false;
        } catch (e) {
            showToast('添加分类失败: ' + e.message, 'error');
            return false;
        }
    },

    /** 删除分类/子分类 */
    deleteCategory(categoryKey, childKey = null) {
        const bmData = this.data || [];
        const affectedCount = childKey
            ? bmData.filter(b => b.category === categoryKey && b.subcategory === childKey).length
            : bmData.filter(b => b.category === categoryKey).length;

        const cName = this.categories[categoryKey]?.name || categoryKey;
        const sName = childKey
            ? (this.categories[categoryKey]?.children?.find(c => c.id === childKey)?.name || childKey)
            : '';
        const targetName = childKey ? `${cName} › ${sName}` : cName;

        let msg = `确定要删除分类 "${targetName}" 吗？`;
        if (childKey) {
            // 检查子分类数量
            const subCount = this.categories[categoryKey]?.children?.length || 0;
            if (subCount <= 1) msg += `\n\n⚠️ 这是「${cName}」的最后一个子分类。`;
        } else {
            const subCount = this.categories[categoryKey]?.children?.length || 0;
            if (subCount > 0) msg += `\n\n⚠️ 该分类下 ${subCount} 个子分类将被一起删除。`;
        }
        if (affectedCount > 0) {
            msg += `\n\n⚠️ ${affectedCount} 个书签将被保留（分类字段不受影响）。`;
        }

        ConfirmationDialog.show(msg, async () => {
            try {
                if (USE_MOCK) {
                    if (childKey) {
                        if (this.categories[categoryKey]?.children) {
                            this.categories[categoryKey].children = this.categories[categoryKey].children.filter(c => c.id !== childKey);
                        }
                    } else {
                        delete this.categories[categoryKey];
                    }
                    this.populateCategories();
                    showToast(`分类 "${targetName}" 已删除`, 'success');
                    return;
                }

                const params = new URLSearchParams();
                params.set('key', categoryKey);
                if (childKey) params.set('childKey', childKey);
                const data = await safeFetch(`${API_BASE}/categories?${params.toString()}`, { method: 'DELETE' });
                if (data && data.success) {
                    if (childKey) {
                        if (this.categories[categoryKey]?.children) {
                            this.categories[categoryKey].children = this.categories[categoryKey].children.filter(c => c.id !== childKey);
                        }
                    } else {
                        delete this.categories[categoryKey];
                    }
                    this.populateCategories();
                    showToast(`分类 "${targetName}" 已删除`, 'success');
                } else {
                    showToast(data?.error || '删除失败', 'error');
                }
            } catch (e) {
                showToast('删除失败: ' + e.message, 'error');
            }
        });
    },

    /** 重命名分类/子分类（支持改 key） */
    async renameCategory(key, newName, childKey = null, newKey = null) {
        try {
            if (!key || !newName) { showToast('请输入名称', 'warning'); return false; }
            const targetKey = newKey || key;

            if (USE_MOCK) {
                if (childKey) {
                    const child = this.categories[key]?.children?.find(c => c.id === childKey);
                    if (child) { child.name = newName; if (newKey) child.id = newKey; }
                } else {
                    if (this.categories[key]) {
                        this.categories[key].name = newName;
                        if (newKey && newKey !== key) {
                            this.categories[newKey] = this.categories[key];
                            delete this.categories[key];
                        }
                    }
                }
                this.populateCategories();
                showToast(`已重命名为 "${newName}"`, 'success');
                return true;
            }

            const data = await safeFetch(`${API_BASE}/categories/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, newKey: targetKey !== key ? targetKey : undefined, newName, childKey })
            });
            if (data && data.success) {
                const finalKey = data.newKey || targetKey;
                if (childKey) {
                    const child = this.categories[finalKey]?.children?.find(c => c.id === (data.newKey ? finalKey : childKey));
                    if (child) child.name = newName;
                } else {
                    if (this.categories[finalKey]) this.categories[finalKey].name = newName;
                }
                this.populateCategories();
                showToast(`已重命名为 "${newName}"`, 'success');
                return true;
            }
            showToast(data?.error || '重命名失败', 'error');
            return false;
        } catch (e) {
            showToast('重命名失败: ' + e.message, 'error');
            return false;
        }
    }
};

// ═══════ PicGo 客户端 ═══════
const PicGoClient = {
    baseUrl: 'http://127.0.0.1:36677',
    available: false,
    version: '',

    /** 检查 PicGo/PicList 是否在运行 */
    async checkStatus() {
        const dotEl = document.getElementById('picgo-dot');
        const textEl = document.getElementById('picgo-text');
        const retryEl = document.getElementById('picgo-retry');
        const statusEl = document.getElementById('picgo-status');
        if (statusEl) statusEl.style.display = 'flex';
        if (dotEl) {
            dotEl.style.background = '#f59e0b';
            dotEl.style.boxShadow = '0 0 6px rgba(245,158,11,.5)';
            dotEl.style.animation = 'pulse-dot 1.5s ease-in-out infinite';
        }
        if (textEl) {
            textEl.textContent = '检测连接中...';
            textEl.style.color = '#fcd34d';
        }
        if (retryEl) retryEl.style.display = 'none';

        // 用 POST /upload 发空请求检测 — PicList 会秒回 JSON 错误
        // 比 GET / 可靠，PicList 没有 GET / 路由会挂起
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2000);
            const resp = await fetch(`${this.baseUrl}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
                signal: ctrl.signal,
                cache: 'no-cache'
            });
            clearTimeout(timer);
            // 任何响应（包括错误JSON）都说明服务在运行
            if (resp) {
                this.available = true;
                try {
                    const data = await resp.json();
                    // PicList 可能返回版本信息
                    this.version = data.version || '';
                } catch (e) {}
            }
        } catch (e) {
            this.available = false;
            this.version = '';
        }
        this.updateUI();
        return this.available;
    },

    /** 通过 PicGo 上传图片，返回 CDN URL 列表 */
    async upload(file) {
        // 用 XHR 代替 fetch — 某些场景下 XHR 的 FormData 编码更可靠
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            // 重新构造 File 对象确保兼容性
            const f = new File([file], file.name || 'image.png', { type: file.type || 'image/png' });
            formData.append('list', f, f.name);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${this.baseUrl}/upload`);
            xhr.onload = () => {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (result.success) {
                        resolve(Array.isArray(result.result) ? result.result : []);
                    } else {
                        reject(new Error(result.message || result.error || 'PicGo 上传失败'));
                    }
                } catch (e) {
                    reject(new Error(`PicGo 响应解析失败: ${xhr.responseText?.slice(0, 100)}`));
                }
            };
            xhr.onerror = () => reject(new Error('PicGo 通信失败，请检查 PicGo 是否运行'));
            xhr.ontimeout = () => reject(new Error('PicGo 上传超时'));
            xhr.timeout = 30000;
            xhr.send(formData);
        });
    },

    updateUI() {
        const statusEl = document.getElementById('picgo-status');
        const dotEl = document.getElementById('picgo-dot');
        const textEl = document.getElementById('picgo-text');
        const retryEl = document.getElementById('picgo-retry');
        if (!statusEl || !dotEl || !textEl) return;

        // 始终可见
        statusEl.style.display = 'flex';

        if (this.available) {
            dotEl.style.background = '#22c55e';
            dotEl.style.boxShadow = '0 0 8px rgba(34,197,94,.5)';
            dotEl.style.animation = 'none';
            textEl.textContent = this.version ? `PicGo 已连接 (v${this.version})` : 'PicGo 已连接';
            textEl.style.color = '#86efac';
            if (retryEl) retryEl.style.display = 'none';
        } else {
            dotEl.style.background = '#ef4444';
            dotEl.style.boxShadow = '0 0 8px rgba(239,68,68,.5)';
            dotEl.style.animation = 'none';
            const method = ImageUploader.method;
            if (method === 'picgo') {
                textEl.textContent = 'PicGo 未启动 — 请打开 PicGo 桌面端或切换上传方式';
                textEl.style.color = '#fca5a5';
            } else {
                textEl.textContent = 'PicGo 未启动（当前使用其他上传方式）';
                textEl.style.color = '#94a3b8';
            }
            if (retryEl) retryEl.style.display = 'inline-block';
        }
    }
};

// ═══════ 图片上传管理器 ═══════
const ImageUploader = {
    method: 'picgo',  // 'picgo' | 'direct' | 'url'
    files: [],          // File 对象数组
    previewUrls: [],    // blob: URL 数组
    _initialized: false,

    /** 初始化：绑定事件 + 检查 PicGo */
    init() {
        if (this._initialized) {
            PicGoClient.checkStatus();
            return;
        }
        this._initialized = true;
        this.setMethod('picgo');
        PicGoClient.checkStatus();
        // 监听粘贴（只绑定一次）
        document.addEventListener('paste', (e) => {
            const view = document.getElementById('view-snapshots');
            if (!view || view.classList.contains('hidden')) return;
            this.handlePaste(e);
        });
    },

    /** 切换上传方式 */
    setMethod(method) {
        this.method = method;
        // 更新 tabs 样式
        document.querySelectorAll('.snap-method-btn').forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
            btn.style.fontWeight = '400';
        });
        const activeBtn = document.getElementById(`snap-method-${method}`);
        if (activeBtn) {
            activeBtn.style.background = '#14B8A6';
            activeBtn.style.color = '#fff';
            activeBtn.style.fontWeight = '600';
        }
        // 切换拖拽区 / URL 输入
        const dropzone = document.getElementById('snap-dropzone');
        const urlArea = document.getElementById('snap-url-area');
        if (method === 'url') {
            if (dropzone) dropzone.style.display = 'none';
            if (urlArea) urlArea.style.display = 'block';
            this.clearFiles();
        } else {
            if (dropzone) dropzone.style.display = '';
            if (urlArea) urlArea.style.display = 'none';
        }
        // PicGo 状态始终可见，切换后刷新
        PicGoClient.updateUI();
    },

    /** 拖拽事件 */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const dz = document.getElementById('snap-dropzone');
        if (dz) {
            dz.style.borderColor = '#14B8A6';
            dz.style.background = 'rgba(20,184,166,.06)';
        }
    },
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const dz = document.getElementById('snap-dropzone');
        if (dz) {
            dz.style.borderColor = 'rgba(255,255,255,.1)';
            dz.style.background = 'rgba(255,255,255,.015)';
        }
    },
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.handleDragLeave(e);
        if (this.method === 'url') return;
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            this.addFiles(dt.files);
        }
    },

    /** 文件选择 */
    handleFileSelect(e) {
        if (this.method === 'url') return;
        if (e.target.files && e.target.files.length > 0) {
            this.addFiles(e.target.files);
        }
        // 重置 input 以便重复选同一文件
        e.target.value = '';
    },

    /** 粘贴事件 */
    handlePaste(e) {
        if (this.method === 'url') return;
        const items = e.clipboardData?.items;
        if (!items) return;
        const imageItems = [];
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                imageItems.push(item.getAsFile());
            }
        }
        if (imageItems.length > 0) {
            e.preventDefault();
            this.addFiles(imageItems);
        }
    },

    /** 添加文件 + 生成预览 */
    addFiles(fileList) {
        const newFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
        if (newFiles.length === 0) {
            showToast('请选择图片文件', 'warning');
            return;
        }
        this.files.push(...newFiles);
        // 生成预览 URL
        for (const f of newFiles) {
            const blobUrl = URL.createObjectURL(f);
            this.previewUrls.push(blobUrl);
        }
        this.renderPreviews();
        // 如果 PicGo 模式且之前未检测，重新检测
        if (this.method === 'picgo' && !PicGoClient.available) {
            PicGoClient.checkStatus();
        }
    },

    /** 移除文件 */
    removeFile(index) {
        if (this.previewUrls[index]) {
            URL.revokeObjectURL(this.previewUrls[index]);
        }
        this.files.splice(index, 1);
        this.previewUrls.splice(index, 1);
        this.renderPreviews();
    },

    /** 清空所有文件 */
    clearFiles() {
        this.previewUrls.forEach(u => URL.revokeObjectURL(u));
        this.files = [];
        this.previewUrls = [];
        this.renderPreviews();
    },

    /** 渲染预览卡片 */
    renderPreviews() {
        const container = document.getElementById('snap-previews');
        if (!container) return;
        container.innerHTML = '';
        if (this.files.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        this.files.forEach((f, i) => {
            const card = document.createElement('div');
            card.className = 'relative flex-shrink-0 rounded-xl overflow-hidden';
            card.style.width = '120px';
            card.style.height = '120px';
            card.style.border = '1px solid rgba(255,255,255,.08)';
            card.innerHTML = `
                <img src="${this.previewUrls[i]}" class="w-full h-full object-cover">
                <div class="absolute bottom-0 left-0 right-0 text-xs px-2 py-1 truncate"
                    style="background:rgba(0,0,0,.7);color:#e2e8f0">${f.name}</div>
                <button type="button" onclick="ImageUploader.removeFile(${i})"
                    class="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                    style="background:rgba(239,68,68,.85)">×</button>
            `;
            container.appendChild(card);
        });
        // 更新拖拽区提示
        const dz = document.getElementById('snap-dropzone');
        if (dz) {
            const hint = dz.querySelector('p:first-of-type');
            if (hint) hint.textContent = this.files.length > 0
                ? `已选择 ${this.files.length} 张图片（可继续添加）`
                : '拖拽图片到此处';
        }
    },

    /** 上传所有图片，返回 URL 数组 */
    async uploadAll() {
        // URL 模式：直接返回输入框中的 URL
        if (this.method === 'url') {
            const urlInput = document.getElementById('snap-url');
            const url = urlInput ? urlInput.value.trim() : '';
            if (!url) throw new Error('请输入图片链接');
            // 提取 Markdown 语法中的 URL
            const mdMatch = url.match(/!\[.*?\]\((.*?)\)/);
            return [mdMatch ? mdMatch[1].trim() : url];
        }

        if (this.files.length === 0) throw new Error('请先选择图片');

        const statusEl = document.getElementById('snap-upload-status');
        const progressEl = document.getElementById('snap-upload-progress');
        const showProgress = (msg) => {
            if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = msg; }
            if (progressEl) { progressEl.style.display = 'inline'; progressEl.textContent = msg; }
        };
        const hideProgress = () => {
            if (statusEl) statusEl.style.display = 'none';
            if (progressEl) progressEl.style.display = 'none';
        };

        const urls = [];

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            showProgress(`上传中 ${i + 1}/${this.files.length}...`);

            if (this.method === 'picgo') {
                if (!PicGoClient.available) {
                    throw new Error('PicGo 未连接，请启动 PicGo 或切换到"直传服务器"模式');
                }
                try {
                    const result = await PicGoClient.upload(file);
                    urls.push(...result);
                } catch (picgoErr) {
                    // PicGo 上传失败 → 自动回退到直传
                    console.warn('PicGo 上传失败，回退直传:', picgoErr.message);
                    showToast(`PicGo: ${picgoErr.message}，改为直传服务器`, 'warning');
                    const fallbackForm = new FormData();
                    fallbackForm.append('image', file);
                    const fbData = await safeFetch(`${API_BASE}/upload`, {
                        method: 'POST',
                        body: fallbackForm
                    });
                    if (!fbData.success) {
                        throw new Error(fbData.error || '直传也失败了');
                    }
                    urls.push(fbData.url);
                }
            } else {
                // 直传服务器
                const formData = new FormData();
                formData.append('image', file);
                const data = await safeFetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                });
                if (!data.success) {
                    throw new Error(data.error || '服务器上传失败');
                }
                urls.push(data.url);
            }
        }

        hideProgress();
        return urls;
    },

    /** EXIF 面板切换 */
    toggleExif() {
        const panel = document.getElementById('exif-panel');
        const chevron = document.getElementById('exif-chevron');
        if (!panel || !chevron) return;
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'grid';
        chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
    },

    /** 从文件自动提取 EXIF（简单的 JPEG 解析） */
    autoExif() {
        const file = this.files[0];
        if (!file) {
            showToast('请先选择一张图片', 'warning');
            return;
        }
        if (file.type !== 'image/jpeg') {
            showToast('EXIF 自动提取仅支持 JPEG 格式，其他格式请手动填写', 'warning');
            return;
        }
        // 打开 EXIF 面板
        const panel = document.getElementById('exif-panel');
        const chevron = document.getElementById('exif-chevron');
        if (panel && panel.style.display === 'none') {
            panel.style.display = 'grid';
            if (chevron) chevron.style.transform = 'rotate(90deg)';
        }

        const reader = new FileReader();
        reader.onload = function() {
            try {
                const dv = new DataView(reader.result);
                const exif = ImageUploader.parseExif(dv);
                if (exif.camera) document.getElementById('exif-camera').value = exif.camera;
                if (exif.lens) document.getElementById('exif-lens').value = exif.lens;
                if (exif.iso) document.getElementById('exif-iso').value = String(exif.iso);
                if (exif.aperture) document.getElementById('exif-aperture').value = 'f/' + exif.aperture.toFixed(1);
                if (exif.shutter) document.getElementById('exif-shutter').value = exif.shutter;
                if (!exif.camera && !exif.iso) {
                    showToast('此图片不含 EXIF 信息，请手动填写', 'info');
                } else {
                    showToast('EXIF 已自动提取', 'success');
                }
            } catch (e) {
                showToast('EXIF 解析失败: ' + e.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file.slice(0, 65536)); // 只读前 64KB
    },

    /** 简单 JPEG EXIF 解析 */
    parseExif(dv) {
        // 检测 JPEG SOI
        if (dv.getUint16(0, false) !== 0xFFD8) return {};

        const result = {};
        let offset = 2;
        while (offset < dv.byteLength) {
            if (dv.getUint16(offset, false) === 0xFFE1) {
                const exifOffset = offset;
                // Check "Exif\0\0" header
                const header = String.fromCharCode(...new Uint8Array(dv.buffer, exifOffset + 4, 6));
                if (header !== 'Exif\x00\x00') break;

                const tiffOffset = exifOffset + 10;
                const bigEndian = dv.getUint16(tiffOffset, false) === 0x4D4D;
                const ifd0Offset = dv.getUint32(tiffOffset + 4, bigEndian);
                const entries = dv.getUint16(tiffOffset + ifd0Offset, bigEndian);

                // EXIF tags we care about
                const TAG_MAKE = 0x010F;
                const TAG_MODEL = 0x0110;
                const TAG_ISO = 0x8827;
                const TAG_APERTURE = 0x829D;
                const TAG_SHUTTER = 0x829A;
                const TAG_LENS = 0xA434;

                let entryOff = tiffOffset + ifd0Offset + 2;
                for (let i = 0; i < entries; i++) {
                    const tag = dv.getUint16(entryOff, bigEndian);
                    const type = dv.getUint16(entryOff + 2, bigEndian);
                    const count = dv.getUint32(entryOff + 4, bigEndian);
                    const valueOff = entryOff + 8;

                    if (tag === TAG_MAKE || tag === TAG_MODEL || tag === TAG_LENS) {
                        // ASCII string
                        const strOff = tiffOffset + (count > 4 ? dv.getUint32(valueOff, bigEndian) : valueOff);
                        let str = '';
                        for (let j = 0; j < count - 1; j++) {
                            str += String.fromCharCode(dv.getUint8(strOff + j));
                        }
                        if (tag === TAG_MAKE) result.make = str;
                        if (tag === TAG_MODEL) result.model = str;
                        if (tag === TAG_LENS) result.lens = str;
                    }
                    if (tag === TAG_ISO) {
                        const iso = count > 1
                            ? dv.getUint32(tiffOffset + dv.getUint32(valueOff, bigEndian), bigEndian)
                            : dv.getUint16(valueOff, bigEndian);
                        result.iso = iso;
                    }
                    if (tag === TAG_APERTURE) {
                        const raw = dv.getUint32(valueOff, bigEndian);
                        const num = dv.getUint16(valueOff, bigEndian);
                        const den = dv.getUint16(valueOff + 2, bigEndian);
                        result.aperture = Math.pow(2, (num/den) / 2);
                    }
                    if (tag === TAG_SHUTTER) {
                        const raw = dv.getUint32(valueOff, bigEndian);
                        const num = dv.getUint16(valueOff, bigEndian);
                        const den = dv.getUint16(valueOff + 2, bigEndian);
                        if (num / den <= 1) {
                            result.shutter = '1/' + Math.round(den/num);
                        } else {
                            result.shutter = (num/den).toFixed(1) + 's';
                        }
                    }

                    entryOff += 12;
                }

                // Compose camera string
                if (result.make && result.model) {
                    result.camera = result.model.startsWith(result.make)
                        ? result.model
                        : `${result.make} ${result.model}`;
                } else {
                    result.camera = result.make || result.model || '';
                }

                return result;
            }
            offset += 2 + dv.getUint16(offset + 2, false);
        }
        return result;
    },

    /** 重置 */
    reset() {
        this.clearFiles();
        document.getElementById('snap-url').value = '';
        document.getElementById('snap-content').value = '';
        document.getElementById('snap-location').value = '';
        document.getElementById('snap-tags').value = '';
        document.getElementById('exif-camera').value = '';
        document.getElementById('exif-lens').value = '';
        document.getElementById('exif-iso').value = '';
        document.getElementById('exif-aperture').value = '';
        document.getElementById('exif-shutter').value = '';
        document.getElementById('exif-panel').style.display = 'none';
        document.getElementById('exif-chevron').style.transform = '';
    }
};

// ═══════ 社交链接管理器 ═══════
const SOCIAL_PRESETS = {
    'GitHub':       { url: 'https://github.com/', icon: 'simple:github' },
    'Twitter / X':  { url: 'https://twitter.com/', icon: 'simple:x' },
    'Bilibili':     { url: 'https://space.bilibili.com/', icon: 'simple:bilibili' },
    '微博':         { url: 'https://weibo.com/', icon: 'simple:sinaweibo' },
    '知乎':         { url: 'https://www.zhihu.com/', icon: 'simple:zhihu' },
    '小红书':       { url: 'https://www.xiaohongshu.com/', icon: 'simple:xiaohongshu' },
    '抖音':         { url: 'https://www.douyin.com/', icon: 'simple:tiktok' },
    '豆瓣':         { url: 'https://www.douban.com/', icon: 'simple:douban' },
    'YouTube':      { url: 'https://www.youtube.com/', icon: 'simple:youtube' },
    'Steam':        { url: 'https://steamcommunity.com/', icon: 'simple:steam' },
    'Telegram':     { url: 'https://t.me/', icon: 'simple:telegram' },
    'Discord':      { url: 'https://discord.gg/', icon: 'simple:discord' },
    'Instagram':    { url: 'https://instagram.com/', icon: 'simple:instagram' },
    'Reddit':       { url: 'https://reddit.com/', icon: 'simple:reddit' },
    'LinkedIn':     { url: 'https://linkedin.com/in/', icon: 'simple:linkedin' },
    'Facebook':     { url: 'https://facebook.com/', icon: 'simple:facebook' },
    'Twitch':       { url: 'https://twitch.tv/', icon: 'simple:twitch' },
    'Spotify':      { url: 'https://open.spotify.com/', icon: 'simple:spotify' },
    'TikTok':       { url: 'https://tiktok.com/', icon: 'simple:tiktok' },
    'Pixiv':        { url: 'https://www.pixiv.net/', icon: 'simple:pixiv' },
    'NGA':          { url: 'https://bbs.nga.cn/', icon: 'simple:nga' },
    'V2EX':         { url: 'https://www.v2ex.com/', icon: 'simple:v2ex' },
    'Medium':       { url: 'https://medium.com/', icon: 'simple:medium' },
    'Patreon':      { url: 'https://www.patreon.com/', icon: 'simple:patreon' },
    'Ko-fi':        { url: 'https://ko-fi.com/', icon: 'simple:kofi' },
    'RSS':          { url: '', icon: 'simple:rss' },
    'Email':        { url: 'mailto:', icon: 'lucide:mail' },
    '个人网站':     { url: '', icon: 'lucide:globe' },
    'CodePen':      { url: 'https://codepen.io/', icon: 'simple:codepen' },
    'Stack Overflow': { url: 'https://stackoverflow.com/', icon: 'simple:stackoverflow' },
    'Mastodon':     { url: 'https://mastodon.social/', icon: 'simple:mastodon' },
    'Bluesky':      { url: 'https://bsky.app/', icon: 'simple:bluesky' },
    'SoundCloud':   { url: 'https://soundcloud.com/', icon: 'simple:soundcloud' },
    'Apple Music':  { url: 'https://music.apple.com/', icon: 'simple:applemusic' },
    'Netflix':      { url: 'https://www.netflix.com/', icon: 'simple:netflix' },
    'Notion':       { url: 'https://www.notion.so/', icon: 'simple:notion' },
    'Figma':        { url: 'https://www.figma.com/', icon: 'simple:figma' },
    'Dribbble':     { url: 'https://dribbble.com/', icon: 'simple:dribbble' },
    'Behance':      { url: 'https://www.behance.net/', icon: 'simple:behance' },
    'Dev.to':       { url: 'https://dev.to/', icon: 'simple:devdotto' },
    'Product Hunt': { url: 'https://www.producthunt.com/', icon: 'simple:producthunt' },
    'Kaggle':       { url: 'https://www.kaggle.com/', icon: 'simple:kaggle' },
};

const SocialManager = {
    data: [],
    editingIdx: -1,
    _iconHtml(iconKey) {
        if (!iconKey) return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
        if (iconKey.startsWith('simple:')) {
            return '<img src="https://cdn.simpleicons.org/' + iconKey.replace('simple:', '') + '/888" width="20" height="20" onerror="this.style.display=\'none\'">';
        }
        return '<i data-lucide="' + iconKey.replace('lucide:', '') + '" style="width:20px;height:20px"></i>';
    },
    _populateDropdown() {
        const sel = document.getElementById('social-preset-select');
        if (!sel || sel.options.length > 1) return; // 已填充
        Object.keys(SOCIAL_PRESETS).forEach(k => {
            const o = document.createElement('option');
            o.value = k; o.textContent = k;
            sel.appendChild(o);
        });
    },
    async fetch() {
        this._populateDropdown();
        const list = document.getElementById('social-list');
        if (!list) return;
        try {
            const res = await safeFetch(API_BASE + '/social');
            if (Array.isArray(res)) { this.data = res; this.render(); }
            else { list.innerHTML = '<div style="text-align:center;padding:32px;color:#ef4444">加载失败</div>'; }
        } catch (e) { list.innerHTML = '<div style="text-align:center;padding:32px;color:#ef4444">加载失败</div>'; }
    },
    render() {
        const list = document.getElementById('social-list');
        if (!list) return;
        const items = this.data.filter(Boolean);
        if (!items.length) {
            list.innerHTML = '<div style="text-align:center;padding:48px;color:#94a3b8">暂无链接</div>';
        } else {
            list.innerHTML = items.map((s, i) =>
                '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;margin-bottom:8px">' +
                '<span style="flex-shrink:0">' + this._iconHtml(s.icon) + '</span>' +
                '<span style="font-weight:500;flex:1;color:inherit;font-size:.85rem">' + (s.name||'') + '</span>' +
                '<span style="font-size:.7rem;color:#64748b;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace">' + (s.url||'') + '</span>' +
                '<button onclick="SocialManager.startEdit('+i+')" style="background:none;border:none;cursor:pointer;padding:4px 8px;color:#94a3b8;font-size:.75rem">编辑</button>' +
                '<button onclick="SocialManager.remove('+i+')" style="background:none;border:none;cursor:pointer;padding:4px 8px;color:#ef4444;font-size:.75rem">删除</button>' +
                '</div>'
            ).join('');
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async save() {
        try {
            const res = await safeFetch(API_BASE + '/social', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.data)
            });
            if (res && res.success) { showToast('已保存', 'success'); this.render(); }
        } catch (e) { showToast('保存失败', 'error'); }
    },
    selectPreset() {
        if (this.editingIdx >= 0) return;
        const sel = document.getElementById('social-preset-select');
        const key = sel.value;
        if (!key || !SOCIAL_PRESETS[key]) return;
        const p = SOCIAL_PRESETS[key];
        document.getElementById('social-form-name').value = key;
        document.getElementById('social-form-url').value = p.url;
        document.getElementById('social-form-icon').value = p.icon;
    },
    startEdit(i) {
        this.editingIdx = i;
        const s = i >= 0 ? this.data[i] : { name: '', url: '', icon: 'lucide:link' };
        document.getElementById('social-form-name').value = s.name || '';
        document.getElementById('social-form-url').value = s.url || '';
        document.getElementById('social-form-icon').value = s.icon || 'lucide:link';
        document.getElementById('social-preset-select').value = '';
        document.getElementById('social-form-btn').textContent = i >= 0 ? '保存修改' : '添加';
        document.getElementById('social-form-cancel').style.display = i >= 0 ? '' : 'none';
    },
    showIconPicker() {
        // 移除旧弹窗
        const old = document.getElementById('icon-picker-modal');
        if (old) old.remove();

        const icons = [
            'github','gitlab','bitbucket','stackoverflow','devdotto','codepen','codesandbox',
            'x','twitter','facebook','instagram','threads','bluesky','mastodon',
            'youtube','twitch','tiktok','bilibili','douyin','xiaohongshu',
            'weibo','zhihu','douban','v2ex','nga','tieba',
            'discord','telegram','signal','slack','teams','zoom',
            'steam','epicgames','playstation','xbox','nintendo','pixiv',
            'spotify','applemusic','soundcloud','netflix','appletv',
            'linkedin','reddit','medium','substack','patreon','kofi',
            'notion','figma','dribbble','behance','producthunt',
            'rss','gmail','protonmail','mailboxdotorg',
            'amazon','alibaba','taobao','jd','mi','huawei',
            'paypal','wechat','alipay','line','kakaotalk',
            'visualstudiocode','vim','neovim','android','apple','linux','windows',
            'npm','pnpm','yarn','bun','deno','nodejs','python','rust','go','swift','kotlin',
            'docker','kubernetes','terraform','nginx','cloudflare','vercel','netlify',
        ];
        let html = '<div id="icon-picker-modal" style="position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8)">';
        html += '<div style="background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:20px;max-width:620px;max-height:75vh;overflow-y:auto;width:92%">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><h3 style="margin:0;color:#e2e8f0;font-size:.95rem">选择图标 <span style="font-size:.7rem;color:#64748b;font-weight:400">85+ 品牌</span></h3><button onclick="document.getElementById(\'icon-picker-modal\').remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.4rem;line-height:1">&times;</button></div>';
        html += '<input id="icon-search" placeholder="搜索..." style="width:100%;padding:8px 12px;margin-bottom:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e2e8f0;font-size:.8rem;outline:none;box-sizing:border-box" oninput="SocialManager._filterIcons()">';
        html += '<div id="icon-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:6px">';
        icons.forEach(slug => {
            html += '<div class="icon-opt" data-slug="' + slug + '" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border-radius:8px;cursor:pointer;border:1px solid transparent;font-size:.6rem;color:#94a3b8;transition:all .1s" onclick="SocialManager._pickIcon(\'' + slug + '\')">';
            html += '<img src="https://cdn.simpleicons.org/' + slug + '/888" width="22" height="22" style="pointer-events:none" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2222%22 height=%2222%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>\'">';
            html += '<span style="text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;pointer-events:none">' + slug + '</span>';
            html += '</div>';
        });
        html += '</div></div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
    },
    _filterIcons() {
        const q = (document.getElementById('icon-search')?.value || '').toLowerCase();
        document.querySelectorAll('.icon-opt').forEach(el => {
            el.style.display = !q || el.dataset.slug.includes(q) ? '' : 'none';
        });
    },
    _pickIcon(slug) {
        document.getElementById('social-form-icon').value = 'simple:' + slug;
        const modal = document.getElementById('icon-picker-modal');
        if (modal) modal.remove();
    },
    cancelEdit() { this.editingIdx = -1; this.startEdit(-1); },
    autoFill() {
        if (this.editingIdx >= 0) return;
        const name = document.getElementById('social-form-name').value.trim();
        const preset = SOCIAL_PRESETS[name];
        if (preset) {
            if (preset.url) document.getElementById('social-form-url').value = preset.url;
            document.getElementById('social-form-icon').value = preset.icon;
        }
    },
    submitForm() {
        const name = document.getElementById('social-form-name').value.trim();
        const url = document.getElementById('social-form-url').value.trim();
        const icon = document.getElementById('social-form-icon').value.trim() || 'link';
        if (!name || !url) { showToast('名称和链接不能为空', 'warning'); return; }
        if (this.editingIdx >= 0) {
            this.data[this.editingIdx] = { name, url, icon };
        } else {
            this.data.push({ name, url, icon });
        }
        this.editingIdx = -1;
        this.save();
        this.cancelEdit();
    },
    remove(i) {
        if (!confirm('删除 "' + (this.data[i]?.name||'') + '"？')) return;
        this.data.splice(i, 1);
        this.save();
    }
};

// ═══════ 打招呼管理器 ═══════
const GreetingsManager = {
    async fetch() {
        const list = document.getElementById('greetings-list');
        if (!list) return;
        list.innerHTML = '<div style="text-align:center;padding:32px;color:#94a3b8">加载中...</div>';
        try {
            const res = await safeFetch(API_BASE + '/wave');
            if (Array.isArray(res)) {
                if (res.length === 0) {
                    list.innerHTML = '<div style="text-align:center;padding:48px;color:#94a3b8">暂无打招呼记录<br><span style="font-size:.75rem">访客在关于页点击打招呼后出现</span></div>';
                } else {
                    list.innerHTML = res.reverse().map((g, i) => {
                        const t = new Date(g.time);
                        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;margin-bottom:6px;font-size:.8rem">' +
                            '<span style="font-size:1.2rem">&#x1F44B;</span>' +
                            '<span style="color:#14B8A6;font-weight:500">#' + (res.length - i) + '</span>' +
                            '<span style="color:#94a3b8;flex:1">' + t.toLocaleString('zh-CN') + '</span>' +
                            '<span style="font-size:.65rem;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (g.ua||'') + '">' + (g.ua||'').substring(0,50) + '</span>' +
                            '</div>';
                    }).join('');
                }
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        } catch (e) { list.innerHTML = '<div style="text-align:center;padding:32px;color:#ef4444">加载失败</div>'; }
    }
};

// ═══════ 博客文章管理器 ═══════
const PostsManager = {
    data: [],
    async fetch() {
        const list = document.getElementById('posts-list');
        if (!list) return;
        list.innerHTML = '<div style="text-align:center;padding:32px;color:#94a3b8">加载中...</div>';
        try {
            const res = await safeFetch(API_BASE + '/posts');
            if (Array.isArray(res)) { this.data = res; this.render(); }
            else { list.innerHTML = '<div style="text-align:center;padding:32px;color:#ef4444">加载失败</div>'; }
        } catch (e) { list.innerHTML = '<div style="text-align:center;padding:32px;color:#ef4444">加载失败</div>'; }
    },
    render() {
        const list = document.getElementById('posts-list');
        const countEl = document.getElementById('posts-count');
        if (!list) return;
        if (countEl) countEl.textContent = this.data.length + ' 篇文章';
        if (!this.data.length) { list.innerHTML = '<div style="text-align:center;padding:48px;color:#94a3b8">暂无文章</div>'; return; }
        list.innerHTML = this.data.map(p => {
            const tags = (p.tags||[]).slice(0,5).map(t => '<span style="display:inline-block;padding:1px 7px;border-radius:4px;font-size:.65rem;background:rgba(45,212,191,.1);color:#2DD4BF">'+t+'</span>').join('');
            return '<div style="display:flex;align-items:flex-start;gap:14px;padding:14px 16px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;margin-bottom:8px">' +
                '<div style="flex:1;min-width:0">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-weight:600;font-size:.9rem;color:inherit">'+ (p.title||'无标题') +'</span><span style="font-size:.7rem;color:#64748b">'+ (p.date||'') +'</span></div>' +
                '<div style="font-size:.75rem;color:#94a3b8;margin-bottom:4px"><span>'+ (p.category||'未分类') +'</span> <span style="margin:0 6px;opacity:.3">|</span> <span style="font-family:monospace;font-size:.7rem">'+ (p._file||'') +'</span> <span style="margin:0 6px;opacity:.3">|</span> '+ (p.readTime||5) +' min</div>' +
                (p.excerpt ? '<p style="font-size:.75rem;color:#64748b;line-height:1.5;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'+p.excerpt+'</p>' : '') +
                (tags ? '<div style="display:flex;gap:4px;flex-wrap:wrap">'+tags+'</div>' : '') +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">' +
                '<button onclick="PostsManager.confirmDelete(\''+(p._file||'').replace(/'/g,"\\'")+'\',\''+(p.title||'').replace(/'/g,"\\'")+'\')" style="background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:#ef4444" title="删除"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button>' +
                '</div></div>';
        }).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async confirmDelete(file, title) {
        if (!confirm('确定删除文章 "'+title+'"？\n\n服务器上的 '+file+' 将被删除。')) return;
        try {
            const res = await safeFetch(API_BASE + '/posts?file=' + encodeURIComponent(file), { method: 'DELETE' });
            if (res && res.success) { showToast('已删除', 'success'); this.fetch(); }
            else { showToast(res?.error || '删除失败', 'error'); }
        } catch (e) { showToast('删除失败: ' + e.message, 'error'); }
    }
};

// ═══════ 随手拍管理器 ═══════
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
            container.innerHTML = '<div class="col-span-full text-center text-slate-500 py-12" style="color:#64748b">暂无随手拍 — 上传第一张照片吧 📸</div>';
            return;
        }
        this.data.slice(0, 12).forEach(item => {
            const el = document.createElement('div');
            el.className = 'snap-preview-card group';
            const exifHtml = item.exif ? `
                <div class="snap-preview-exif">
                    <i data-lucide="camera" style="width:12px;height:12px"></i>
                    <span>${[item.exif.camera, item.exif.iso ? 'ISO' + item.exif.iso : '', item.exif.aperture ? 'f/' + item.exif.aperture : ''].filter(Boolean).join(' · ') || '相机参数'}</span>
                </div>
            ` : '';
            el.innerHTML = `
                ${item.image ? `<img src="${item.image}" class="snap-preview-img" loading="lazy" onerror="this.style.display='none'">` : ''}
                <p class="snap-preview-content">${item.content || '(无内容)'}</p>
                ${exifHtml}
                <div class="snap-preview-meta">
                    <span>${new Date(item.date).toLocaleDateString()}</span>
                    <span>${item.location || ''}</span>
                </div>
                <button onclick="SnapshotsManager.delete('${item.id || item.date}')" class="snap-preview-del">
                    <i data-lucide="trash-2" style="width:12px;height:12px"></i>
                </button>
            `;
            container.appendChild(el);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async add({ content, imageUrl, location, tags, exif }) {
        try {
            if (!imageUrl) throw new Error('请提供图片（链接或上传文件）');
            // 提取 Markdown 图片语法
            const mdMatch = imageUrl.match(/!\[.*?\]\((.*?)\)/);
            if (mdMatch) imageUrl = mdMatch[1].trim();

            let data;
            if (USE_MOCK) {
                const snap = {
                    id: 'snap-' + Date.now(),
                    date: new Date().toISOString(),
                    content: content || '',
                    image: imageUrl,
                    location: location || '',
                    tags: typeof tags === 'string' ? tags.split(/[,，]/).map(t => t.trim()).filter(Boolean) : (Array.isArray(tags) ? tags : []),
                    exif: exif || undefined,
                    fromAdmin: true
                };
                snapshots.unshift(snap);
                localStorage.setItem('mock_snapshots', JSON.stringify(snapshots));
                data = { success: true };
            } else {
                const body = { content, location, tags };
                if (imageUrl) body.imageUrl = imageUrl;
                if (exif && Object.values(exif).some(v => v)) body.exif = exif;
                data = await safeFetch(`${API_BASE}/snapshots`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
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
    currentFilter: 'all',

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

    getItems() {
        const items = this.data[this.currentType] || [];
        return this.currentFilter === 'all' ? items : items.filter(i => i.status === this.currentFilter);
    },

    getCount() {
        return (this.data[this.currentType] || []).length;
    },

    filter(status) {
        this.currentFilter = status;
        this.updateFilterUI();
        this.render();
    },

    updateFilterUI() {
        const container = document.getElementById('media-filters');
        if (!container) return;
        const isAnime = this.currentType === 'anime';
        const filters = [
            { key: 'all', label: '全部' },
            { key: 'watching', label: isAnime ? '在看' : '在读' },
            { key: 'completed', label: isAnime ? '看过' : '读过' },
            { key: 'plan', label: isAnime ? '想看' : '想读' },
            { key: 'on_hold', label: '搁置' },
            { key: 'dropped', label: '抛弃' }
        ];
        container.innerHTML = filters.map(f => {
            const active = this.currentFilter === f.key;
            return `<button onclick="MediaManager.filter('${f.key}')" class="text-xs px-3 py-1 rounded-full font-medium transition-all"
                style="${active ? 'background:#14B8A6;color:#fff' : 'background:rgba(255,255,255,.04);color:#94a3b8;border:1px solid rgba(255,255,255,.06)'}">${f.label}</button>`;
        }).join('');
    },

    render() {
        const list = document.getElementById('media-list');
        const countEl = document.getElementById('media-count');
        list.innerHTML = '';
        const items = this.getItems();
        if (countEl) countEl.textContent = `共 ${this.getCount()} 部`;

        if (items.length === 0) {
            list.innerHTML = `<div class="col-span-full text-center py-12" style="color:#64748b">${this.currentFilter === 'all' ? '暂无内容 — 搜索 Bangumi 添加吧 📺' : '该状态下暂无条目'}</div>`;
            return;
        }
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'admin-media-card group';

            const progress = item.total ? Math.round((item.progress / item.total) * 100) : 0;
            const isComplete = progress >= 100 && item.total > 0;

            // 状态颜色
            const statusColors = {
                'watching': { bg: 'rgba(59,130,246,.15)', text: '#60a5fa' },
                'reading': { bg: 'rgba(59,130,246,.15)', text: '#60a5fa' },
                'completed': { bg: 'rgba(34,197,94,.15)', text: '#4ade80' },
                'plan': { bg: 'rgba(168,85,247,.15)', text: '#c084fc' },
                'on_hold': { bg: 'rgba(251,191,36,.15)', text: '#fbbf24' },
                'dropped': { bg: 'rgba(239,68,68,.15)', text: '#f87171' }
            };
            const sc = statusColors[item.status] || { bg: 'rgba(255,255,255,.06)', text: '#94a3b8' };
            const progressColor = isComplete ? '#22c55e' : '#3b82f6';

            el.innerHTML = `
                <div style="display:flex;gap:12px">
                    <div style="width:56px;height:80px;flex-shrink:0;background:rgba(255,255,255,.04);border-radius:8px;overflow:hidden;position:relative">
                        ${item.cover ? `<img src="${item.cover}" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(148,163,184,.3)"><i data-lucide="image" style="width:20px;height:20px"></i></div>`}
                        <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(0,0,0,.3)">
                            <div style="height:100%;background:${progressColor};width:${Math.min(progress, 100)}%"></div>
                        </div>
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                            <h3 class="media-title" style="padding-right:4px" title="${item.title}">${item.title}</h3>
                            <button onclick="MediaManager.delete('${item.id}')" style="background:none;border:none;cursor:pointer;color:#64748b;padding:2px;border-radius:4px;opacity:0;transition:opacity .2s" class="group-hover:opacity-100">
                                <i data-lucide="trash-2" style="width:14px;height:14px"></i>
                            </button>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                            <span style="font-size:.7rem;padding:2px 8px;border-radius:999px;background:${sc.bg};color:${sc.text};font-weight:500">${this.getStatusText(item.status)}</span>
                            ${item.tag ? `<span style="font-size:.7rem;color:#64748b;border:1px solid rgba(255,255,255,.08);padding:1px 6px;border-radius:4px">${item.tag}</span>` : ''}
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;font-size:.75rem;color:#64748b">
                            <span>进度</span>
                            <span style="font-family:monospace;font-weight:500;color:#94a3b8">${item.progress}<span style="color:#64748b"> / ${item.total || '?'}</span></span>
                        </div>
                        <div style="width:100%;height:3px;background:rgba(255,255,255,.06);border-radius:2px;margin-top:4px;overflow:hidden">
                            <div style="height:100%;background:${progressColor};width:${Math.min(progress, 100)}%;border-radius:2px"></div>
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
        this.currentFilter = 'all';

        // 更新 tabs
        document.querySelectorAll('.media-tab-btn').forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
            btn.style.fontWeight = '400';
        });
        const activeBtn = document.getElementById(`tab-${type}`);
        if (activeBtn) {
            activeBtn.style.background = '#14B8A6';
            activeBtn.style.color = '#fff';
            activeBtn.style.fontWeight = '600';
        }

        // 更新添加表单的 status select 选项
        const statusSel = document.getElementById('media-status');
        if (statusSel) {
            const isAnime = type === 'anime';
            statusSel.innerHTML = `
                <option value="">选择状态</option>
                <option value="watching">${isAnime ? '在看' : '在读'}</option>
                <option value="completed">${isAnime ? '看过' : '读过'}</option>
                <option value="plan">${isAnime ? '想看' : '想读'}</option>
                <option value="on_hold">搁置</option>
                <option value="dropped">抛弃</option>
            `;
        }
        const progressInput = document.getElementById('media-progress');
        if (progressInput) progressInput.placeholder = type === 'anime' ? '集数' : '话/卷数';

        // 清除搜索
        BgmSearch.selected = null;
        BgmSearch.results = [];
        document.getElementById('bgm-search-results').innerHTML = '';
        document.getElementById('bgm-selected').style.display = 'none';
        document.getElementById('media-add-form').style.display = 'none';

        this.updateFilterUI();
        this.render();
    },

    async add(item) {
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
            showToast('添加成功！', 'success');
            media = this.data;
            this.render();
            this.updateFilterUI();
            return true;
        } catch (e) {
            showToast('保存失败: ' + e.message);
            this.data[this.currentType].shift();
            this.render();
            return false;
        }
    },

    async delete(id) {
        const item = this.data[this.currentType].find(i => i.id == id);
        const title = item ? (item.title || '').slice(0, 20) : '';
        ConfirmationDialog.show(`确定要删除${title ? `「${title}」` : '这个条目'}吗？`, async () => {
            const originalList = [...(this.data[this.currentType] || [])];
            this.data[this.currentType] = this.data[this.currentType].filter(i => i.id != id);
            this.render();
            try {
                await safeFetch(`${API_BASE}/media`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.data)
                });
                showToast('已删除', 'success');
                media = this.data;
                this.updateFilterUI();
            } catch (e) {
                showToast('删除失败: ' + e.message);
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
        if (!keyword.trim()) { showToast('请输入搜索关键词', 'warning'); return; }
        const type = MediaManager.currentType === 'anime' ? '2' : '1';
        try {
            const data = await safeFetch(`${API_BASE}/bgm_search?q=${encodeURIComponent(keyword)}&type=${type}`);
            this.results = (data && data.data) ? data.data : (Array.isArray(data) ? data : []);
            this.render();
        } catch (e) {
            showToast('搜索失败: ' + e.message, 'error');
        }
    },

    render() {
        const c = document.getElementById('bgm-search-results');
        if (!c) return;
        if (this.results.length === 0) {
            c.innerHTML = '<div class="col-span-full text-xs py-4 text-center" style="color:#64748b">无搜索结果</div>';
            return;
        }
        c.innerHTML = this.results.map(item => {
            const title = item.name_cn || item.name || '';
            const img = item.images?.large || item.images?.common || '';
            const total = item.eps || item.vols || '';
            const isSelected = this.selected && String(this.selected.id) === String(item.id);
            return `
                <div class="admin-bgm-result${isSelected ? ' selected' : ''}"
                    onclick="BgmSearch.select('${item.id}')">
                    <img src="${img}" style="width:40px;height:56px;object-fit:cover;border-radius:6px;background:rgba(255,255,255,.04);flex-shrink:0" onerror="this.style.display='none'">
                    <div style="flex:1;min-width:0">
                        <div style="font-size:.8rem;font-weight:500;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${title}</div>
                        <div style="font-size:.7rem;color:#64748b">${total ? `共 ${total} 集` : ''}</div>
                    </div>
                    <span style="font-size:.7rem;padding:3px 10px;border-radius:999px;background:${isSelected ? '#14B8A6' : 'rgba(255,255,255,.08)'};color:${isSelected ? '#fff' : '#94a3b8'};flex-shrink:0">
                        ${isSelected ? '已选' : '选择'}
                    </span>
                </div>`;
        }).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    select(id) {
        const item = this.results.find(i => String(i.id) === String(id));
        if (!item) return;
        this.selected = item;
        this.render();
        // 显示已选信息 + 展开添加表单
        const sel = document.getElementById('bgm-selected');
        const form = document.getElementById('media-add-form');
        if (sel) {
            sel.style.display = 'block';
            sel.innerHTML = `已选择: <span style="color:#14B8A6;font-weight:500">${item.name_cn || item.name || ''}</span> (#${item.id})`;
        }
        if (form) form.style.display = 'block';
        // 预填进度
        const progressInput = document.getElementById('media-progress');
        if (progressInput) progressInput.focus();
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
            list.innerHTML = '<div class="col-span-full text-center py-12" style="color:#64748b">暂无订阅源 — 添加第一个 RSS 吧 📡</div>';
            return;
        }
        this.data.forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = 'admin-feed-card group';
            const catHtml = item.category ? `<span class="feed-cat">${item.category}</span>` : '';
            el.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0">
                        <div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0;background:rgba(15,23,42,.3)">
                            <img src="${item.icon || ''}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'" alt="">
                        </div>
                        <div style="min-width:0">
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                                <h3 class="feed-title">${item.title}</h3>
                                ${catHtml}
                            </div>
                            <div class="feed-url">${item.url}</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
                        <a href="${item.url}" target="_blank" style="padding:6px;color:#64748b;border-radius:6px;text-decoration:none" onmouseover="this.style.background='rgba(59,130,246,.15)';this.style.color='#60a5fa'" onmouseout="this.style.background='';this.style.color=''"><i data-lucide="external-link" style="width:14px;height:14px"></i></a>
                        <button onclick="FeedsManager.editByIndex(${idx})" style="padding:6px;color:#64748b;background:none;border:none;border-radius:6px;cursor:pointer" onmouseover="this.style.background='rgba(20,184,166,.15)';this.style.color='#14B8A6'" onmouseout="this.style.background='';this.style.color=''"><i data-lucide="edit-2" style="width:14px;height:14px"></i></button>
                        <button onclick="FeedsManager.deleteByIndex(${idx})" style="padding:6px;color:#64748b;background:none;border:none;border-radius:6px;cursor:pointer" onmouseover="this.style.background='rgba(239,68,68,.15)';this.style.color='#f87171'" onmouseout="this.style.background='';this.style.color=''"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    /** 用索引编辑（解决 item.id 可能缺失的问题） */
    editByIndex(idx) {
        const item = this.data[idx];
        if (!item) return;
        this.editingId = item.id || ('idx-' + idx);
        const titleInput = document.getElementById('feed-title');
        const urlInput = document.getElementById('feed-url');
        const iconInput = document.getElementById('feed-icon');
        const catInput = document.getElementById('feed-category');
        if (titleInput) titleInput.value = item.title || '';
        if (urlInput) urlInput.value = item.url || '';
        if (iconInput) iconInput.value = item.icon || '';
        if (catInput) catInput.value = item.category || '';
        // 存储当前编辑的索引
        this._editingIdx = idx;
        document.getElementById('feed-edit-bar').style.display = 'flex';
        const btn = document.getElementById('feed-submit-btn');
        if (btn) btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> 保存修改';
        document.getElementById('feed-test-result').style.display = 'none';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    cancelEdit() {
        this.editingId = null;
        this._editingIdx = null;
        const form = document.getElementById('add-feed-form');
        if (form) form.reset();
        document.getElementById('feed-edit-bar').style.display = 'none';
        document.getElementById('feed-test-result').style.display = 'none';
        const btn = document.getElementById('feed-submit-btn');
        if (btn) btn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> 添加订阅';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    deleteByIndex(idx) {
        const item = this.data[idx];
        const title = item ? (item.title || '').slice(0, 20) : '此订阅源';
        ConfirmationDialog.show(`确定要删除「${title}」吗？`, async () => {
            const original = [...this.data];
            this.data.splice(idx, 1);
            this.render();
            try {
                await safeFetch(`${API_BASE}/feeds`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.data)
                });
                showToast('已删除', 'success');
                feeds = this.data;
            } catch (e) {
                showToast('删除失败: ' + e.message);
                this.data = original;
                this.render();
            }
        });
    },

    async save(title, url, icon, category) {
        const item = { title, url, icon, category };
        // 编辑模式
        if (this._editingIdx != null) {
            const original = [...this.data];
            this.data[this._editingIdx] = item;
            try {
                await safeFetch(`${API_BASE}/feeds`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.data)
                });
                showToast('订阅已更新', 'success');
                feeds = this.data;
                this.cancelEdit();
                this.render();
                return true;
            } catch (e) {
                showToast('保存失败: ' + e.message);
                this.data = original;
                this.render();
                return false;
            }
        }
        // 添加模式
        this.data.push(item);
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
            showToast('保存失败: ' + e.message);
            this.data.pop();
            return false;
        }
    },

    /** RSS 检测：调服务端验证订阅源是否可用 */
    async testFeed() {
        const url = document.getElementById('feed-url').value.trim();
        if (!url) { showToast('请先输入 RSS 链接', 'warning'); return; }
        const resultEl = document.getElementById('feed-test-result');
        const btn = document.getElementById('feed-test-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> 检测中...'; }
        if (typeof lucide !== 'undefined') lucide.createIcons();
        try {
            const data = await safeFetch(`${API_BASE}/test_feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (data.success) {
                resultEl.style.display = 'block';
                resultEl.style.background = 'rgba(34,197,94,.08)';
                resultEl.style.color = '#4ade80';
                resultEl.style.borderColor = 'rgba(34,197,94,.15)';
                resultEl.innerHTML = `✅ RSS 有效 — 标题: <strong>${data.title || '未知'}</strong>，共 ${data.articleCount || 0} 篇文章`;
                // 自动填充
                if (data.title && !document.getElementById('feed-title').value) {
                    document.getElementById('feed-title').value = data.title;
                }
                if (data.iconUrl && !document.getElementById('feed-icon').value) {
                    document.getElementById('feed-icon').value = data.iconUrl;
                }
            } else {
                resultEl.style.display = 'block';
                resultEl.style.background = 'rgba(239,68,68,.08)';
                resultEl.style.color = '#f87171';
                resultEl.style.borderColor = 'rgba(239,68,68,.15)';
                resultEl.innerHTML = `❌ ${data.error || '无法解析此 RSS 源'}`;
            }
        } catch (e) {
            resultEl.style.display = 'block';
            resultEl.style.background = 'rgba(239,68,68,.08)';
            resultEl.style.color = '#f87171';
            resultEl.style.borderColor = 'rgba(239,68,68,.15)';
            resultEl.innerHTML = `❌ 检测失败: ${e.message}`;
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="search-check" class="w-3.5 h-3.5"></i> 检测'; }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    autoFillIcon() {
        const url = document.getElementById('feed-url').value.trim();
        if (!url) { showToast('请先输入 RSS 链接', 'warning'); return; }
        try {
            const domain = new URL(url).hostname;
            // 优先用 Google favicons
            document.getElementById('feed-icon').value = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            showToast('图标已自动填充');
        } catch (e) { showToast('无效的链接', 'error'); }
    }
};

const VideosManager = {
    currentList: 'edits',  // 'edits' | 'favorites'
    currentList: 'edits',
    _editingId: null,
    fullData: { videos: [], favorites: [] },
    get data() {
        return this.currentList === 'edits' ? this.fullData.videos : this.fullData.favorites;
    },
    set data(val) {
        if (this.currentList === 'edits') this.fullData.videos = val;
        else this.fullData.favorites = val;
    },
    switchList(type) {
        this.currentList = type;
        document.querySelectorAll('.video-tab-btn').forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
            btn.style.fontWeight = '400';
        });
        const activeBtn = document.getElementById(`tab-video-${type}`);
        if (activeBtn) {
            activeBtn.style.background = '#14B8A6';
            activeBtn.style.color = '#fff';
            activeBtn.style.fontWeight = '600';
        }
        const submitLabel = document.getElementById('video-submit-label');
        if (submitLabel) submitLabel.textContent = type === 'edits' ? '添加剪辑' : '添加收藏';
        this.render();
        this.updateCount();
    },
    updateCount() {
        const el = document.getElementById('video-count');
        if (el) el.textContent = `共 ${this.data.length} 个`;
    },
    async fetch() {
        try {
            const response = await safeFetch(`${API_BASE}/videos`);
            this.fullData = response || { videos: [], favorites: [] };
            if (!this.fullData.videos) this.fullData.videos = [];
            if (!this.fullData.favorites) this.fullData.favorites = [];
            videos = this.fullData;
            this.render();
            this.updateCount();
        } catch (e) {
            console.error(e);
            showToast('获取视频失败');
        }
    },
    render() {
        const list = document.getElementById('videos-list');
        list.innerHTML = '';
        if (this.data.length === 0) {
            const hint = this.currentList === 'edits' ? '暂无剪辑 — 粘贴 BV 号添加吧 🎬' : '暂无收藏 — 粘贴 BV 号添加吧 ⭐';
            list.innerHTML = `<div class="col-span-full text-center py-12" style="color:#64748b">${hint}</div>`;
            return;
        }
        this.data.forEach(item => {
            const el = document.createElement('div');
            el.className = 'admin-feed-card group';
            el.innerHTML = `
                <div style="display:flex;gap:12px">
                    <div style="width:96px;height:54px;flex-shrink:0;border-radius:6px;overflow:hidden;background:rgba(15,23,42,.3);position:relative">
                        <img src="${item.thumbnail || ''}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'" alt="">
                        ${item.duration ? `<span style="position:absolute;bottom:3px;right:3px;background:rgba(0,0,0,.7);color:#fff;font-size:.6rem;padding:1px 5px;border-radius:3px">${item.duration}</span>` : ''}
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px">
                            <h3 class="feed-title" style="line-height:1.3">${item.title}</h3>
                            <div style="display:flex;gap:2px;flex-shrink:0">
                                <button onclick="VideosManager.editById(${item.id})" style="padding:4px;color:#64748b;background:none;border:none;border-radius:4px;cursor:pointer" onmouseover="this.style.color='#14B8A6'" onmouseout="this.style.color='#64748b'"><i data-lucide="edit-2" style="width:14px;height:14px"></i></button>
                                <button onclick="VideosManager.delete(${item.id})" style="padding:4px;color:#64748b;background:none;border:none;border-radius:4px;cursor:pointer" onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='#64748b'"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;font-size:.7rem;color:#64748b;flex-wrap:wrap">
                            ${item.category ? `<span style="padding:1px 8px;border-radius:999px;background:rgba(251,146,60,.12);color:#fb923c">${item.category}</span>` : ''}
                            ${item.views ? `<span><i data-lucide="eye" style="width:10px;height:10px;display:inline;vertical-align:-1px"></i> ${item.views} 播放</span>` : ''}
                            ${item.bvid ? `<span style="opacity:.5">${item.bvid}</span>` : ''}
                        </div>
                        ${item.description ? `<div class="feed-url" style="margin-top:2px">${item.description}</div>` : ''}
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async save() {
        try {
            await safeFetch(`${API_BASE}/videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.fullData)
            });
            videos = this.fullData;
            this.updateCount();
        } catch (e) {
            showToast('保存失败: ' + e.message);
            throw e;
        }
    },
    async add(video) {
        const newVideo = { id: Date.now(), ...video };
        this.data.unshift(newVideo);
        try {
            await safeFetch(`${API_BASE}/videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.fullData)
            });
            showToast('添加成功', 'success');
            videos = this.fullData;
            this.updateCount();
            this.render();
            return true;
        } catch (e) {
            showToast('保存视频失败: ' + e.message);
            this.data.shift();
            return false;
        }
    },
    async delete(id) {
        const item = this.data.find(v => v.id === id);
        const title = item ? (item.title || '').slice(0, 20) : '';
        ConfirmationDialog.show(`确定要删除「${title}」吗？`, async () => {
            const key = this.currentList === 'edits' ? 'videos' : 'favorites';
            const original = [...this.fullData[key]];
            this.fullData[key] = this.fullData[key].filter(v => v.id !== id);
            this.render();
            try {
                await safeFetch(`${API_BASE}/videos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.fullData)
                });
                showToast('已删除', 'success');
                videos = this.fullData;
                this.updateCount();
            } catch (e) {
                this.fullData[key] = original;
                this.render();
            }
        });
    },
    editById(id) {
        const item = this.data.find(v => v.id === id);
        if (!item) return;
        this._editingId = id;
        document.getElementById('video-title').value = item.title || '';
        document.getElementById('video-bvid').value = item.bvid || '';
        document.getElementById('video-category').value = item.category || '';
        document.getElementById('video-duration').value = item.duration || '';
        document.getElementById('video-desc').value = item.description || '';
        if (item.thumbnail) document.getElementById('video-cover').value = item.thumbnail;
        const submitBtn = document.querySelector('#add-video-form button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> 保存修改';
        const cancelBtn = document.getElementById('video-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'inline';
        document.getElementById('add-video-form').scrollIntoView({ behavior: 'smooth' });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    cancelEdit() {
        this._editingId = null;
        const form = document.getElementById('add-video-form');
        if (form) form.reset();
        const submitBtn = document.querySelector('#add-video-form button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> <span id="video-submit-label">添加</span>';
        document.getElementById('video-submit-label').textContent = this.currentList === 'edits' ? '添加剪辑' : '添加收藏';
        const cancelBtn = document.getElementById('video-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    async fetchBilibiliCover(bvid) {
        if (!bvid) { showToast('请先输入 BV 号', 'warning'); return; }
        showToast('正在获取封面...');
        try {
            const proxyUrl = `${API_BASE}/rss-proxy?url=${encodeURIComponent(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)}`;
            const res = await safeFetch(proxyUrl);
            let data = res;
            if (typeof res === 'string') { try { data = JSON.parse(res); } catch (e) {} }
            if (data && data.code === 0 && data.data && data.data.pic) {
                document.getElementById('video-cover').value = data.data.pic;
                showToast('封面已获取', 'success');
            } else {
                showToast('获取封面失败', 'error');
            }
        } catch (e) {
            showToast('获取封面失败: ' + e.message, 'error');
        }
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
                document.getElementById('video-duration').value = info.duration ? formatDuration(info.duration) : '';
                if (info.pic && !document.getElementById('video-cover').value) {
                    document.getElementById('video-cover').value = info.pic;
                }
                const viewsEl = document.getElementById('video-views');
                if (viewsEl && info.stat && info.stat.view) {
                    viewsEl.value = info.stat.view;
                }
                showToast(`获取成功: ${(info.title||'').slice(0,20)}`, 'success');
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
    data: { raw: {}, pageData: {} },
    chart: null,
    async fetch() {
        try {
            const [visitsResult, pageResult] = await Promise.all([
                safeFetch(`${API_BASE}/stats`),
                safeFetch(`${API_BASE}/page_visits`).catch(() => ({}))
            ]);
            this.data.raw = visitsResult || {};
            this.data.pageData = pageResult || {};
            this.render();
        } catch (e) {
            console.error(e);
            showToast('获取统计数据失败');
        }
    },
    getTotals() {
        let total = 0;
        const today = new Date().toISOString().split('T')[0];
        let todayVisits = 0;
        Object.entries(this.data.raw).forEach(([date, d]) => {
            const v = d.visits || 0;
            total += v;
            if (date === today) todayVisits = v;
        });
        return { total, today: todayVisits };
    },
    render() {
        const { total, today } = this.getTotals();
        document.getElementById('stat-total-visits').textContent = total.toLocaleString();
        document.getElementById('stat-today-visits').textContent = today;
        // 热门页面
        const pages = this.data.pageData.pages || {};
        const top = Object.entries(pages).sort((a,b) => b[1] - a[1])[0];
        document.getElementById('stat-top-page').textContent = top ? `${top[0]} (${top[1]})` : '-';
        // 子组件
        this.renderChart();
        this.renderLocations();
        this.renderPageBreakdown();
        // 自动查询 IP 地址
        setTimeout(() => this.lookupIPs(), 500);
    },
    renderChart() {
        const ctx = document.getElementById('visitsChart');
        if (!ctx) return;
        const labels = [], values = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            labels.push(key.slice(5));
            values.push((this.data.raw[key] || {}).visits || 0);
        }
        if (this.chart) this.chart.destroy();
        if (typeof Chart !== 'undefined') {
            this.chart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        borderColor: '#14B8A6',
                        backgroundColor: 'rgba(20,184,166,.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#14B8A6',
                        pointRadius: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.04)' } },
                        y: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,.04)' } }
                    }
                }
            });
            window.myChart = this.chart;
        }
    },
    renderLocations() {
        const container = document.getElementById('visits-log-body');
        if (!container) return;
        // 用日志表格展示 IP 分布
        const ipMap = {};
        const isLocal = ip => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.');
        Object.values(this.data.raw).forEach(day => {
            if (day.ip_locations) {
                Object.entries(day.ip_locations).forEach(([ip, c]) => {
                    if (isLocal(ip)) return;
                    ipMap[ip] = (ipMap[ip] || 0) + c;
                });
            }
        });
        const sorted = Object.entries(ipMap).sort((a,b) => b[1] - a[1]).slice(0, 20);
        if (!sorted.length) {
            container.innerHTML = '<tr><td colspan="4" style="padding:32px;text-align:center;color:#64748b">暂无访问数据</td></tr>';
            return;
        }
        const max = sorted[0][1];
        // 从localStorage读取已持久化的IP位置
        let knownLocs = {};
        try { knownLocs = JSON.parse(localStorage.getItem('ip_locs') || '{}'); } catch {}
        container.innerHTML = sorted.map(([ip, count]) => `
            <tr>
                <td style="padding:8px 16px;font-size:.8rem;color:#94a3b8">${ip}</td>
                <td class="ip-loc-cell" data-ip="${ip}" style="padding:8px 16px;font-size:.78rem;color:#14B8A6">${knownLocs[ip] || ''}</td>
                <td style="padding:8px 16px;font-size:.8rem;color:#e2e8f0;font-weight:500">${count}</td>
                <td style="padding:8px 16px">
                    <div style="height:4px;background:rgba(255,255,255,.06);border-radius:2px;min-width:60px">
                        <div style="height:100%;background:#14B8A6;border-radius:2px;width:${Math.round(count/max*100)}%"></div>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    renderPageBreakdown() {
        const pages = this.data.pageData.pages || {};
        const entries = Object.entries(pages).sort((a,b) => b[1] - a[1]).slice(0, 10);
        if (!entries.length) return;
        // 找到访问日志表格前面插入页面分布
        let el = document.getElementById('stat-page-breakdown');
        if (!el) {
            const tableCard = document.querySelector('#view-stats .admin-card.overflow-hidden');
            if (!tableCard) return;
            el = document.createElement('div');
            el.id = 'stat-page-breakdown';
            el.className = 'admin-card p-5';
            el.innerHTML = '<h3 style="font-size:1rem;font-weight:700;margin-bottom:12px;color:inherit">页面访问排行</h3><div id="stat-page-list"></div>';
            tableCard.parentNode.insertBefore(el, tableCard);
        }
        const list = document.getElementById('stat-page-list');
        if (!list) return;
        const max = entries[0][1];
        list.innerHTML = entries.map(([page, count]) => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:.78rem;color:#94a3b8;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${page}">${page}</span>
                <span style="font-size:.78rem;color:#e2e8f0;font-weight:500;min-width:30px">${count}</span>
                <div style="flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px">
                    <div style="height:100%;background:#14B8A6;border-radius:2px;width:${Math.round(count/max*100)}%"></div>
                </div>
            </div>
        `).join('');
    },
    async lookupIPs() {
        const cells = document.querySelectorAll('.ip-loc-cell');
        if (!cells.length) return;
        // 1. 先从服务器加载持久化的位置
        let locs = {};
        try {
            const stored = await safeFetch(API_BASE + '/ip-locations');
            if (stored && typeof stored === 'object') {
                locs = stored;
                localStorage.setItem('ip_locs', JSON.stringify(locs));
            }
        } catch {}
        // 2. 预填已知位置
        let needLookup = [];
        cells.forEach(c => {
            const ip = c.dataset.ip;
            if (locs[ip]) { c.textContent = locs[ip]; }
            else if (!c.textContent.trim()) { needLookup.push(c); }
        });
        if (!needLookup.length) return;
        // 3. 查询未知IP
        needLookup.forEach(c => { c.textContent = '...'; });
        try {
            const res = await safeFetch(API_BASE + '/ip-lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ips: needLookup.map(c => c.dataset.ip) })
            });
            if (res && res.success && res.data) {
                needLookup.forEach(c => {
                    const loc = res.data[c.dataset.ip];
                    c.textContent = loc && loc !== '查询失败' ? loc : '无数据';
                    if (loc && loc !== '查询失败') locs[c.dataset.ip] = loc;
                });
                localStorage.setItem('ip_locs', JSON.stringify(locs));
            }
        } catch (e) {
            needLookup.forEach(c => { if (c.textContent === '...') c.textContent = '无数据'; });
        }
    }
};

const Dashboard = {
    switchTab: function(tabId) {
        console.log('Switching to tab:', tabId);
        ['bookmarks', 'snapshots', 'media', 'feeds', 'videos', 'stats', 'settings', 'posts', 'greetings'].forEach(id => {
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
            bookmarks: '书签收藏', snapshots: '片刻动态', media: '追番追漫',
            feeds: 'RSS 订阅', videos: '视频推荐', stats: '访问统计', settings: '站点设置',
            posts: '博客文章', greetings: '打招呼记录'
        };
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = TAB_TITLES[tabId] || '概览';

        if (tabId === 'posts') PostsManager.fetch();
        if (tabId === 'bookmarks') { BookmarksManager.fetch(); BookmarksManager.populateCategories(); }
        if (tabId === 'snapshots') { SnapshotsManager.fetch(); ImageUploader.init(); }
        if (tabId === 'social') SocialManager.fetch();
        if (tabId === 'greetings') GreetingsManager.fetch();
        if (tabId === 'media') { MediaManager.fetch(); MediaManager.updateFilterUI(); }
        if (tabId === 'feeds') FeedsManager.fetch();
        if (tabId === 'videos') VideosManager.fetch();
        if (tabId === 'stats') StatsManager.fetch();
        if (tabId === 'settings') { fetchSettings(); }
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
        this.applyTheme(this.resolveTheme());
        if (window.matchMedia) {
            const media = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = () => {
                if (!this.getStoredTheme()) {
                    this.applyTheme(this.resolveTheme());
                }
            };
            if (media.addEventListener) {
                media.addEventListener('change', handler);
            } else if (media.addListener) {
                media.addListener(handler);
            }
        }
    },
    getStoredTheme() {
        try {
            const theme = localStorage.getItem('theme');
            if (theme === 'dark' || theme === 'light') return theme;
        } catch (e) {}
        return null;
    },
    resolveTheme() {
        const stored = this.getStoredTheme();
        if (stored) return stored;
        const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return systemDark ? 'dark' : 'light';
    },
    applyTheme(theme) {
        const isDark = theme === 'dark';
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
window.autoFillFeedIcon = () => FeedsManager.autoFillIcon();
window.deleteVideo = (id) => VideosManager.delete(id);
window.fetchBilibiliInfo = () => VideosManager.fetchBilibiliInfo(document.getElementById('video-bvid').value);
window.fetchBilibiliCover = () => VideosManager.fetchBilibiliCover(document.getElementById('video-bvid').value);

/** Bilibili 秒数 → mm:ss */
function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

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

    const content = document.getElementById('snap-content').value.trim();
    const location = document.getElementById('snap-location').value.trim();
    const tags = document.getElementById('snap-tags').value.trim();

    // EXIF 数据
    const exifFields = {
        camera: document.getElementById('exif-camera').value.trim(),
        lens: document.getElementById('exif-lens').value.trim(),
        iso: document.getElementById('exif-iso').value.trim(),
        aperture: document.getElementById('exif-aperture').value.trim(),
        shutter: document.getElementById('exif-shutter').value.trim()
    };
    const hasExif = Object.values(exifFields).some(v => v);
    const exif = hasExif ? exifFields : null;

    FormValidator.setLoadingState(btn, true);

    try {
        // 上传图片获取 URL
        const urls = await ImageUploader.uploadAll();
        if (urls.length === 0) {
            showToast('获取图片链接失败', 'error');
            return;
        }

        // 每个 URL 创建一个 moment
        let allSuccess = true;
        for (let i = 0; i < urls.length; i++) {
            const snapContent = i === 0 ? content : `[${i + 1}/${urls.length}] ${content}`;
            const success = await SnapshotsManager.add({
                content: snapContent,
                imageUrl: urls[i],
                location,
                tags,
                exif: i === 0 ? exif : null  // 只有第一张带 EXIF
            });
            if (!success) allSuccess = false;
        }

        if (allSuccess) {
            form.reset();
            ImageUploader.reset();
            FormValidator.clearErrors(form);
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        FormValidator.setLoadingState(btn, false);
    }
}

async function handleAddMedia(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const status = document.getElementById('media-status').value;
    const progress = document.getElementById('media-progress').value;
    if (!status) { showToast('请选择状态', 'warning'); return; }
    if (progress === '' || parseInt(progress) < 0) { showToast('请输入有效集数', 'warning'); return; }
    if (!BgmSearch.selected) { showToast('请先搜索并选择一个 Bangumi 条目', 'warning'); return; }
    FormValidator.setLoadingState(btn, true);
    const subj = BgmSearch.selected;
    const title = subj.name_cn || subj.name || '';
    const cover = (subj.images && (subj.images.large || subj.images.common)) || '';
    const total = subj.eps || subj.vols || 0;
    try {
        const success = await MediaManager.add({
            title, status, cover,
            progress: parseInt(progress) || 0,
            total: parseInt(total) || 0,
            tag: 'Bangumi',
            id: String(subj.id)
        });
        if (success) {
            form.reset();
            FormValidator.clearErrors(form);
            // 重置搜索
            BgmSearch.selected = null;
            BgmSearch.results = [];
            document.getElementById('bgm-search-results').innerHTML = '';
            document.getElementById('bgm-selected').style.display = 'none';
            document.getElementById('media-add-form').style.display = 'none';
        }
    } finally {
        FormValidator.setLoadingState(btn, false);
    }
}

async function handleAddFeed(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const title = document.getElementById('feed-title').value.trim();
    const url = document.getElementById('feed-url').value.trim();
    const icon = document.getElementById('feed-icon').value.trim();
    const category = document.getElementById('feed-category').value.trim();
    if (!title) { showToast('请输入标题', 'warning'); return; }
    if (!url) { showToast('请输入 RSS 链接', 'warning'); return; }
    FormValidator.setLoadingState(btn, true);
    try {
        const success = await FeedsManager.save(title, url, icon, category);
        if (success && !FeedsManager.editingId) {
            form.reset();
            FormValidator.clearErrors(form);
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
    const category = document.getElementById('video-category').value;
    const title = document.getElementById('video-title').value.trim();
    const coverEl = document.getElementById('video-cover');
    const cover = coverEl ? coverEl.value.trim() : '';
    const viewsEl = document.getElementById('video-views');
    const views = viewsEl ? parseInt(viewsEl.value) || 0 : 0;
    const duration = document.getElementById('video-duration').value.trim();
    const description = document.getElementById('video-desc').value.trim();
    try {
        if (VideosManager._editingId) {
            const item = VideosManager.data.find(v => v.id === VideosManager._editingId);
            if (item) {
                Object.assign(item, { title, thumbnail: cover, category, duration, description, bvid, views });
                await VideosManager.save();
                showToast('已更新', 'success');
                VideosManager.cancelEdit();
                VideosManager.render();
            }
        } else {
            const success = await VideosManager.add({ title, cover, duration, category, bvid, description });
            if (success) { form.reset(); FormValidator.clearErrors(form); }
        }
    } finally {
        FormValidator.setLoadingState(btn, false);
    }
}

async function fetchSettings() {
    try {
        const data = await safeFetch(`${API_BASE}/settings`);
        const bu = document.getElementById('setting-bangumi-username');
        const bt = document.getElementById('setting-bangumi-token');
        if (data.bangumi_username && bu) bu.value = data.bangumi_username;
        if (data.bangumi_token && bt) bt.value = data.bangumi_token;
    } catch (e) {
        console.error(e);
        showToast('加载设置失败');
    }
    // 服务状态
    const dn = document.getElementById('status-node');
    if (dn) dn.textContent = '运行中';
    // 数据文件统计
    try {
        const feeds = await safeFetch(`${API_BASE}/feeds`);
        const media = await safeFetch(`${API_BASE}/media`);
        const bm = await safeFetch(`${API_BASE}/bookmarks`);
        const sd = document.getElementById('status-data');
        if (sd) sd.textContent = `${Array.isArray(feeds)?feeds.length:0}订阅 · ${(media?.anime||[]).length+(media?.manga||[]).length}追番 · ${Array.isArray(bm)?bm.length:0}书签`;
    } catch (e) {}
    // PicList 状态
    if (typeof PicGoClient !== 'undefined') {
        PicGoClient.checkStatus().then(() => {
            const sp = document.getElementById('status-picgo');
            if (sp) {
                sp.textContent = PicGoClient.available ? (PicGoClient.version || '已连接') : '未连接';
                sp.style.color = PicGoClient.available ? '#4ade80' : '#94a3b8';
            }
        });
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
        const tokenEl = document.getElementById('setting-admin-token');
        const adminToken = tokenEl ? tokenEl.value.trim() : '';
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
                updateBackendStatusBadge('connected');
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
                updateBackendStatusBadge('node');
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
        updateBackendStatusBadge('mock');
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
    bindListener('add-media-form', handleAddMedia);
    bindListener('add-feed-form', handleAddFeed);
    bindListener('add-video-form', handleAddVideo);
    // 设置表单已重命名，保存按钮各功能独立
    const noticeSave = document.getElementById('notice-save');
    if (noticeSave) noticeSave.addEventListener('click', () => NoticeManager.save());

    // ── 自定义下拉框初始化 ──
    window.closeDropdown = function(container) {
        container.classList.remove('open');
        container.querySelector('.custom-select-dropdown').classList.add('hidden');
    };
    window.toggleDropdown = function(trigger) {
        const container = trigger.closest('.custom-select');
        if (!container) return;
        const isOpen = container.classList.contains('open');
        // Close all other dropdowns first
        document.querySelectorAll('.custom-select.open').forEach(c => {
            if (c !== container) closeDropdown(c);
        });
        if (isOpen) {
            closeDropdown(container);
        } else {
            container.classList.add('open');
            container.querySelector('.custom-select-dropdown').classList.remove('hidden');
        }
    };

    // Bind trigger clicks
    document.querySelectorAll('.custom-select-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown(trigger);
        });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select.open').forEach(c => closeDropdown(c));
        }
    });

    const saveTokenBtn = document.getElementById('admin-token-save');
    if (saveTokenBtn) saveTokenBtn.addEventListener('click', () => {
        const v = document.getElementById('admin-token-input')?.value || '';
        setAdminToken(v.trim());
    });
    const clearTokenBtn = document.getElementById('admin-token-clear');
    if (clearTokenBtn) clearTokenBtn.addEventListener('click', () => setAdminToken(''));

    // 发送验证码到邮箱
    const sendTokenBtn = document.getElementById('btn-send-token');
    if (sendTokenBtn) sendTokenBtn.addEventListener('click', async () => {
        sendTokenBtn.disabled = true;
        const origHTML = sendTokenBtn.innerHTML;
        sendTokenBtn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5" style="animation:spin 1s linear infinite"></i> 发送中...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        try {
            const res = await fetch(`${API_BASE}/auth/send-token`, { method: 'POST' });
            let data;
            try {
                data = await res.json();
            } catch {
                showToast('服务器返回异常，请检查后端是否在线', 'error');
                sendTokenBtn.disabled = false;
                sendTokenBtn.innerHTML = origHTML;
                return;
            }
            if (res.ok) {
                showToast(data.message || '验证码已发送', 'success');
            } else {
                showToast(data.error || '发送失败', 'error');
            }
        } catch (e) {
            showToast('请求失败: ' + e.message, 'error');
        }
        sendTokenBtn.disabled = false;
        sendTokenBtn.innerHTML = origHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    // 翻译描述按钮
    const translateBtn = document.getElementById('btn-translate-desc');
    if (translateBtn) translateBtn.addEventListener('click', () => BookmarksManager.translateDesc(translateBtn));

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

    // ═══════ 分类管理按钮 ═══════
    const btnAddCat = document.getElementById('btn-add-category');
    const btnEditCat = document.getElementById('btn-edit-category');
    const btnDelCat = document.getElementById('btn-delete-category');
    const promptDiv = document.getElementById('category-edit-prompt');
    const modeTopBtn = document.getElementById('edit-mode-top');
    const modeSubBtn = document.getElementById('edit-mode-sub');
    const keyInput = document.getElementById('category-edit-key');
    const nameInput = document.getElementById('category-edit-name');
    const confirmBtn = document.getElementById('btn-confirm-edit-cat');
    const cancelBtn = document.getElementById('btn-cancel-edit-cat');
    const editHint = document.getElementById('category-edit-hint');

    let editMode = 'add'; // 'add' | 'rename'
    let editTarget = 'top'; // 'top' | 'sub'

    const getEditContext = () => {
        const catVal = document.getElementById('bm-category').value;
        const subVal = document.getElementById('bm-subcategory').value;
        const catName = BookmarksManager.categories[catVal]?.name || catVal;
        const subName = subVal ? (BookmarksManager.categories[catVal]?.children?.find(c => c.id === subVal)?.name || subVal) : '';
        return { catVal, subVal, catName, subName };
    };

    const updateModeUI = () => {
        if (editTarget === 'sub') {
            modeTopBtn.style.background = 'transparent';
            modeTopBtn.style.color = '#94a3b8';
            modeSubBtn.style.background = 'rgba(20,184,166,.15)';
            modeSubBtn.style.color = '#2dd4bf';
        } else {
            modeTopBtn.style.background = 'rgba(20,184,166,.15)';
            modeTopBtn.style.color = '#2dd4bf';
            modeSubBtn.style.background = 'transparent';
            modeSubBtn.style.color = '#94a3b8';
        }
    };

    const showPrompt = (mode) => {
        editMode = mode;
        const ctx = getEditContext();

        // 控制模式切换按钮是否可见
        if (mode === 'add') {
            confirmBtn.textContent = '添加';
            modeSubBtn.style.display = ctx.catVal ? '' : 'none';
            editTarget = ctx.catVal ? 'sub' : 'top';
            keyInput.disabled = false;
            keyInput.placeholder = '英文ID';
            keyInput.value = '';
            nameInput.value = '';
        } else {
            confirmBtn.textContent = '保存';
            modeSubBtn.style.display = ctx.subVal ? '' : 'none';
            editTarget = ctx.subVal ? 'sub' : 'top';
            // 预填当前值（可编辑）
            keyInput.disabled = false;
            keyInput.placeholder = '英文ID';
            if (editTarget === 'sub') {
                keyInput.value = ctx.subVal;
                nameInput.value = ctx.subName;
            } else if (ctx.catVal) {
                keyInput.value = ctx.catVal;
                nameInput.value = ctx.catName;
            } else {
                keyInput.value = '';
                nameInput.value = '';
            }
        }

        updateModeUI();
        updateHint();
        promptDiv.classList.remove('hidden');
        keyInput.focus();
    };

    const hidePrompt = () => {
        promptDiv.classList.add('hidden');
        keyInput.value = '';
        nameInput.value = '';
        keyInput.disabled = false;
    };

    const updateHint = () => {
        const ctx = getEditContext();
        if (editMode === 'rename') {
            editHint.textContent = editTarget === 'sub'
                ? `重命名子分类「${ctx.subName}」`
                : (ctx.catVal ? `重命名分类「${ctx.catName}」` : '请先选择要重命名的分类');
        } else {
            editHint.textContent = editTarget === 'sub'
                ? `添加子分类到「${ctx.catName}」`
                : '添加为一级分类';
        }
    };

    if (modeTopBtn) modeTopBtn.addEventListener('click', () => { editTarget = 'top'; updateModeUI(); updateHint(); keyInput.disabled = false; keyInput.placeholder = '英文ID'; keyInput.value = editMode === 'rename' ? getEditContext().catVal : ''; nameInput.value = editMode === 'rename' ? getEditContext().catName : ''; });
    if (modeSubBtn) modeSubBtn.addEventListener('click', () => { editTarget = 'sub'; updateModeUI(); updateHint(); keyInput.disabled = false; keyInput.placeholder = '英文ID'; keyInput.value = editMode === 'rename' ? getEditContext().subVal : ''; nameInput.value = editMode === 'rename' ? getEditContext().subName : ''; });

    // 新增按钮
    if (btnAddCat) btnAddCat.addEventListener('click', () => { keyInput.disabled = false; keyInput.placeholder = '英文ID'; nameInput.placeholder = '中文名'; showPrompt('add'); });

    // 重命名按钮
    if (btnEditCat) btnEditCat.addEventListener('click', () => {
        const ctx = getEditContext();
        if (!ctx.catVal) { showToast('请先在左侧下拉框中选择要重命名的分类', 'warning'); return; }
        nameInput.placeholder = '新名称';
        showPrompt('rename');
    });

    // 取消
    if (cancelBtn) cancelBtn.addEventListener('click', hidePrompt);

    // 确认
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const key = keyInput.value.trim();
            const name = nameInput.value.trim();
            if (!name) { showToast('请输入名称', 'warning'); return; }

            const ctx = getEditContext();
            confirmBtn.disabled = true;

            if (editMode === 'rename') {
                const oldKey = editTarget === 'sub' ? ctx.subVal : ctx.catVal;
                const newKeyVal = key !== oldKey ? key : null;
                await BookmarksManager.renameCategory(oldKey, name, editTarget === 'sub' ? ctx.subVal : null, newKeyVal);
            } else {
                if (!key) { showToast('请输入分类ID', 'warning'); confirmBtn.disabled = false; return; }
                if (!/^[a-z0-9_]+$/i.test(key)) { showToast('分类ID只能包含字母、数字和下划线', 'warning'); confirmBtn.disabled = false; return; }
                await BookmarksManager.addCategory(key, name, editTarget === 'sub' ? ctx.catVal : null);
            }

            confirmBtn.disabled = false;
            hidePrompt();
        });
    }

    // 删除按钮
    if (btnDelCat) {
        btnDelCat.addEventListener('click', () => {
            const ctx = getEditContext();
            if (!ctx.catVal) { showToast('请先在左侧下拉框中选择要删除的分类', 'warning'); return; }
            BookmarksManager.deleteCategory(ctx.catVal, ctx.subVal || null);
        });
    }

    // Enter key
    if (keyInput) keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmBtn?.click(); });
    if (nameInput) nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmBtn?.click(); });
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
