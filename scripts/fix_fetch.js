// Polyfill global.fetch with node-fetch to fix connectivity issues with Retinbox CLI in Node 22+
global.fetch = async (url, options) => {
    // console.log(`[FixFetch] Fetching: ${url}`); // Debug log
    try {
        const { default: fetch } = await import('node-fetch');
        return await fetch(url, options);
    } catch (error) {
        console.error(`[FixFetch] Error fetching ${url}:`, error);
        throw error;
    }
};
