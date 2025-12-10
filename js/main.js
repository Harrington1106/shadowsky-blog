// --- Visit Counter ---
async function updateVisitCount() {
    // Determine current page ID
    const path = window.location.pathname;
    let pageId = path.split('/').pop() || 'index';
    if (pageId.endsWith('.html')) pageId = pageId.replace('.html', '');
    
    // Check if we can run cloud functions (not file protocol)
    if (window.location.protocol === 'file:') return;

    try {
        const response = await fetch(`api/visit.node.js?page=${pageId}`);
        const contentType = response.headers.get('content-type');
        
        if (response.ok && contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`Page visits: ${data.count}`);
            
            // Try to find a footer element to display the count
            const footer = document.querySelector('footer p') || document.querySelector('div.absolute.bottom-4 p');
            if (footer) {
                // Check if we already added the count
                let countSpan = document.getElementById('visit-count');
                if (!countSpan) {
                    countSpan = document.createElement('span');
                    countSpan.id = 'visit-count';
                    countSpan.className = 'ml-4 text-xs opacity-70';
                    footer.appendChild(countSpan);
                }
                countSpan.innerHTML = `Views: ${data.count}`;
            }
        } else {
            // Silently fail if not JSON (e.g. static file server returning the JS source)
            console.debug('Visit count API not available (static mode)');
        }
    } catch (e) {
        console.warn('Failed to update visit count', e);
    }
}

// Call on load
window.addEventListener('load', updateVisitCount);

// --- Theme Management ---
function initTheme() {
    try {
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        updateThemeUI();
    } catch (e) {
        console.error('Theme Init Error:', e);
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
    
    // Dispatch event for other components (like canvas particles)
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark: !isDark } }));
    
    updateThemeUI();
    updateNavbar();
}

function updateThemeUI() {
    const isDark = document.documentElement.classList.contains('dark');
    const toggleIcon = document.getElementById('theme-toggle-icon');
    
    // Update Desktop Icon
    if (toggleIcon) {
        toggleIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        
        // Remove old color classes
        toggleIcon.classList.remove('text-gray-600', 'text-gray-300', 'text-yellow-400', 'text-blue-500');
        
        // Add new color classes based on theme
        if (isDark) {
            // In dark mode, show Sun icon (Yellow)
            toggleIcon.classList.add('text-yellow-400');
        } else {
            // In light mode, show Moon icon (Blue/Dark Gray)
            toggleIcon.classList.add('text-blue-600');
        }
    }
    
    // Re-initialize icons to pick up changes
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Add Event Listener for Desktop Theme Toggle
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
}

// Initialize theme immediately
initTheme();


// --- Lucide Icons ---
if (window.lucide) {
    lucide.createIcons();
} else {
    console.warn('Lucide icons library not loaded! Check network connection or CDN.');
}


// --- Navbar Logic ---
const navbar = document.getElementById('navbar');
const navTitle = document.getElementById('nav-title');
const navLinks = document.querySelectorAll('.nav-link');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

let isMenuOpen = false;
// Check if we should force the navbar to be in "scrolled" mode (e.g. for light pages)
const forceScrolled = document.body.hasAttribute('data-force-scrolled-nav');

function updateNavbar() {
    if (!navbar) return;
    
    const isScrolled = window.scrollY > 10;
    const isDark = document.documentElement.classList.contains('dark');
    
    navbar.className = 'fixed w-full z-50 top-0 transition-all duration-300';
    
    if (isDark) {
        // Dark Mode Style
        if (isScrolled || isMenuOpen || forceScrolled) {
            navbar.classList.add('bg-black/50', 'backdrop-blur-md', 'border-b', 'border-white/10');
        } else {
            navbar.classList.add('bg-transparent');
        }
        
        // Text Colors
        if (navTitle) {
            navTitle.classList.remove('text-gray-900');
            navTitle.classList.add('text-white');
        }
        
        navLinks.forEach(link => {
            // Skip active items (don't override their specific colors)
            if (link.classList.contains('active-nav-item') || link.classList.contains('bg-blue-50/80') || link.classList.contains('dark:bg-blue-900/30')) {
                return;
            }

            link.classList.remove('text-gray-600', 'hover:text-blue-600', 'hover:bg-gray-50');
            link.classList.add('text-gray-300', 'hover:text-white', 'hover:bg-white/10');
        });
        
        if (mobileMenuBtn) {
            mobileMenuBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
            mobileMenuBtn.classList.add('text-white', 'hover:bg-white/10');
        }
        
    } else {
        // Light Mode Style
        if (isScrolled || isMenuOpen || forceScrolled) {
            navbar.classList.add('bg-white/80', 'backdrop-blur-lg', 'shadow-sm', 'border-b', 'border-gray-200/50');
            
            if (navTitle) {
                navTitle.classList.remove('lg:text-white');
                navTitle.classList.add('text-gray-900');
            }
            
            navLinks.forEach(link => {
                if (link.classList.contains('active-nav-item') || link.classList.contains('bg-blue-50/80')) {
                    return;
                }
                link.classList.remove('text-white/90', 'hover:text-white', 'hover:bg-white/10');
                link.classList.add('text-gray-600', 'hover:text-blue-600', 'hover:bg-gray-50');
            });
            
            if (mobileMenuBtn) {
                mobileMenuBtn.classList.remove('text-white', 'hover:bg-white/10');
                mobileMenuBtn.classList.add('text-gray-600', 'hover:bg-gray-100');
            }
            
        } else {
            // Transparent (Top of page, not forced)
            navbar.classList.add('bg-transparent');
            
            if (navTitle) {
                // If the body has data-light-hero-text="dark" or similar, use that. 
                // Default for light mode transparent nav should probably be dark text if background is white.
                // But previously it was lg:text-white. Let's check if we should change it.
                // For a white background site, it must be dark text.
                navTitle.classList.add('text-gray-900'); 
                navTitle.classList.remove('text-white', 'lg:text-white');
            }
            
            navLinks.forEach(link => {
                 if (link.classList.contains('active-nav-item') || link.classList.contains('bg-blue-50/80')) {
                     return;
                 }
                 link.classList.add('text-gray-600', 'hover:text-blue-600', 'hover:bg-gray-50');
                 link.classList.remove('text-white/90', 'hover:text-white', 'hover:bg-white/10');
            });
            
            if (mobileMenuBtn) {
                mobileMenuBtn.classList.add('text-gray-600', 'hover:bg-gray-100');
                mobileMenuBtn.classList.remove('text-white', 'hover:bg-white/10');
            }
        }
    }
}

window.addEventListener('scroll', updateNavbar);

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
            mobileMenu.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
            mobileMenu.classList.add('opacity-100', 'translate-y-0');
        } else {
            mobileMenu.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
            mobileMenu.classList.remove('opacity-100', 'translate-y-0');
        }
        updateNavbar();
    });
}

// Initial check
updateNavbar();


// --- Global Visual Enhancements ---

// 1. Inject Styles
const style = document.createElement('style');
style.textContent = `
    /* Custom Scrollbar */
    ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }
    ::-webkit-scrollbar-track {
        background: transparent;
    }
    .dark ::-webkit-scrollbar-track {
        background: #0f172a;
    }
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
        border-radius: 5px;
        border: 2px solid transparent;
        background-clip: content-box;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(to bottom, #2563eb, #7c3aed);
        border: 2px solid transparent;
        background-clip: content-box;
    }

    /* Selection Color */
    ::selection {
        background: #f472b6;
        color: white;
    }

    /* Custom Cursor */
    @media (pointer: fine) {
        body {
            cursor: none;
        }
        .cursor-dot,
        .cursor-outline {
            position: fixed;
            top: 0;
            left: 0;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            z-index: 9999;
            pointer-events: none;
        }
        .cursor-dot {
            width: 8px;
            height: 8px;
            background-color: #3b82f6;
        }
        .cursor-outline {
            width: 40px;
            height: 40px;
            border: 2px solid rgba(59, 130, 246, 0.5);
            transition: width 0.2s, height 0.2s, background-color 0.2s;
        }
        /* Hide default cursor on interactive elements to let custom cursor take over fully or just coexist */
        a, button, input, textarea, .cursor-pointer {
            cursor: none;
        }
    }
`;
document.head.appendChild(style);

// 2. Cursor Logic
if (window.matchMedia("(pointer: fine)").matches) {
    // Check if cursor already exists to prevent duplicates
    if (!document.querySelector('.cursor-dot')) {
        const cursorDot = document.createElement('div');
        cursorDot.className = 'cursor-dot';
        const cursorOutline = document.createElement('div');
        cursorOutline.className = 'cursor-outline';
        
        // Initially hidden
        cursorDot.style.opacity = '0';
        cursorOutline.style.opacity = '0';
        
        document.body.appendChild(cursorDot);
        document.body.appendChild(cursorOutline);

        let isVisible = false;

        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;

            if (!isVisible) {
                cursorDot.style.opacity = '1';
                cursorOutline.style.opacity = '1';
                isVisible = true;
            }

            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;

            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        });

        // Use event delegation for better performance and dynamic elements
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('a, button, input, textarea, .cursor-pointer')) {
                cursorOutline.style.width = '60px';
                cursorOutline.style.height = '60px';
                cursorOutline.style.backgroundColor = 'rgba(56, 189, 248, 0.1)';
                cursorDot.style.transform = 'translate(-50%, -50%) scale(1.5)';
            }
        });
        
        document.addEventListener('mouseout', (e) => {
             if (e.target.closest('a, button, input, textarea, .cursor-pointer')) {
                cursorOutline.style.width = '40px';
                cursorOutline.style.height = '40px';
                cursorOutline.style.backgroundColor = 'transparent';
                cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
             }
        });
    }
}

// Handle bfcache restore
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        updateThemeUI();
        updateNavbar();
        
        // Re-initialize lucide icons if needed
        if (window.lucide) window.lucide.createIcons();
    }
});

// 3. Dynamic Title
const originalTitle = document.title;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.title = '(°o°；) 别走呀！ | 夏日科技探索';
    } else {
        document.title = '(*´∇｀*) 欢迎回来！ | 夏日科技探索';
        setTimeout(() => {
            document.title = originalTitle;
        }, 2000);
    }
});
