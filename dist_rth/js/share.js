/**
 * Share Module
 * Provides sharing functionality for articles
 * 
 * @module share
 */

/**
 * Generate share URL for different platforms
 * @param {'twitter'|'weibo'|'copy'} platform - Target platform
 * @param {{title: string, url: string, description?: string}} options - Share options
 * @returns {string} - Share URL or the original URL for copy
 */
function generateShareUrl(platform, options) {
    if (!options || !options.url) return '';
    
    const { title = '', url, description = '' } = options;
    const encodedTitle = encodeURIComponent(title);
    const encodedUrl = encodeURIComponent(url);
    const encodedDesc = encodeURIComponent(description);
    
    switch (platform) {
        case 'twitter':
            return `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
        
        case 'weibo':
            return `https://service.weibo.com/share/share.php?title=${encodedTitle}&url=${encodedUrl}`;
        
        case 'copy':
        default:
            return url;
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
async function copyToClipboard(text) {
    if (!text) return false;
    
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    } catch (e) {
        console.error('[Share] Copy failed:', e);
        return false;
    }
}

/**
 * Share using Web Share API if available
 * @param {{title: string, url: string, text?: string}} options - Share options
 * @returns {Promise<boolean>} - Success status
 */
async function nativeShare(options) {
    if (!navigator.share) return false;
    
    try {
        await navigator.share({
            title: options.title,
            text: options.text || options.description,
            url: options.url
        });
        return true;
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('[Share] Native share failed:', e);
        }
        return false;
    }
}

/**
 * Open share URL in new window
 * @param {string} url - Share URL
 * @param {string} name - Window name
 */
function openShareWindow(url, name = 'share') {
    const width = 600;
    const height = 400;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    window.open(
        url,
        name,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
}

/**
 * Generate share buttons HTML
 * @param {{title: string, url: string}} options - Share options
 * @returns {string} - HTML string
 */
function generateShareButtonsHTML(options) {
    return `
        <div class="flex items-center gap-2">
            <button onclick="shareToTwitter()" class="p-2 rounded-lg bg-[#1DA1F2] text-white hover:opacity-80 transition-opacity" title="分享到 Twitter">
                <i data-lucide="twitter" class="w-4 h-4"></i>
            </button>
            <button onclick="shareToWeibo()" class="p-2 rounded-lg bg-[#E6162D] text-white hover:opacity-80 transition-opacity" title="分享到微博">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443z"/>
                </svg>
            </button>
            <button onclick="copyShareLink()" class="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="复制链接">
                <i data-lucide="link" class="w-4 h-4"></i>
            </button>
        </div>
    `;
}

// Export for ES modules and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateShareUrl,
        copyToClipboard,
        nativeShare,
        openShareWindow,
        generateShareButtonsHTML
    };
}

// Global exports for browser
if (typeof window !== 'undefined') {
    window.generateShareUrl = generateShareUrl;
    window.copyToClipboard = copyToClipboard;
    window.nativeShare = nativeShare;
    window.openShareWindow = openShareWindow;
    window.generateShareButtonsHTML = generateShareButtonsHTML;
}
