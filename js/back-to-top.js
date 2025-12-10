(function() {
    // 1. Inject CSS for Animation
    const css = `
    #back-to-top {
        overflow: visible; /* Allow flame to be seen outside */
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    #back-to-top.launching {
        animation: launch 0.8s ease-in-out forwards;
        pointer-events: none;
    }
    
    @keyframes launch {
        0% { transform: translateY(0) scale(1); }
        20% { transform: translateY(20px) scale(0.8); }
        50% { transform: translateY(-50px) scale(1.2); opacity: 1; }
        100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
    }
    
    #back-to-top i {
        transition: transform 0.3s;
    }
    
    #back-to-top:hover i {
        transform: translateY(-3px);
    }
    
    /* Rocket flame effect */
    #back-to-top::after {
        content: '';
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        width: 14px;
        height: 0;
        background: linear-gradient(to bottom, #ff5e00, #ffae00, transparent);
        border-radius: 50%;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: -1;
        filter: blur(2px);
    }
    
    #back-to-top.launching::after {
        opacity: 1;
        height: 50px;
        transition: height 0.3s, opacity 0.3s;
    }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // 2. Initialize Logic
    function initBackToTop() {
        const backToTopBtn = document.getElementById('back-to-top');
        if (!backToTopBtn) return;

        // Change icon to rocket if Lucide is available
        const icon = backToTopBtn.querySelector('i');
        if (icon && window.lucide) {
             icon.setAttribute('data-lucide', 'rocket');
             window.lucide.createIcons();
        }

        // Scroll Logic
        const scrollThreshold = 300;
        
        // Helper to check scroll position
        function checkScroll(scrollTop) {
            if (backToTopBtn.classList.contains('launching')) return;

            if (scrollTop > scrollThreshold) {
                backToTopBtn.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
                backToTopBtn.classList.add('opacity-100', 'translate-y-0');
            } else {
                backToTopBtn.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
                backToTopBtn.classList.remove('opacity-100', 'translate-y-0');
            }
        }

        // Determine scroll source
        const articleContent = document.getElementById('article-content');
        const articleList = document.getElementById('article-list');

        function onScroll() {
            let scrollTop = window.scrollY || document.documentElement.scrollTop;
            
            // Override for RSS containers if they are active
            if (articleContent && articleContent.offsetParent) {
                scrollTop = articleContent.scrollTop;
            } else if (articleList && articleList.offsetParent) {
                scrollTop = articleList.scrollTop;
            }
            
            checkScroll(scrollTop);
        }

        // Attach listeners
        window.addEventListener('scroll', onScroll);
        if (articleContent) articleContent.addEventListener('scroll', onScroll);
        if (articleList) articleList.addEventListener('scroll', onScroll);
        
        // Lenis support
        if (window.lenis) {
            window.lenis.on('scroll', (e) => {
                 if (!articleContent && !articleList) {
                     checkScroll(e.scroll);
                 }
            });
        }

        // Click Handler
        const scrollToTop = () => {
            const duration = 1500;
            if (window.lenis) {
                window.lenis.scrollTo(0, { duration: 1.2 });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (articleContent && articleContent.offsetParent) {
                articleContent.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (articleList && articleList.offsetParent) {
                articleList.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        backToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            backToTopBtn.classList.add('launching');
            
            // Delay scroll slightly to show launch start
            setTimeout(scrollToTop, 300);

            // Reset
            setTimeout(() => {
                backToTopBtn.classList.remove('launching');
                backToTopBtn.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
                backToTopBtn.classList.remove('opacity-100', 'translate-y-0');
            }, 1000);
        });

        // Handle Context Menu Back to Top (if exists)
        const ctxBackToTopBtn = document.getElementById('ctx-back-to-top');
        if (ctxBackToTopBtn) {
            ctxBackToTopBtn.addEventListener('click', scrollToTop);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackToTop);
    } else {
        initBackToTop();
    }
})();
