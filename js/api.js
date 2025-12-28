/**
 * Unified API Client Module
 * Provides consistent API interaction with error handling and retry logic
 * 
 * @module api
 */

// API Configuration
// Use Aliyun Backend directly to avoid Retinbox WAF issues
const API_BASE = 'http://47.118.28.27'; // TODO: Update to https://api.shadowquake.top if available

const API_CONFIG = {
    // Dynamic Base URL Strategy
    baseUrl: (function() {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const port = window.location.port;
            
            // Production: Use relative path to avoid Mixed Content (HTTPS -> HTTP)
            if (hostname === 'shadowquake.top' || hostname === 'www.shadowquake.top') {
                return '/api';
            }
            
            // Local development: always use Node API for localhost regardless of port
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return '/api';
            }
            // If running on Live Server (5500) or other, default to relative path
            // to support same-origin proxying or file structure
        }
        return `${API_BASE}/api`;
    })(),
    timeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000
};

// Error Codes
const ERROR_CODES = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DB_ERROR: 'DB_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    PARSE_ERROR: 'PARSE_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Validate API response format
 * @param {any} response - Response to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validateApiResponse(response) {
    if (response === null || response === undefined) {
        return { valid: false, error: 'Response is null or undefined' };
    }
    
    if (typeof response !== 'object') {
        return { valid: false, error: 'Response is not an object' };
    }
    
    if (typeof response.success !== 'boolean') {
        return { valid: false, error: 'Response missing boolean success field' };
    }
    
    if (response.success) {
        // Success response should have data field (can be null/undefined for empty responses)
        return { valid: true };
    } else {
        // Error response should have error object
        if (!response.error || typeof response.error !== 'object') {
            return { valid: false, error: 'Error response missing error object' };
        }
        if (typeof response.error.code !== 'string') {
            return { valid: false, error: 'Error response missing error code' };
        }
        if (typeof response.error.message !== 'string') {
            return { valid: false, error: 'Error response missing error message' };
        }
        return { valid: true };
    }
}

/**
 * Create a standardized success response
 * @param {any} data - Response data
 * @returns {ApiResponse}
 */
function createSuccessResponse(data) {
    return {
        success: true,
        data: data
    };
}

/**
 * Create a standardized error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @returns {ApiResponse}
 */
function createErrorResponse(code, message) {
    return {
        success: false,
        error: {
            code: code,
            message: message
        }
    };
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse response text to JSON with error handling
 * @param {string} text - Response text
 * @returns {{success: boolean, data?: any, error?: string}}
 */
function parseResponseText(text) {
    if (!text || text.trim() === '') {
        return { success: false, error: 'Empty response' };
    }
    // Detect PHP source code first to satisfy strict tests
    if (text.includes('<?php') || text.includes('<?=')) {
        return { success: false, error: 'PHP source code returned - server not processing PHP' };
    }
    // Check for HTML response (Cloudflare challenge, 404 page, or proxy error)
    if (text.trim().startsWith('<')) {
        return { success: false, error: 'Received HTML instead of JSON (Cloudflare challenge or Server Error)' };
    }
    
    try {
        const data = JSON.parse(text);
        return { success: true, data };
    } catch (e) {
        // Check for common error patterns
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            return { success: false, error: 'HTML error page returned instead of JSON' };
        }
        return { success: false, error: `JSON parse error: ${e.message}` };
    }
}

/**
 * API Client class for making HTTP requests
 */
class ApiClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || API_CONFIG.baseUrl;
        this.timeout = config.timeout || API_CONFIG.timeout;
        this.retryAttempts = config.retryAttempts ?? API_CONFIG.retryAttempts;
        this.retryDelay = config.retryDelay || API_CONFIG.retryDelay;
    }
    
    /**
     * Make a GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise<ApiResponse>}
     */
    async get(endpoint, params = {}) {
        const url = this._buildUrl(endpoint, params);
        return this._request('GET', url);
    }
    
    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise<ApiResponse>}
     */
    async post(endpoint, data = {}) {
        const url = this._buildUrl(endpoint);
        return this._request('POST', url, data);
    }
    
    /**
     * Build full URL with query parameters
     * @private
     */
    _buildUrl(endpoint, params = {}) {
        // Handle absolute endpoints
        if (endpoint.startsWith('http')) {
            const url = new URL(endpoint);
            this._appendParams(url, params);
            return url.toString();
        }

        // Handle absolute baseUrl
        if (this.baseUrl.startsWith('http')) {
            // Ensure trailing slash for baseUrl and no leading slash for endpoint
            const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
            const relativeEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
            const url = new URL(relativeEndpoint, baseUrl);
            this._appendParams(url, params);
            return url.toString();
        }

        // Handle relative baseUrl (Fallback, though we default to absolute now)
        let path = this.baseUrl;
        if (!path.endsWith('/') && !endpoint.startsWith('/')) {
            path += '/';
        } else if (path.endsWith('/') && endpoint.startsWith('/')) {
            path = path.slice(0, -1);
        }
        path += endpoint;
        
        // Resolve against current location
        const url = new URL(path, document.baseURI);
        
        this._appendParams(url, params);
        
        return url.toString();
    }

    _appendParams(url, params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        });
    }
    
    /**
     * Make HTTP request with retry logic
     * @private
     */
    async _request(method, url, data = null) {
        let lastError = null;
        
        for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
            try {
                if (attempt > 0) {
                    if (console && console.debug) console.debug(`[ApiClient] Retry attempt ${attempt} for ${url}`);
                    await sleep(this.retryDelay * attempt);
                }
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const options = {
                    method,
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                };
                
                if (data && method !== 'GET') {
                    options.headers['Content-Type'] = 'application/json';
                    options.body = JSON.stringify(data);
                }
                
                const response = await fetch(url, options);
                clearTimeout(timeoutId);
                
                const responseText = await response.text();
                const parseResult = parseResponseText(responseText);
                
                if (!parseResult.success) {
                    if (console && console.debug) console.debug(`[ApiClient] Parse error from ${url}: ${parseResult.error}`);
                    return createErrorResponse(ERROR_CODES.PARSE_ERROR, parseResult.error);
                }
                
                // Validate response format
                const validation = validateApiResponse(parseResult.data);
                if (!validation.valid) {
                    // If response doesn't match our format, wrap it
                    if (response.ok) {
                        return createSuccessResponse(parseResult.data);
                    } else {
                        return createErrorResponse(
                            ERROR_CODES.UNKNOWN_ERROR,
                            `HTTP ${response.status}: ${response.statusText}`
                        );
                    }
                }
                
                return parseResult.data;
                
            } catch (error) {
                lastError = error;
                
                if (error.name === 'AbortError') {
                    if (console && console.debug) console.debug(`[ApiClient] Request timeout: ${url}`);
                    if (attempt === this.retryAttempts) {
                        return createErrorResponse(ERROR_CODES.TIMEOUT_ERROR, 'Request timed out');
                    }
                } else if (!navigator.onLine) {
                    return createErrorResponse(ERROR_CODES.NETWORK_ERROR, 'No internet connection');
                } else {
                    if (console && console.debug) console.debug(`[ApiClient] Request error:`, error);
                    // Check if URL is absolute and matches our API domain
                    const isProdApi = typeof url === 'string' && (url.startsWith('https://shadowquake.top') || url.startsWith('/api'));
                    
                    if (isProdApi && error.message && (
                        error.message.includes('CERT') || 
                        error.message.includes('certificate') || 
                        error.message.includes('SSL')
                    )) {
                        if (console && console.warn) console.warn('[API] SSL/Certificate error detected:', error);
                        return createErrorResponse(ERROR_CODES.NETWORK_ERROR, 'TLS certificate invalid or untrusted');
                    }
                    if (attempt === this.retryAttempts) {
                        return createErrorResponse(ERROR_CODES.NETWORK_ERROR, error.message);
                    }
                }
            }
        }
        
        return createErrorResponse(ERROR_CODES.UNKNOWN_ERROR, lastError?.message || 'Unknown error');
    }
}

// Default API client instance
const apiClient = new ApiClient();

/**
 * Fetch visit count for a specific page
 * @param {string} pageId - Page identifier (e.g., 'home', 'posts/hello-world')
 * @returns {Promise<{count: number, total: number}>}
 */
async function fetchVisitCount(pageId) {
    try {
        // Try primary endpoint (visit.php)
        const response = await apiClient.get('visit.php', { page: pageId });
        if (response.success) {
            // Handle potentially different response structures
            const data = response.data || {};
            return {
                count: data.count || 0,
                total: data.total_visits || data.total || 0
            };
        }
        
        // Fallback to stats.php if visit.php fails logic-wise
        if (console && console.debug) console.debug('[API] visit.php failed, trying stats.php fallback');
        return await fetchVisitCountFallback(pageId);
    } catch (e) {
        if (console && console.debug) console.debug('[API] Fetch visit count error:', e);
        // Fallback on network error
        return await fetchVisitCountFallback(pageId);
    }
}

/**
 * Fallback to stats.php
 * @private
 */
async function fetchVisitCountFallback(pageId) {
    try {
        const response = await apiClient.get('stats.php');
        if (response.success) {
            const data = response.data || {};
            // Support both data.pages and data.stats.pages structures
            const pages = data.pages || (data.stats && data.stats.pages) || {};
            const total = data.total_visits || data.total || (data.stats && data.stats.total) || 0;
            
            return {
                count: pages[pageId] || 0,
                total: total
            };
        }
    } catch (e) {
        console.error('[API] Fallback stats failed:', e);
    }
    return { count: 0, total: 0 };
}

/**
 * Fetch all site stats (batch)
 * @returns {Promise<{pages: Object, total: number}>}
 */
async function fetchSiteStats() {
    try {
        // Add timestamp to prevent caching
        const response = await apiClient.get('stats.php', { _: Date.now() });
        if (response.success) {
            const data = response.data || {};
            // Support both data.pages and data.stats.pages structures
            // Old stats.php likely returns { stats: { pages: {...}, total: ... } }
            // Which ApiClient wraps as { success: true, data: { stats: ... } }
            const pages = data.pages || (data.stats && data.stats.pages) || {};
            const total = data.total_visits || data.total || (data.stats && data.stats.total) || 0;

            return {
                pages: pages,
                total: total
            };
        }
    } catch (e) {
        console.error('[API] Fetch site stats error:', e);
    }
    return { pages: {}, total: 0 };
}

// Export for ES modules and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ApiClient,
        apiClient,
        fetchVisitCount,
        fetchSiteStats,
        validateApiResponse,
        createSuccessResponse,
        createErrorResponse,
        parseResponseText,
        ERROR_CODES,
    };
}

// ALWAYS expose to window for browser (User Scheme A)
if (typeof window !== 'undefined') {
    window.api = {
        ApiClient,
        apiClient,
        fetchVisitCount,
        fetchSiteStats,
        validateApiResponse,
        createSuccessResponse,
        createErrorResponse,
        parseResponseText,
        ERROR_CODES,
    };
}

