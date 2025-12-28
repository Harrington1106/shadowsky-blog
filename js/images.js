/**
 * Images Module
 * Provides lazy loading and lightbox functionality
 * 
 * @module images
 */

/**
 * Initialize lazy loading for images
 * Uses native loading="lazy" with IntersectionObserver fallback
 */
function initLazyLoading() {
    if (typeof window === 'undefined') return;
    
    // Add loading="lazy" to images that don't have it
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
        img.setAttribute('loading', 'lazy');
    });
    
    // For browsers without native lazy loading support
    if (!('loading' in HTMLImageElement.prototype)) {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px'
        });
        
        lazyImages.forEach(img => observer.observe(img));
    }
}

/**
 * Lightbox state
 */
let lightboxState = {
    isOpen: false,
    currentIndex: 0,
    images: []
};

/**
 * Create lightbox HTML structure
 * @returns {HTMLElement}
 */
function createLightboxElement() {
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.className = 'fixed inset-0 z-[9999] bg-black/95 hidden items-center justify-center';
    lightbox.innerHTML = `
        <button id="lightbox-close" class="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10" aria-label="关闭">
            <i data-lucide="x" class="w-8 h-8"></i>
        </button>
        <button id="lightbox-prev" class="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-colors z-10" aria-label="上一张">
            <i data-lucide="chevron-left" class="w-8 h-8"></i>
        </button>
        <button id="lightbox-next" class="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-colors z-10" aria-label="下一张">
            <i data-lucide="chevron-right" class="w-8 h-8"></i>
        </button>
        <div id="lightbox-content" class="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <img id="lightbox-image" class="max-w-full max-h-[90vh] object-contain" src="" alt="">
        </div>
        <div id="lightbox-info" class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            <span id="lightbox-counter"></span>
        </div>
    `;
    return lightbox;
}

/**
 * Open lightbox with specific image
 * @param {number} index - Image index
 */
function openLightbox(index) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || lightboxState.images.length === 0) return;
    
    lightboxState.isOpen = true;
    lightboxState.currentIndex = Math.max(0, Math.min(index, lightboxState.images.length - 1));
    
    updateLightboxImage();
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

/**
 * Close lightbox
 */
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    
    lightboxState.isOpen = false;
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
    document.body.style.overflow = '';
}

/**
 * Navigate to next image
 */
function nextImage() {
    if (lightboxState.currentIndex < lightboxState.images.length - 1) {
        lightboxState.currentIndex++;
        updateLightboxImage();
    }
}

/**
 * Navigate to previous image
 */
function prevImage() {
    if (lightboxState.currentIndex > 0) {
        lightboxState.currentIndex--;
        updateLightboxImage();
    }
}

/**
 * Update lightbox image display
 */
function updateLightboxImage() {
    const img = document.getElementById('lightbox-image');
    const counter = document.getElementById('lightbox-counter');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    
    if (!img) return;
    
    const currentImage = lightboxState.images[lightboxState.currentIndex];
    img.src = currentImage.src;
    img.alt = currentImage.alt || '';
    
    if (counter) {
        counter.textContent = `${lightboxState.currentIndex + 1} / ${lightboxState.images.length}`;
    }
    
    // Update navigation visibility
    if (prevBtn) {
        prevBtn.style.visibility = lightboxState.currentIndex > 0 ? 'visible' : 'hidden';
    }
    if (nextBtn) {
        nextBtn.style.visibility = lightboxState.currentIndex < lightboxState.images.length - 1 ? 'visible' : 'hidden';
    }
}

/**
 * Initialize lightbox functionality
 * @param {string} selector - CSS selector for images to include
 */
function initLightbox(selector = '.lightbox-image, .gallery img, .moments-grid img') {
    if (typeof window === 'undefined') return;
    
    // Create lightbox element if not exists
    if (!document.getElementById('lightbox')) {
        document.body.appendChild(createLightboxElement());
        
        // Initialize Lucide icons in lightbox
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
    
    // Collect images
    const images = document.querySelectorAll(selector);
    lightboxState.images = Array.from(images).map(img => ({
        src: img.dataset.fullSrc || img.src,
        alt: img.alt,
        title: img.title
    }));
    
    // Add click handlers
    images.forEach((img, index) => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => openLightbox(index));
    });
    
    // Add event listeners
    document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
    document.getElementById('lightbox-prev')?.addEventListener('click', prevImage);
    document.getElementById('lightbox-next')?.addEventListener('click', nextImage);
    document.getElementById('lightbox')?.addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') closeLightbox();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightboxState.isOpen) return;
        
        switch (e.key) {
            case 'Escape': closeLightbox(); break;
            case 'ArrowLeft': prevImage(); break;
            case 'ArrowRight': nextImage(); break;
        }
    });
}

/**
 * Check if an image has lazy loading attribute
 * @param {HTMLImageElement} img - Image element
 * @returns {boolean}
 */
function hasLazyLoading(img) {
    return img.getAttribute('loading') === 'lazy';
}

// Export for ES modules and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initLazyLoading,
        initLightbox,
        openLightbox,
        closeLightbox,
        nextImage,
        prevImage,
        hasLazyLoading,
        createLightboxElement
    };
}

// Global exports for browser
if (typeof window !== 'undefined') {
    window.initLazyLoading = initLazyLoading;
    window.initLightbox = initLightbox;
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
    window.nextImage = nextImage;
    window.prevImage = prevImage;
}
