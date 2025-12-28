/**
 * Video Module
 * Provides watch history tracking functionality
 * 
 * @module video
 */

const WATCH_HISTORY_KEY = 'watch_history';
const MAX_HISTORY_ITEMS = 100;

/**
 * Get all watch history
 * @returns {Array<{videoId: string, watchedAt: number, progress?: number}>}
 */
function getWatchHistory() {
    try {
        const stored = localStorage.getItem(WATCH_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('[Video] Error reading watch history:', e);
        return [];
    }
}

/**
 * Record a video watch
 * @param {string} videoId - Video identifier
 * @param {number} [progress] - Watch progress (0-100)
 */
function recordWatch(videoId, progress) {
    if (!videoId || typeof videoId !== 'string') return;
    
    try {
        let history = getWatchHistory();
        
        // Remove existing entry for this video
        history = history.filter(h => h.videoId !== videoId);
        
        // Add new entry at the beginning
        history.unshift({
            videoId,
            watchedAt: Date.now(),
            progress: typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : undefined
        });
        
        // Limit history size
        if (history.length > MAX_HISTORY_ITEMS) {
            history = history.slice(0, MAX_HISTORY_ITEMS);
        }
        
        localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('[Video] Error recording watch:', e);
    }
}

/**
 * Check if a video has been watched
 * @param {string} videoId - Video identifier
 * @returns {boolean}
 */
function isWatched(videoId) {
    if (!videoId) return false;
    
    const history = getWatchHistory();
    return history.some(h => h.videoId === videoId);
}

/**
 * Get watch entry for a specific video
 * @param {string} videoId - Video identifier
 * @returns {{videoId: string, watchedAt: number, progress?: number}|null}
 */
function getWatchEntry(videoId) {
    if (!videoId) return null;
    
    const history = getWatchHistory();
    return history.find(h => h.videoId === videoId) || null;
}

/**
 * Clear watch history
 */
function clearWatchHistory() {
    try {
        localStorage.removeItem(WATCH_HISTORY_KEY);
    } catch (e) {
        console.error('[Video] Error clearing watch history:', e);
    }
}

/**
 * Remove a specific video from history
 * @param {string} videoId - Video identifier
 */
function removeFromHistory(videoId) {
    if (!videoId) return;
    
    try {
        let history = getWatchHistory();
        history = history.filter(h => h.videoId !== videoId);
        localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('[Video] Error removing from history:', e);
    }
}

/**
 * Update watch progress for a video
 * @param {string} videoId - Video identifier
 * @param {number} progress - Watch progress (0-100)
 */
function updateWatchProgress(videoId, progress) {
    if (!videoId || typeof progress !== 'number') return;
    
    try {
        const history = getWatchHistory();
        const entry = history.find(h => h.videoId === videoId);
        
        if (entry) {
            entry.progress = Math.min(100, Math.max(0, progress));
            entry.watchedAt = Date.now();
            localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
        } else {
            recordWatch(videoId, progress);
        }
    } catch (e) {
        console.error('[Video] Error updating progress:', e);
    }
}

/**
 * Mark watched videos in the DOM
 * @param {string} selector - CSS selector for video cards
 * @param {string} dataAttribute - Data attribute containing video ID
 */
function markWatchedVideos(selector = '.video-card', dataAttribute = 'data-video-id') {
    if (typeof document === 'undefined') return;
    
    const cards = document.querySelectorAll(selector);
    const history = getWatchHistory();
    const watchedIds = new Set(history.map(h => h.videoId));
    
    cards.forEach(card => {
        const videoId = card.getAttribute(dataAttribute);
        if (videoId && watchedIds.has(videoId)) {
            card.classList.add('watched');
            
            // Add watched indicator if not exists
            if (!card.querySelector('.watched-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'watched-indicator absolute top-2 right-2 px-2 py-1 bg-green-500/80 text-white text-xs rounded';
                indicator.textContent = '已看';
                card.style.position = 'relative';
                card.appendChild(indicator);
            }
        }
    });
}

// Export for ES modules and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getWatchHistory,
        recordWatch,
        isWatched,
        getWatchEntry,
        clearWatchHistory,
        removeFromHistory,
        updateWatchProgress,
        markWatchedVideos,
        WATCH_HISTORY_KEY,
        MAX_HISTORY_ITEMS
    };
}

// Global exports for browser
if (typeof window !== 'undefined') {
    window.getWatchHistory = getWatchHistory;
    window.recordWatch = recordWatch;
    window.isWatched = isWatched;
    window.getWatchEntry = getWatchEntry;
    window.clearWatchHistory = clearWatchHistory;
    window.removeFromHistory = removeFromHistory;
    window.updateWatchProgress = updateWatchProgress;
    window.markWatchedVideos = markWatchedVideos;
}
