const axios = require('axios');

const TOKEN = 'shadowsky_secret_key_2025';
const BASE_URL = 'http://localhost:3000/api';

async function testSync() {
    try {
        console.log('Testing Sync Bangumi...');
        const res = await axios.get(`${BASE_URL}/sync_bangumi`, {
            headers: { 'x-admin-token': TOKEN }
        });
        
        console.log('Sync Response Status:', res.status);
        console.log('Sync Result:', JSON.stringify(res.data, null, 2));
        
        if (res.data.success) {
            console.log('✅ Sync Successful');
        } else {
            console.log('❌ Sync Failed');
        }
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.error('Response Data:', e.response.data);
        }
    }
}

testSync();
