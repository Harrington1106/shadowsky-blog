/**
 * Reading Progress Module
 * Saves and restores reading positions, displays progress bar
 * 
 * @module reading-progress
 */

const STORAGE_KEY = 'reading_positions';
const MAX_POSITIONS = 50; // Maximum number of positions to store

/**
 * Calculate current scroll percentage
 * @returns {number} - Scroll percentage (0-100)
 */
function calculateScrollPercent() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return 0;
    }
    
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    if (scrollHeight <= 0) return 0;
    
    const percent = (scrollTop / scrollHeight) * 100;
    return Math.min(100, Math.max(0, Math.round(percent * 100) / 100));
}

/**
 * Get all stored reading positions
 * @returns {Object} - Map of articleId to position data
 */
function getAllPositions() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('[ReadingProgress] Error reading positions:', e);
        return {};
    }
}

/**
 * Save reading position for an article
 * @param {string} articleId - Unique article identifier
 * @param {number} scrollPercent - Scroll percentage (0-100)
 */
function saveReadingPosition(articleId, scrollPercent) {
    if (!articleId || typeof articleId !== 'string') return;
    
    const validPercent = Math.min(100, Math.max(0, Number(scrollPercent) || 0));
    
    try {
        const positions = getAllPositions();
        
        positions[articleId] = {
            articleId,
            scrollPercent: validPercent,
            timestamp: Date.now()
        };
        
        // Limit stored positions
        const entries = Object.entries(positions);
        if (entries.length > MAX_POSITIONS) {
            entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            const trimmed = Object.fromEntries(entries.slice(0, MAX_POSITIONS));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
        }
    } catch (e) {
        console.error('[ReadingProgress] Error saving position:', e);
    }
}

/**
 * Get reading position for an article
 * @param {string} articleId - Unique article identifier
 * @returns {{articleId: string, scrollPercent: number, timestamp: number}|null}
 */
function getReadingPosition(articleId) {
    if (!articleId || typeof articleId !== 'string') return null;
    
    try {
        const positions = getAllPositions();
        return positions[articleId] || null;
    } catch (e) {
        console.error('[ReadingProgress] Error getting position:', e);
        return null;
    }
}

/**
 * Clear reading position for an article
 * @param {string} articleId - Unique article identifier
 */
function clearReadingPosition(articleId) {
    if (!articleId) return;
    
    try {
        const positions = getAllPositions();
        delete positions[articleId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch (e) {
        console.error('[ReadingProgress] Error clearing position:', e);
    }
}

/**
 * Scroll to a specific percentage of the page
 * @param {number} percent - Target scroll percentage (0-100)
 */
function scrollToPercent(percent) {
    if (typeof window === 'undefined') return;
    
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const targetScroll = (percent / 100) * scrollHeight;
    
    window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
    });
}

/**
 * Initialize reading progress bar
 * @param {string} progressBarId - ID of the progress bar element
 */
function initProgressBar(progressBarId = 'reading-progress-bar') {
    if (typeof window === 'undefined') return;
    
    const progressBar = document.getElementById(progressBarId);
    if (!progressBar) return;
    
    const updateProgress = () => {
        const percent = calculateScrollPercent();
        progressBar.style.width = `${percent}%`;
    };
    
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
}

/**
 * Initialize auto-save for reading position
 * @param {string} articleId - Article identifier
 * @param {number} saveInterval - Save interval in milliseconds
 */
function initAutoSave(articleId, saveInterval = 5000) {
    if (typeof window === 'undefined' || !articleId) return;
    
    let lastSavedPercent = 0;
    
    const save = () => {
        const percent = calculateScrollPercent();
        if (Math.abs(percent - lastSavedPercent) > 5) { // Only save if moved more than 5%
            saveReadingPosition(articleId, percent);
            lastSavedPercent = percent;
        }
    };
    
    // Save on scroll (debounced)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(save, 1000);
    }, { passive: true });
    
    // Save periodically
    setInterval(save, saveInterval);
    
    // Save before leaving
    window.addEventListener('beforeunload', save);
}

// Export for ES modules and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateScrollPercent,
        saveReadingPosition,
        getReadingPosition,
        clearReadingPosition,
        scrollToPercent,
        initProgressBar,
        initAutoSave,
        getAllPositions,
        STORAGE_KEY
    };
}

// Global exports for browser
if (typeof window !== 'undefined') {
    window.calculateScrollPercent = calculateScrollPercent;
    window.saveReadingPosition = saveReadingPosition;
    window.getReadingPosition = getReadingPosition;
    window.clearReadingPosition = clearReadingPosition;
    window.scrollToPercent = scrollToPercent;
    window.initProgressBar = initProgressBar;
    window.initAutoSave = initAutoSave;
}
