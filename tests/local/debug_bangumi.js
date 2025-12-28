const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function getToken() {
    try {
        const res = await axios.get(`${BASE_URL}/debug/token`);
        return res.data.token;
    } catch (e) {
        console.log('Token auto-discovery failed:', e.message);
        return 'shadowsky_secret_key_2025'; // Fallback
    }
}

async function testBangumiSync() {
    const TOKEN = await getToken();
    console.log('Using Token:', TOKEN);

    try {
        console.log('Testing /api/sync_bangumi...');
        const res = await axios.get(`${BASE_URL}/sync_bangumi`, {
            headers: { 'x-admin-token': TOKEN }
        });
        console.log('Success:', res.data);
    } catch (e) {
        console.log('Error Status:', e.response?.status);
        console.log('Error Data:', JSON.stringify(e.response?.data, null, 2));
    }
}

testBangumiSync();