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
    
    // Add event listener for desktop theme toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', window.toggleTheme);
    }

    // 3. Visit Counter
    updateVisitCount();

    // 4. Mobile Menu Handling
    initMobileMenu();
});

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
 * Initialize Theme based on localStorage or system preference
 */
function initTheme() {
    // Check localStorage or system preference
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    updateThemeIcons();
}

/**
 * Toggle Dark/Light Theme
 * Exposed globally for onclick handlers
 */
window.toggleTheme = function() {
    const isDark = document.documentElement.classList.toggle('dark');
    
    // Save preference
    if (isDark) {
        localStorage.theme = 'dark';
    } else {
        localStorage.theme = 'light';
    }

    // Update UI
    updateThemeIcons();
    
    // Dispatch event for other components (particles, charts, etc.)
    window.dispatchEvent(new CustomEvent('themeChange', { 
        detail: { isDark } 
    }));
    
    // Re-render icons if needed
    if (window.lucide) {
        window.lucide.createIcons();
    }
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
        // Force show --- after 3 seconds if not loaded
        const timeoutId = setTimeout(() => {
             if (countElement.innerText === 'Loading...') {
                 countElement.innerText = 'VISITS: ---';
                 countElement.classList.remove('opacity-0');
             }
        }, 3000);

        window.api.fetchVisitCount(pageId)
            .then(data => {
                clearTimeout(timeoutId);
                countElement.innerText = `VISITS: ${data.count}`;
                countElement.classList.remove('opacity-0');
                if (data.total) {
                    countElement.title = `Total Site Visits: ${data.total}`;
                }
            })
            .catch(err => {
                clearTimeout(timeoutId);
                console.error('[Main] Visit count failed:', err);
                countElement.innerText = 'VISITS: ---';
                countElement.classList.remove('opacity-0');
            });
    } else {
        console.error('[Main] api.js not loaded, cannot fetch visit count');
        countElement.innerText = 'VISITS: ---';
        countElement.classList.remove('opacity-0');
    }
}
