
import axios from 'axios';
import https from 'https';
import { createRequire } from 'module';
import { Buffer } from 'buffer';

// === Polyfill for Retinbox CLI using Axios ===
const require = createRequire(import.meta.url);
const FormData = require('form-data');

// Configure Axios global defaults for resilience
axios.defaults.timeout = 300000; // 5 minutes (Increased from 2 mins)
axios.defaults.maxBodyLength = Infinity;
axios.defaults.maxContentLength = Infinity;

// Polyfill Globals
global.FormData = FormData;
// global.Blob will be defined below

// === Safe Blob/File Implementation (Buffer-based) ===
// This ensures form-data treats them as Buffers, avoiding 'source.on' errors

class SafeBlob extends Buffer {
    constructor(blobParts, options) {
        // Handle no-args case or invalid args gracefully
        const parts = Array.isArray(blobParts) ? blobParts : [];
        
        const buffers = parts.map(part => {
            if (typeof part === 'string') return Buffer.from(part);
            if (Buffer.isBuffer(part)) return part;
            if (part instanceof Buffer) return part; // Should be covered by isBuffer
            // Handle other Blobs recursively if needed, or toString
            return Buffer.from(String(part));
        });

        const buf = Buffer.concat(buffers);
        
        // Patch prototype to pass instanceof checks
        Object.setPrototypeOf(buf, new.target.prototype);
        
        // Blob properties
        buf.size = buf.length;
        buf.type = options?.type || '';
        
        return buf;
    }

    // Mock Blob methods
    async text() { return this.toString(); }
    async arrayBuffer() { return this; }
    slice(start, end, type) {
        const sliced = super.slice(start, end);
        sliced.type = type || this.type;
        return sliced; // Note: this returns a Buffer (Uint8Array), might lose SafeBlob proto if not careful. 
        // But for form-data, it just needs to be a Buffer.
    }
}
global.Blob = SafeBlob;

class SafeFile extends SafeBlob {
    constructor(fileBits, fileName, options) {
        super(fileBits, options);
        this.name = fileName;
        this.lastModified = options?.lastModified || Date.now();
    }
}
global.File = SafeFile;

// Mock Response class for strict instanceof checks (if any)
class Response {
    constructor(body, init) {
        this.ok = init.status >= 200 && init.status < 300;
        this.status = init.status;
        this.statusText = init.statusText;
        this._body = body;
        this.headers = new Map(Object.entries(init.headers || {}));
    }
    async json() { return JSON.parse(this._body.toString()); }
    async text() { return this._body.toString(); }
}
global.Response = Response;

// Implement fetch using Axios
// This bypasses node-fetch's stream handling issues with form-data
global.fetch = async function(url, options = {}) {
    const method = options.method || 'GET';
    const headers = { ...(options.headers || {}) };
    let data = options.body;

    // Handle FormData headers
    if (data && data instanceof FormData) {
        // form-data package requires getHeaders() to be merged
        const formHeaders = data.getHeaders();
        Object.assign(headers, formHeaders);
    }

    console.log(`[Wrapper] Fetching: ${method} ${url}`);

    try {
        const response = await axios({
            url,
            method,
            headers,
            data,
            // signal: options.signal, // BLOCKED: Ignoring CLI abort signal to force persistence
            validateStatus: () => true, // Resolve all status codes
            responseType: 'arraybuffer', // Handle binary/text uniformly
            httpsAgent: new https.Agent({ 
                rejectUnauthorized: false, 
                keepAlive: false, // Disabled keep-alive to prevent socket hangups
                family: 4 // Force IPv4
            })
        });

        // Convert Axios headers to a simple object for the mock Response
        // Axios headers are already an object (AxiosHeaders), but let's be safe
        const resHeaders = response.headers;

        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.statusText,
            headers: {
                get: (name) => resHeaders[name.toLowerCase()] || resHeaders[name]
            },
            json: async () => {
                const text = response.data.toString('utf8');
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('[Wrapper] JSON Parse Error:', text.substring(0, 100));
                    throw e;
                }
            },
            text: async () => response.data.toString('utf8'),
            arrayBuffer: async () => response.data
        };
    } catch (err) {
        // If it's an Axios error that wasn't caught by validateStatus (e.g. timeout, network error)
        console.error(`[Wrapper] Fetch Error: ${err.message}`);
        throw new TypeError('Network request failed'); // Standard fetch error
    }
};

console.log('[Wrapper] Network stack replaced: using Axios for robust connectivity.');

// Load the actual CLI
try {
    require('./rth_cli_temp.cjs');
} catch (e) {
    console.error('[Wrapper] Failed to load CLI bundle:', e);
    process.exit(1);
}
