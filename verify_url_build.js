
const API_CONFIG = {
    baseUrl: 'https://api.shadowquake.top/api'
};

// Mock document.baseURI
const document = {
    baseURI: 'https://shadowquake.top/'
};

class ApiClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || API_CONFIG.baseUrl;
    }
    
    _buildUrl(endpoint, params = {}) {
        // Handle absolute endpoints
        if (endpoint.startsWith('http')) {
            const url = new URL(endpoint);
            this._appendParams(url, params);
            return url.toString();
        }

        // Handle absolute baseUrl
        if (this.baseUrl.startsWith('http')) {
            // Combine baseUrl and endpoint carefully
            const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
            const relativeEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
            const url = new URL(baseUrl + relativeEndpoint);
            this._appendParams(url, params);
            return url.toString();
        }

        // Handle relative baseUrl
        const path = `${this.baseUrl}/${endpoint}`.replace(/\/+/g, '/');
        
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
}

const client = new ApiClient();
const url1 = client._buildUrl('visit.php', { page: 'home' });
console.log('Test 1 (Absolute Base):', url1);

const client2 = new ApiClient({ baseUrl: '/api' });
const url2 = client2._buildUrl('visit.php', { page: 'home' });
console.log('Test 2 (Relative Base):', url2);

if (url1 === 'https://api.shadowquake.top/api/visit.php?page=home' && 
    url2 === 'https://shadowquake.top/api/visit.php?page=home') {
    console.log('VERIFICATION PASSED');
} else {
    console.log('VERIFICATION FAILED');
}
