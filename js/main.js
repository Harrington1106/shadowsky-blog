/**
 * main.js - Core UI Logic for ShadowSky
 * Handles theme switching, icons, visit counting, and global interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 2. Theme Handling
    initTheme();
    // 按钮 click 由 navbar.js 统一绑定，避免双重监听互相抵消

    // 3. Visit Counter
    updateVisitCount();

    // 4. Mobile Menu Handling
    initMobileMenu();
});

const VISIT_COUNT_LOADING_TEXT = '加载中…';
const VISIT_COUNT_EMPTY_TEXT = '访问 --';

/**
 * Keep visit counter copy consistent across all public pages.
 * Rendering is based on the shared DOM hook instead of placeholder English text.
 */
function setVisitCountText(element, text, title = '') {
    if (!element) return;
    element.innerText = text;
    element.classList.remove('opacity-0');
    if (title) {
        element.title = title;
    } else {
        element.removeAttribute('title');
    }
}

/**
 * Initialize Mobile Menu Toggle
 */
function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    
    if (btn && menu) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isClosed = menu.classList.contains('opacity-0');
            
            if (isClosed) {
                // Open
                menu.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
                menu.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
            } else {
                // Close
                menu.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
                menu.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !btn.contains(e.target)) {
                menu.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
                menu.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
            }
        });
    }
}

/**
 * Initialize Theme based on system preference
 */
function initTheme() {
    applyTheme(resolveTheme());

    if (window.matchMedia) {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (!getStoredTheme()) {
                applyTheme(resolveTheme());
            }
        };
        if (media.addEventListener) {
            media.addEventListener('change', handler);
        } else if (media.addListener) {
            media.addListener(handler);
        }
    }
}

function getStoredTheme() {
    try {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark' || theme === 'light') return theme;
    } catch (e) {}
    return null;
}

function resolveTheme() {
    const stored = getStoredTheme();
    if (stored) return stored;
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemDark ? 'dark' : 'light';
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    updateThemeIcons();

    window.dispatchEvent(new CustomEvent('themeChange', {
        detail: { isDark }
    }));
    window.dispatchEvent(new CustomEvent('themechange')); // 通知流体引擎 (navbar.js 原职责)

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Toggle Dark/Light Theme
 * Exposed globally for onclick handlers
 */
window.toggleTheme = function() {
    const isDark = document.documentElement.classList.contains('dark');
    const nextTheme = isDark ? 'light' : 'dark';
    try {
        localStorage.setItem('theme', nextTheme);
    } catch (e) {}
    applyTheme(nextTheme);
};

/**
 * Update Theme Toggle Icons (Sun/Moon)
 */
function updateThemeIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    const desktopIcon = document.querySelector('#theme-toggle-icon');
    
    if (desktopIcon) {
        // Check if it's already an SVG (Lucide replaced it)
        if (desktopIcon.tagName.toLowerCase() === 'svg') {
            const newIconName = isDark ? 'sun' : 'moon';
            
            // Re-create the <i> tag to let Lucide re-render
            const newI = document.createElement('i');
            newI.setAttribute('id', 'theme-toggle-icon');
            newI.setAttribute('data-lucide', newIconName);
            newI.className = desktopIcon.getAttribute('class');
            
            // Update class for text color
            if (isDark) {
                newI.classList.remove('text-gray-600');
                newI.classList.add('text-gray-300');
            } else {
                newI.classList.add('text-gray-600');
                newI.classList.remove('text-gray-300');
            }
            
            desktopIcon.replaceWith(newI);
            if (window.lucide) window.lucide.createIcons();
        } else {
             // First run (still an <i> tag)
             const iconName = isDark ? 'sun' : 'moon';
             desktopIcon.setAttribute('data-lucide', iconName);
        }
    }
}

/**
 * Visit Counter Logic
 * Fetches and displays the visit count using api.js
 */
function updateVisitCount() {
    const countElement = document.getElementById('visit-count');
    if (!countElement) return;
    
    // Determine page ID (home for root)
    let pageId = 'home';
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    if (path !== '/' && path !== '/index.html' && filename) {
        // Simple sanitization for page ID
        // Remove .html extension
        pageId = filename.replace(/\.html$/, '');
        if (pageId === 'index') pageId = 'home';
    }
    
    // Use api.js if available
    if (window.api && window.api.fetchVisitCount) {
        setVisitCountText(countElement, VISIT_COUNT_LOADING_TEXT);

        // Force show --- after 3 seconds if not loaded
        const timeoutId = setTimeout(() => {
             if (countElement.innerText === VISIT_COUNT_LOADING_TEXT) {
                 setVisitCountText(countElement, VISIT_COUNT_EMPTY_TEXT);
             }
        }, 3000);

        window.api.fetchVisitCount(pageId)
            .then(data => {
                clearTimeout(timeoutId);
                const title = data.total ? `全站访问：${data.total}` : '';
                setVisitCountText(countElement, String(data.count || 0), title);
            })
            .catch(err => {
                clearTimeout(timeoutId);
                console.error('[Main] Visit count failed:', err);
                setVisitCountText(countElement, VISIT_COUNT_EMPTY_TEXT);
            });
    } else {
        console.error('[Main] api.js not loaded, cannot fetch visit count');
        setVisitCountText(countElement, VISIT_COUNT_EMPTY_TEXT);
    }
}
